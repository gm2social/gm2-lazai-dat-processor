import { LazAICronFetchAttestatorProcessor } from '@modules/lazai/processors/lazai-cron-fetch-attestator.processor'
import { LazAIFetchAttestatorProcessor } from '@modules/lazai/processors/lazai-fetch-attestator.processor'
import { LazAIMintDATProcessor } from '@modules/lazai/processors/lazai-mint-dat.processor'
import Container from 'typedi'

// Register all job processors
export const registerJobProcessors = async () => {
  // lazai fetch attestator processor
  const lazAIFetchAttestatorProcessor = Container.get(LazAIFetchAttestatorProcessor)
  lazAIFetchAttestatorProcessor.spawn()

  // lazai mint dat processor
  const lazAIMintDATProcessor = Container.get(LazAIMintDATProcessor)
  lazAIMintDATProcessor.out([lazAIFetchAttestatorProcessor.queue]).spawn()

  // lazai cron fetch attestator processor
  const lazAICronFetchAttestatorProcessor = await Container.get(
    LazAICronFetchAttestatorProcessor,
  ).cron({
    every: 300_000, // 5 minutes
  })
  lazAICronFetchAttestatorProcessor.out([lazAIFetchAttestatorProcessor.queue]).spawn()

  return [lazAIMintDATProcessor, lazAIFetchAttestatorProcessor, lazAICronFetchAttestatorProcessor]
}
