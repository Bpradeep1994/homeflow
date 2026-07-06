import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from './user.entity';

export enum VerificationStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * Professional profile — one per provider user. Auth/identity stays on `users`;
 * everything about the vocation lives here.
 */
@Entity()
export class ProviderProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string; // ProviderID

  @OneToOne(() => User, { eager: true })
  @JoinColumn()
  user: User; // UserID

  @Column({ default: 0 })
  experienceYears: number;

  /** Category names served, e.g. ["AC Repair", "Electrician"]. */
  @Column({ type: 'simple-json', default: '[]' })
  services: string[];

  @Column({ nullable: true })
  city?: string;

  /** Localities within the city, e.g. ["Madhapur", "Kondapur"]. */
  @Column({ type: 'simple-json', default: '[]' })
  serviceAreas: string[];

  @Column({ type: 'text', default: VerificationStatus.NONE })
  verificationStatus: VerificationStatus;

  @Column({ nullable: true })
  idDocumentUrl?: string;

  @Column({ nullable: true })
  photoUrl?: string;

  /** Trade certificate upload URLs. */
  @Column({ type: 'simple-json', default: '[]' })
  certificates: string[];

  /** Daily working window, e.g. 08:00–20:00. */
  @Column({ default: '08:00' })
  workingStart: string;

  @Column({ default: '20:00' })
  workingEnd: string;

  /** ISO dates the provider is unavailable, e.g. ["2026-07-10"]. */
  @Column({ type: 'simple-json', default: '[]' })
  holidays: string[];

  @Column({ type: 'float', default: 0 })
  rating: number;

  @Column({ default: 0 })
  jobsDone: number;

  @Column({ default: false })
  online: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
