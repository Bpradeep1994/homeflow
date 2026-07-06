import { CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { User } from './user.entity';

@Entity()
@Index(['customer', 'provider'], { unique: true })
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  customer: User;

  /** The provider's user record. */
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  provider: User;

  @CreateDateColumn()
  createdAt: Date;
}
