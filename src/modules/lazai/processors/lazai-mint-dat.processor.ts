import { AppConfig } from '@app/app.config'
import { BulkJob, JobProcessor } from '@blazjs/queue'
import { Job } from 'bullmq'
import { Service } from 'typedi'
import { LazAIMintDataDTO } from '../dtos/lazai-mint-data.dto'
import { LazAIService } from '../lazai.service'

@Service()
export class LazAIMintDATProcessor extends JobProcessor<LazAIMintDataDTO> {
  constructor(config: AppConfig, private lazAIService: LazAIService) {
    super({
      connection: config.redis,
      queue: {
        name: 'lazai-mint-dat',
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
  }

  protected async process(job: Job<LazAIMintDataDTO>): Promise<BulkJob[] | void> {
    await this.lazAIService.mintDAT(job.data)
  }
}
