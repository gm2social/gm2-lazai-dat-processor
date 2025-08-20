import { AppBaseEntity } from '@app/app.entity'
import { Column, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('Project')
@Index('ux_Project__tokenAddress', ['tokenAddress'], { unique: true })
@Index('ix_Project__creatorAddress', ['creatorAddress'])
@Index('ix_Project__projectMetadataId', ['projectMetadataId'])
@Index('ix_Project__blockTimestamp', ['blockTimestamp'])
@Index('ix_Project__trendingScore', ['trendingScore'])
export class Project extends AppBaseEntity {
  @PrimaryGeneratedColumn()
  projectId: number

  @Column()
  creatorAddress: string

  @Column()
  tokenAddress: string

  @Column({ nullable: true })
  projectMetadataId: string

  @Column({ type: 'decimal', precision: 38, scale: 18, default: 0 })
  tvl: string

  @Column({ type: 'decimal', precision: 38, scale: 18, default: 0 })
  currentPrice: string

  @Column({ unsigned: true, default: 0 })
  totalTransactions: number

  @Column({ unsigned: true, default: 0 })
  totalHolders: number

  @Column({ type: 'decimal', precision: 38, scale: 18, default: 0 })
  totalMarketCap: string

  @Column({ type: 'decimal', precision: 38, scale: 18, default: 0 })
  totalVolume: string

  @Column({ type: 'float', default: 0 })
  volume24hChangedPercent: number

  @Column({ type: 'decimal', precision: 38, scale: 18, default: 0 })
  volume24h: string

  @Column({ type: 'float', default: 0 })
  marketCap24hChangedPercent: number

  @Column({ type: 'decimal', precision: 38, scale: 18, default: 0 })
  marketCap24h: string

  @Column({ type: 'float', default: 0 })
  price24hChangedPercent: number

  @Column({ type: 'tinyint', default: 0 })
  isRoot: number

  @Column({ type: 'tinyint', default: 0 })
  graduated: number

  @Column({ type: 'decimal', precision: 38, scale: 18, default: 0 })
  trendingScore: string

  @Column({ type: 'bigint', unsigned: true })
  blockNumber: string

  @Column({ unsigned: true })
  blockTimestamp: number

  @Column({ unsigned: true, default: 0 })
  lastMetricTimestamp: number

  @Column({ type: 'tinyint', default: 0 })
  isAIAttested: number

  @DeleteDateColumn()
  deletedAt: Date
}
