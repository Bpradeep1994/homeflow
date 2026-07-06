import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Booking } from '../entities/booking.entity';
import { Payment } from '../entities/payment.entity';
import { ProviderProfile } from '../entities/provider-profile.entity';
import { Review } from '../entities/review.entity';
import { User } from '../entities/user.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, ProviderProfile, Booking, Payment, Review])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
