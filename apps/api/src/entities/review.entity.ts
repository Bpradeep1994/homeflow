import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Booking } from './booking.entity';
import { User } from './user.entity';

@Entity()
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Booking)
  @JoinColumn()
  booking: Booking;

  @ManyToOne(() => User, { eager: true })
  customer: User;

  @ManyToOne(() => User)
  provider: User;

  @Column()
  rating: number; // 1–5

  @Column({ nullable: true })
  comment?: string;

  /** Uploaded photo URLs (from /uploads). */
  @Column({ type: 'simple-json', default: '[]' })
  photos: string[];

  @Column({ default: false })
  reported: boolean;

  @Column({ nullable: true })
  reportReason?: string;

  @CreateDateColumn()
  createdAt: Date;
}
