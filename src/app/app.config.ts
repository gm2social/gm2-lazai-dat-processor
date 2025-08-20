import { Config } from '@blazjs/common'
import { IsString, ValidateNested } from 'class-validator'
import { Service } from 'typedi'
import { SqlDataSourceConfig } from './configs/db.config'
import { LazAIConfig } from './configs/lazai.config'
import { RedisConfig } from './configs/redis.config'

@Service()
export class AppConfig extends Config {
  @ValidateNested()
  masterDB: SqlDataSourceConfig

  @ValidateNested()
  slavesDB: SqlDataSourceConfig[]

  @ValidateNested()
  redis: RedisConfig

  @ValidateNested()
  lazAIConfig: LazAIConfig

  @IsString()
  ipfsJWT: string

  constructor() {
    super()
    const env = process.env
    this.masterDB = this.decodeObj(env.MASTER_DB)
    this.slavesDB = this.decodeObj(env.SLAVES_DB)
    this.redis = this.decodeObj(env.REDIS)
    this.lazAIConfig = this.decodeObj(env.LAZAI_CONFIG)
    this.ipfsJWT = env.IPFS_JWT || this.ipfsJWT
  }

  isStagingAppEnv() {
    return this.appEnv === 'staging'
  }
}
