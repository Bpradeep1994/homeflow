import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BookingsModule } from '../bookings/bookings.module';
import { Booking } from '../entities/booking.entity';
import { Payment } from '../entities/payment.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { InvoiceController, PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Booking]), NotificationsModule, BookingsModule],
  controllers: [PaymentsController, InvoiceController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
