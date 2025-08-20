import { AppConfig } from '@app/app.config'
import { logger } from '@app/app.logger'
import { Project } from '@modules/projects/entities/project.entity'
import { encrypt } from 'alith/data'
import { PinataIPFS } from 'alith/data/storage'
import { Client } from 'alith/lazai'
import axios from 'axios'
import NodeRSA from 'node-rsa'
import { Service } from 'typedi'
import { LazAIFetchAttestatorDataDTO } from './dtos/lazai-fetch-attestator-data.dto'
import { LazAIMintDataDTO } from './dtos/lazai-mint-data.dto'
import { LazAIMintDAT } from './entities/lazai-mint-dat.entity'
import { LazAIFetchAttestatorProcessor } from './processors/lazai-fetch-attestator.processor'

@Service()
export class LazAIService {
  private client: Client
  private ipfs: PinataIPFS

  constructor(
    private config: AppConfig,
    private fetchAttestatorProcessor: LazAIFetchAttestatorProcessor,
  ) {
    logger.info('LazAIService::constructor - Initializing LazAIService')
    this.client = new Client(undefined, undefined, config.lazAIConfig.privateKey)
    this.ipfs = new PinataIPFS()
  }

  async mintDAT(data: LazAIMintDataDTO) {
    const { tokenAddress, fileName, privacyData } = data
    const { encryptionSeed } = this.config.lazAIConfig

    const minted = await LazAIMintDAT.findOne({
      where: {
        tokenAddress,
      },
    })
    if (minted) {
      logger.warn('LazAIService::mintDAT - Token already minted DAT', { tokenAddress })
      return minted
    }

    // Encrypt the privacy data using the encryption seed
    const password = this.client.getWallet().sign(encryptionSeed).signature
    const encryptedData = await encrypt(Uint8Array.from(privacyData), password)

    logger.debug('LazAIService::mintDAT - Data encrypted successfully', { fileName })

    // Upload the encrypted data to IPFS
    const fileMeta = await this.ipfs.upload({
      name: fileName,
      data: Buffer.from(encryptedData),
      token: this.config.ipfsJWT,
    })
    const url = await this.ipfs.getShareLink({ token: this.config.ipfsJWT, id: fileMeta.id })

    // Upload file metadata to LazAI
    let fileId = await this.client.getFileIdByUrl(url)
    if (fileId === BigInt(0)) {
      fileId = await this.client.addFile(url)
    }

    logger.debug('LazAIService::mintDAT - File registered with LazAI', {
      fileId: fileId.toString(),
      url,
    })

    // Request proof in the verified computing node
    await this.client.requestProof(fileId, BigInt(100))
    const jobIds = await this.client.fileJobIds(fileId)
    if (jobIds.length === 0) {
      throw new Error('No job IDs found for the file. Minting failed.')
    }
    const jobId = jobIds[jobIds.length - 1]
    const job = await this.client.getJob(jobId)
    const nodeInfo = await this.client.getNode(job.nodeAddress)
    const nodeUrl = nodeInfo.url
    const pubKey = nodeInfo.publicKey
    const rsa = new NodeRSA(pubKey, 'pkcs1-public-pem')
    const encryptedKey = rsa.encrypt(password, 'hex')
    const proofRequest = {
      job_id: Number(jobId),
      file_id: Number(fileId),
      file_url: url,
      encryption_key: encryptedKey,
      encryption_seed: encryptionSeed,
      nonce: null,
      proof_url: null,
    }

    logger.debug('LazAIService::mintDAT - Proof request prepared', { proofRequest, nodeUrl })

    // Send proof request to the node, wait for job to complete
    const response = await axios.post(`${nodeUrl}/proof`, proofRequest, {
      headers: { 'Content-Type': 'application/json' },
    })

    if (response.status === 200) {
      logger.debug('LazAIService::mintDAT - Proof request successful', { response: response.data })

      // Request DAT reward
      const reward = await this.client.requestReward(fileId)
      logger.info('LazAIService::mintDAT - Reward requested for file', {
        fileId: fileId.toString(),
        transactionHash: reward.transactionHash.toString(),
      })

      if (reward) {
        // Save mint DAT data to db
        const mint = LazAIMintDAT.create()
        mint.tokenAddress = tokenAddress
        mint.fileId = fileId.toString()
        mint.jobId = jobId.toString()
        mint.transactionHash = reward.transactionHash?.toString()
        mint.blockNumber = Number(reward.receipt?.blockNumber?.toString())
        await mint.save()

        // Add job to fetch attestator
        await this.fetchAttestatorProcessor.queue.add(
          `lazai-fetch-attestator-${tokenAddress}`,
          <LazAIFetchAttestatorDataDTO>{
            blockNumber: mint.blockNumber,
            tokenAddress,
            fileId: mint.fileId,
          },
          {
            jobId: `lazai-fetch-attestator-${tokenAddress}`,
          },
        )

        // Mark project as AI-attested
        await Project.update({ tokenAddress }, { isAIAttested: 1 })

        return mint
      }
    }

    logger.error('LazAIService::mintDAT - Proof request failed', {
      status: response.status,
      data: response.data,
    })
  }
}
