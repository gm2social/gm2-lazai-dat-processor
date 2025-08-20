import { AppConfig } from '@app/app.config'
import { logger } from '@app/app.logger'
import { BulkJob, JobProcessor } from '@blazjs/queue'
import { Job } from 'bullmq'
import { ethers, Filter, JsonRpcProvider, Provider } from 'ethers'
import { Service } from 'typedi'
import { LazAIFetchAttestatorDataDTO } from '../dtos/lazai-fetch-attestator-data.dto'
import { LazAIMintDAT } from '../entities/lazai-mint-dat.entity'

@Service()
export class LazAIFetchAttestatorProcessor extends JobProcessor<LazAIFetchAttestatorDataDTO> {
  private provider: JsonRpcProvider

  constructor(private config: AppConfig) {
    super({
      connection: config.redis,
      queue: {
        name: 'lazai-fetch-attestator',
        options: {
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            removeOnComplete: 100,
            removeOnFail: 100,
          },
        },
      },
    })

    this.provider = new JsonRpcProvider(config.lazAIConfig.rpc)
  }

  async fetchJobCompletedLogs(
    provider: Provider,
    contractAddress: string,
    abi: string[],
    startBlock: number,
    endBlock: number,
    chunkSize = 50_000,
  ) {
    const iface = new ethers.Interface(abi)
    const topic = iface.getEvent('JobComplete')
    if (!topic) {
      logger.error('LazAIFetchAttestatorProcessor::fetchJobCompletedLogs - Topic not found in ABI')
      return []
    }

    let allLogs: ethers.Log[] = []

    for (let from = startBlock; from <= endBlock; from += chunkSize) {
      const to = Math.min(from + chunkSize - 1, endBlock)
      logger.debug(`Fetching logs from ${from} to ${to}…`)

      const filter: Filter = {
        address: contractAddress,
        fromBlock: from,
        toBlock: to,
        topics: [topic.topicHash],
      }

      const logs = await provider.getLogs(filter)
      allLogs.push(...logs)
    }

    return allLogs
  }

  protected async process(job: Job<LazAIFetchAttestatorDataDTO>): Promise<BulkJob[] | void> {
    const fromBlock = job.data?.blockNumber
    if (!fromBlock) {
      logger.error('LazAIFetchAttestatorProcessor::process - fromBlock is required')
      return
    }

    const logs = await this.fetchJobCompletedLogs(
      this.provider,
      this.config.lazAIConfig.contractAddress,
      [
        'event JobComplete(address indexed attestator, uint256 indexed jobId, uint256 indexed fileId)',
      ],
      fromBlock - 100, // Fetch logs from 100 blocks before the specified fromBlock
      fromBlock,
    )

    const iface = new ethers.Interface([
      'event JobComplete(address indexed attestator, uint256 indexed jobId, uint256 indexed fileId)',
    ])
    for (const log of logs) {
      const parsed = iface.parseLog(log)
      if (!parsed) continue
      const { attestator, jobId, fileId } = parsed.args
      logger.info(
        `LazAIFetchAttestatorProcessor::process - Attestator: ${attestator}, Job ID: ${jobId}, File ID: ${fileId}`,
      )
      if (fileId == job.data.fileId) {
        await LazAIMintDAT.update(
          { tokenAddress: job.data.tokenAddress, fileId },
          {
            attestator,
            attestatorHash: log.transactionHash,
            attestatorBlockNumber: log.blockNumber,
          },
        )
        break
      }
    }
  }
}
