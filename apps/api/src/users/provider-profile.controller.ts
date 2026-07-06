import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import { requireRole } from '../auth/roles';
import { UsersService } from './users.service';

class SubmitVerificationDto {
  @IsString()
  idDocumentUrl: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  services: string[]; // category names, e.g. ["AC Repair", "Electrician"]

  @IsString()
  city: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  serviceAreas: string[];

  @IsInt()
  @Min(0)
  @Max(60)
  experienceYears: number;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certificates?: string[];
}

class AvailabilityDto {
  @IsBoolean()
  online: boolean;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certificates?: string[];

  @IsOptional()
  @Matches(TIME)
  workingStart?: string;

  @IsOptional()
  @Matches(TIME)
  workingEnd?: string;

  @IsOptional()
  @IsArray()
  @Matches(ISO_DATE, { each: true })
  holidays?: string[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  serviceAreas?: string[];
}

@Controller('provider')
@UseGuards(AuthGuard)
export class ProviderProfileController {
  constructor(private readonly users: UsersService) {}

  @Get('profile')
  profile(@Req() req: AuthedRequest) {
    requireRole(req, 'provider');
    return this.users.profileFor(req.user.sub);
  }

  @Post('verification')
  submitVerification(@Req() req: AuthedRequest, @Body() dto: SubmitVerificationDto) {
    requireRole(req, 'provider');
    return this.users.submitVerification(req.user.sub, dto);
  }

  @Patch('profile')
  updateProfile(@Req() req: AuthedRequest, @Body() dto: UpdateProfileDto) {
    requireRole(req, 'provider');
    return this.users.updateProfile(req.user.sub, dto);
  }

  @Patch('availability')
  setAvailability(@Req() req: AuthedRequest, @Body() dto: AvailabilityDto) {
    requireRole(req, 'provider');
    return this.users.setAvailability(req.user.sub, dto.online);
  }
}
