import { BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('LazAIMintDAT')
@Index('ux_LazAIMintDAT_tokenAddress', ['tokenAddress'], { unique: true })
export class LazAIMintDAT extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  tokenAddress: string

  @Column()
  fileId: string

  @Column()
  jobId: string

  @Column({ nullable: true })
  transactionHash: string

  @Column({ nullable: true })
  blockNumber: number

  @Column({ nullable: true })
  attestator: string

  @Column({ nullable: true })
  attestatorHash: string

  @Column({ nullable: true })
  attestatorBlockNumber: number
}
