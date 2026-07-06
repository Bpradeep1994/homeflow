import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { SubService } from './catalog.entity';
import { User } from './user.entity';

export enum BookingStatus {
  PENDING = 'PENDING', // customer-facing: "Searching Provider"
  ASSIGNED = 'ASSIGNED',
  ON_THE_WAY = 'ON_THE_WAY',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED', // terminal: payment received AND review left
  CANCELLED = 'CANCELLED',
}

@Entity()
export class Booking {
  @PrimaryColumn()
  id: string; // e.g. HF-MCK3A9

  @ManyToOne(() => User, { eager: true })
  customer: User;

  @ManyToOne(() => User, { eager: true, nullable: true })
  provider?: User | null;

  @ManyToMany(() => SubService, { eager: true })
  @JoinTable()
  services: SubService[];

  @Column()
  address: string;

  @Column()
  date: string; // ISO date, e.g. 2026-07-06

  @Column()
  timeSlot: string; // e.g. "12:00 – 14:00"

  @Column({ type: 'text', default: BookingStatus.PENDING })
  status: BookingStatus;

  /** Estimated total in rupees (sum of service prices at booking time). */
  @Column()
  amount: number;

  @Column({ type: 'simple-json', default: '[]' })
  declinedBy: string[]; // provider ids who passed on this offer

  @Column({ type: 'simple-json', default: '[]' })
  history: { status: BookingStatus; at: string }[];

  @CreateDateColumn()
  createdAt: Date;
}
