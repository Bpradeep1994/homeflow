import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Booking } from './booking.entity';

export type PaymentMethod = 'UPI' | 'CARD' | 'CASH';

@Entity()
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Booking, { eager: true })
  @JoinColumn()
  booking: Booking;

  @Column({ type: 'text' })
  method: PaymentMethod;

  @Column()
  amount: number;

  /** Platform commission (20% of amount). */
  @Column()
  commission: number;

  /** Provider payout (amount - commission). */
  @Column()
  payout: number;

  @Column({ type: 'text', default: 'PAID' })
  status: 'PAID' | 'REFUNDED';

  /** ISO timestamp set when the payout batch is settled to the provider's bank. */
  @Column({ type: 'text', nullable: true })
  settledAt?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
