import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Ticket } from '../entities/ticket.entity';
import { User } from '../entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { SupportController } from './support.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, User]), NotificationsModule],
  controllers: [SupportController],
})
export class SupportModule {}
