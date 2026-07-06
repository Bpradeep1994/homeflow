import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import { requireRole } from '../auth/roles';
import { UsersService } from './users.service';

class ReviewVerificationDto {
  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  reason?: string;
}

class BlockDto {
  @IsBoolean()
  blocked: boolean;
}

class CreateCategoryDto {
  @Matches(/^[a-z0-9-]+$/)
  id: string;

  @IsString()
  name: string;

  @IsString()
  emoji: string;
}

class CreateServiceDto {
  @Matches(/^[a-z0-9-]+$/)
  id: string;

  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  price: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  quoteOnVisit?: boolean;

  @IsOptional()
  @IsBoolean()
  emergency?: boolean;
}

class UpdateServiceDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  name?: string;
}

@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(private readonly users: UsersService) {}

  // --- User management ---

  @Get('users')
  listUsers(@Req() req: AuthedRequest, @Query('role') role?: string) {
    requireRole(req, 'admin');
    return this.users.listUsers(role);
  }

  @Get('providers')
  listProviders(@Req() req: AuthedRequest) {
    requireRole(req, 'admin');
    return this.users.listProviders();
  }

  @Patch('users/:id/block')
  setBlocked(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: BlockDto) {
    requireRole(req, 'admin');
    return this.users.setBlocked(id, dto.blocked);
  }

  // --- Provider verification ---

  @Get('verifications')
  pending(@Req() req: AuthedRequest) {
    requireRole(req, 'admin');
    return this.users.pendingVerifications();
  }

  @Post('verifications/:userId')
  review(@Req() req: AuthedRequest, @Param('userId') userId: string, @Body() dto: ReviewVerificationDto) {
    requireRole(req, 'admin');
    return this.users.reviewVerification(userId, dto.decision === 'approve', dto.reason);
  }

  // --- Service management ---

  @Post('categories')
  createCategory(@Req() req: AuthedRequest, @Body() dto: CreateCategoryDto) {
    requireRole(req, 'admin');
    return this.users.createCategory(dto.id, dto.name, dto.emoji);
  }

  @Post('categories/:id/services')
  createService(@Req() req: AuthedRequest, @Param('id') categoryId: string, @Body() dto: CreateServiceDto) {
    requireRole(req, 'admin');
    return this.users.createService(categoryId, dto);
  }

  @Patch('services/:id')
  updateService(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateServiceDto) {
    requireRole(req, 'admin');
    return this.users.updateService(id, dto);
  }
}
