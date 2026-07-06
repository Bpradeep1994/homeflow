import { Column, Entity, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';

@Entity()
export class ServiceCategory {
  @PrimaryColumn()
  id: string; // slug, e.g. "ac-repair"

  @Column()
  name: string;

  @Column()
  emoji: string;

  @OneToMany(() => SubService, (s) => s.category, { cascade: true, eager: true })
  services: SubService[];
}

@Entity()
export class SubService {
  @PrimaryColumn()
  id: string; // slug, e.g. "ac-service"

  @Column()
  name: string;

  /** Fixed price in rupees; the visit charge when quoteOnVisit is true. */
  @Column()
  price: number;

  /** Typical job length in minutes — drives slot planning later. */
  @Column({ default: 60 })
  durationMinutes: number;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: false })
  quoteOnVisit: boolean;

  @Column({ default: false })
  emergency: boolean;

  /** Admin kill-switch: inactive services are hidden and unbookable. */
  @Column({ default: true })
  active: boolean;

  @ManyToOne(() => ServiceCategory, (c) => c.services, { onDelete: 'CASCADE' })
  category: ServiceCategory;
}
