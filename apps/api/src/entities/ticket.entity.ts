import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from './user.entity';

export type TicketPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TicketStatus = 'OPEN' | 'PENDING' | 'RESOLVED';

@Entity()
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  user: User;

  @Column()
  subject: string;

  @Column({ type: 'text' })
  message: string;

  /** Optional booking this complaint refers to. */
  @Column({ nullable: true })
  bookingId?: string;

  @Column({ type: 'text', default: 'MEDIUM' })
  priority: TicketPriority;

  @Column({ type: 'text', default: 'OPEN' })
  status: TicketStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
