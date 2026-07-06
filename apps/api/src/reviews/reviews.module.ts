import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BookingsModule } from '../bookings/bookings.module';
import { Booking } from '../entities/booking.entity';
import { ProviderProfile } from '../entities/provider-profile.entity';
import { Review } from '../entities/review.entity';
import { User } from '../entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Booking, User, ProviderProfile]), NotificationsModule, BookingsModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
