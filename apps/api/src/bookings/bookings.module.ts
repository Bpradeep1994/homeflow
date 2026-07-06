import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Booking } from '../entities/booking.entity';
import { SubService } from '../entities/catalog.entity';
import { Payment } from '../entities/payment.entity';
import { ProviderProfile } from '../entities/provider-profile.entity';
import { Review } from '../entities/review.entity';
import { User } from '../entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminBookingsController, BookingsController, ProviderController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, SubService, User, ProviderProfile, Payment, Review]),
    NotificationsModule,
  ],
  controllers: [BookingsController, ProviderController, AdminBookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
