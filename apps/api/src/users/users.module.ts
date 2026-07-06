import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ServiceCategory, SubService } from '../entities/catalog.entity';
import { ProviderProfile } from '../entities/provider-profile.entity';
import { User } from '../entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminController } from './admin.controller';
import { ProviderProfileController } from './provider-profile.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, ProviderProfile, ServiceCategory, SubService]), NotificationsModule],
  controllers: [ProviderProfileController, AdminController],
  providers: [UsersService],
})
export class UsersModule {}
