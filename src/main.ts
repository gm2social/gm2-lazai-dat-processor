import { AppConfig } from '@app/app.config'
import { AppDataSource } from '@app/app.datasource'
import { logger } from '@app/app.logger'
import { registerJobProcessors } from '@app/app.processor'
import { App } from '@blazjs/common'
import Container from 'typedi'

async function bootstrap() {
  // validate environment variables
  const config = Container.get(AppConfig)
  config.validate()

  // initialize database
  const datasource = Container.get(AppDataSource)
  await datasource.initialize()

  // reconnect to database if connection is lost
  await datasource.reconnect(5000)

  // register job processors
  await registerJobProcessors()

  const app = new App({
    logger,
  })
  await app.listen(config.port)
}

bootstrap()
