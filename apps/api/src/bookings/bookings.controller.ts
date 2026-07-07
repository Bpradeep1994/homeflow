import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import { requireRole } from '../auth/roles';
import { BookingStatus } from '../entities/booking.entity';
import { BookingsService } from './bookings.service';

class CreateBookingDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  serviceIds: string[];

  @IsString()
  @MinLength(6)
  address: string;

  @IsString()
  date: string;

  @IsString()
  timeSlot: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}

class RescheduleDto {
  @IsString()
  date: string;

  @IsString()
  timeSlot: string;
}

class UpdateStatusDto {
  @IsIn([BookingStatus.ON_THE_WAY, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED])
  status: BookingStatus;
}

@Controller('bookings')
@UseGuards(AuthGuard)
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateBookingDto) {
    requireRole(req, 'customer');
    return this.bookings.create(req.user.sub, dto.serviceIds, dto.address, dto.date, dto.timeSlot, dto.couponCode);
  }

  @Get()
  mine(@Req() req: AuthedRequest) {
    return this.bookings.forCustomer(req.user.sub);
  }

  @Get(':id')
  detail(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.bookings.detail(req.user.sub, id);
  }

  @Post(':id/cancel')
  cancel(@Req() req: AuthedRequest, @Param('id') id: string) {
    requireRole(req, 'customer');
    return this.bookings.cancel(req.user.sub, id);
  }

  @Post(':id/reschedule')
  reschedule(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: RescheduleDto) {
    requireRole(req, 'customer');
    return this.bookings.reschedule(req.user.sub, id, dto.date, dto.timeSlot);
  }
}

@Controller('provider')
@UseGuards(AuthGuard)
export class ProviderController {
  constructor(private readonly bookings: BookingsService) {}

  @Get('offers')
  offers(@Req() req: AuthedRequest) {
    requireRole(req, 'provider');
    return this.bookings.offersFor(req.user.sub);
  }

  @Post('offers/:id/accept')
  accept(@Req() req: AuthedRequest, @Param('id') id: string) {
    requireRole(req, 'provider');
    return this.bookings.accept(req.user.sub, id);
  }

  @Post('offers/:id/decline')
  decline(@Req() req: AuthedRequest, @Param('id') id: string) {
    requireRole(req, 'provider');
    return this.bookings.decline(req.user.sub, id);
  }

  @Get('jobs')
  jobs(@Req() req: AuthedRequest) {
    requireRole(req, 'provider');
    return this.bookings.jobsFor(req.user.sub);
  }

  @Post('jobs/:id/status')
  updateStatus(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateStatusDto) {
    requireRole(req, 'provider');
    return this.bookings.updateStatus(req.user.sub, id, dto.status);
  }

  @Post('jobs/:id/cancel')
  cancelJob(@Req() req: AuthedRequest, @Param('id') id: string) {
    requireRole(req, 'provider');
    return this.bookings.cancelByProvider(req.user.sub, id);
  }
}

@Controller('admin')
@UseGuards(AuthGuard)
export class AdminBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get('bookings')
  all(@Req() req: AuthedRequest) {
    requireRole(req, 'admin');
    return this.bookings.all();
  }
}
