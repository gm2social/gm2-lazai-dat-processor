import { IsNumber, IsOptional, IsString } from 'class-validator'

export class RedisConfig {
  @IsString()
  host: string

  @IsNumber()
  port: number

  @IsNumber()
  @IsOptional()
  db?: number

  @IsString()
  @IsOptional()
  username?: string

  @IsString()
  @IsOptional()
  password?: string
}
