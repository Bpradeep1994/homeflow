import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

export type CouponType = 'FLAT' | 'PERCENT';

@Entity()
export class Coupon {
  @PrimaryColumn()
  code: string; // e.g. WELCOME100

  @Column()
  title: string;

  @Column({ type: 'text' })
  type: CouponType;

  /** Rupees for FLAT, percentage for PERCENT. */
  @Column()
  value: number;

  @Column({ default: 1000 })
  maxUses: number;

  @Column({ default: 0 })
  used: number;

  /** ISO date after which the coupon is invalid. */
  @Column()
  expiresAt: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
