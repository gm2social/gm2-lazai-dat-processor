import { Expose } from 'class-transformer'
import { IsString, IsUrl } from 'class-validator'

export class LazAIConfig {
  @Expose()
  @IsUrl()
  rpc: string

  @Expose()
  @IsString()
  privateKey: string

  @Expose()
  @IsString()
  encryptionSeed: string

  @Expose()
  @IsString()
  contractAddress: string
}
