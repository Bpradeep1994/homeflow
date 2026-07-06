import { Exclude } from 'class-transformer';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type UserRole = 'customer' | 'provider' | 'admin';

export type UserStatus = 'ACTIVE' | 'BLOCKED';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phone: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ type: 'text', unique: true, nullable: true })
  email?: string | null;

  /** bcrypt hash; null for OTP-only accounts. Never serialized. */
  @Exclude()
  @Column({ type: 'text', nullable: true })
  passwordHash?: string | null;

  // 'text' keeps the column portable between PostgreSQL and the SQLite dev DB.
  @Column({ type: 'text', default: 'customer' })
  role: UserRole;

  @Column({ type: 'text', default: 'ACTIVE' })
  status: UserStatus;

  @CreateDateColumn()
  createdAt: Date;
}
