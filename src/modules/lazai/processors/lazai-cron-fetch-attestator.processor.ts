import { AppConfig } from '@app/app.config'
import { logger } from '@app/app.logger'
import { BulkJob, CronJobProcessor } from '@blazjs/queue'
import { Job } from 'bullmq'
import { Service } from 'typedi'
import { IsNull, Not } from 'typeorm'
import { LazAIMintDAT } from '../entities/lazai-mint-dat.entity'

@Service()
export class LazAICronFetchAttestatorProcessor extends CronJobProcessor {
  constructor(config: AppConfig) {
    super({
      connection: config.redis,
      queue: {
        name: 'lazai-cron-fetch-attestator',
        options: {
          defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: true,
          },
        },
      },
    })
  }

  protected async process(job: Job): Promise<BulkJob[] | void> {
    const missingAttestatorsDAT = await LazAIMintDAT.find({
      where: {
        attestatorHash: IsNull(),
        blockNumber: Not(IsNull()),
      },
    })

    logger.info(
      `LazAICronFetchAttestatorProcessor::process - Found ${missingAttestatorsDAT.length} missing attestators DATs to fetch`,
    )

    return missingAttestatorsDAT.map((dat) => {
      return {
        name: `lazai-fetch-attestator-${dat.tokenAddress}`,
        data: {
          blockNumber: dat.blockNumber,
          fileId: dat.fileId,
          tokenAddress: dat.tokenAddress,
        },
        opts: {
          jobId: `lazai-fetch-attestator-${dat.tokenAddress}`,
        },
      }
    })
  }
}
