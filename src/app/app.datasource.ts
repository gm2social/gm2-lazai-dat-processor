import { TypeOrmDataSource } from '@blazjs/datasource'
import { Service } from 'typedi'
import { AppConfig } from './app.config'
import { logger } from './app.logger'

@Service()
export class AppDataSource extends TypeOrmDataSource {
  private isReconnecting = false

  constructor(private config: AppConfig) {
    const { masterDB, slavesDB } = config
    const path = config.isProductionNodeEnv() ? 'dist/' : 'src/'
    super(
      {
        type: 'mysql',
        entities: [path + '**/*.entity.{ts,js}'],
        replication: {
          master: masterDB,
          slaves: slavesDB,
        },
        poolSize: 10,
        maxQueryExecutionTime: 1000,
        migrations: [path + 'migrations/*.{ts,js}'],
        migrationsTableName: 'Migration',
        migrationsRun: true,
        migrationsTransactionMode: 'all',
        cache: {
          type: 'ioredis',
          options: config.redis,
        },
      },
      logger,
    )
  }

  async isConnected() {
    try {
      if (!this.source.isInitialized) return false
      await this.source.query('SELECT 1')
      return true
    } catch (e) {
      return false
    }
  }

  /** Reconnect to database if connection is lost.  
   @param ms: milliseconds to wait before checking connection again
  */
  async reconnect(ms: number) {
    if (!this.config.isProductionNodeEnv()) return
    setInterval(async () => {
      const isConnected = await this.isConnected()
      if (!isConnected) {
        if (this.isReconnecting) return
        this.isReconnecting = true
        try {
          if (this.source.isInitialized) {
            await this.source.destroy()
            logger.info('Database connection closed')
          }
          logger.info('🔁 Reconnecting to database...')
          await this.source.initialize()
          logger.info('✅ Database reconnected.')
        } catch (e) {
          logger.error('❌ Failed to reconnect to database', e)
        } finally {
          this.isReconnecting = false
        }
      }
    }, ms)
  }

  isDuplicatedEntryError(error: any) {
    return error?.code === 'ER_DUP_ENTRY'
  }
}
