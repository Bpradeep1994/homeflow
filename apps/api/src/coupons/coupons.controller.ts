import {
  Body,
  Controller,
  ConflictException,
  Get,
  NotFoundException,
  OnApplicationBootstrap,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { Repository } from 'typeorm';

import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import { requireRole } from '../auth/roles';
import { Coupon, type CouponType } from '../entities/coupon.entity';

class CreateCouponDto {
  @Matches(/^[A-Z0-9]{4,16}$/)
  code: string;

  @IsString()
  title: string;

  @IsIn(['FLAT', 'PERCENT'])
  type: CouponType;

  @IsInt()
  @Min(1)
  value: number;

  @IsInt()
  @Min(1)
  maxUses: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  expiresAt: string;
}

class UpdateCouponDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  expiresAt?: string;
}

const seedCoupons: Partial<Coupon>[] = [
  { code: 'WELCOME100', title: 'Flat ₹100 off your first booking', type: 'FLAT', value: 100, maxUses: 1000, used: 412, expiresAt: '2026-08-31' },
  { code: 'COOL20', title: '20% off AC Service', type: 'PERCENT', value: 20, maxUses: 500, used: 187, expiresAt: '2026-07-12' },
  { code: 'SPARKLE500', title: '₹500 off Full Home Cleaning', type: 'FLAT', value: 500, maxUses: 200, used: 64, expiresAt: '2026-07-31' },
];

@Controller()
export class CouponsController implements OnApplicationBootstrap {
  constructor(@InjectRepository(Coupon) private readonly coupons: Repository<Coupon>) {}

  async onApplicationBootstrap() {
    if ((await this.coupons.count()) === 0) {
      await this.coupons.save(this.coupons.create(seedCoupons));
    }
  }

  /** Active, unexpired, not-exhausted coupons — powers the app's offers carousel. */
  @Get('coupons')
  async active() {
    const today = new Date().toISOString().slice(0, 10);
    const all = await this.coupons.find({ order: { createdAt: 'ASC' } });
    return all.filter((c) => c.active && c.expiresAt >= today && c.used < c.maxUses);
  }

  @Get('admin/coupons')
  @UseGuards(AuthGuard)
  all(@Req() req: AuthedRequest) {
    requireRole(req, 'admin');
    return this.coupons.find({ order: { createdAt: 'ASC' } });
  }

  @Post('admin/coupons')
  @UseGuards(AuthGuard)
  async create(@Req() req: AuthedRequest, @Body() dto: CreateCouponDto) {
    requireRole(req, 'admin');
    if (await this.coupons.findOneBy({ code: dto.code })) {
      throw new ConflictException(`Coupon ${dto.code} exists`);
    }
    return this.coupons.save(this.coupons.create({ ...dto }));
  }

  @Patch('admin/coupons/:code')
  @UseGuards(AuthGuard)
  async update(@Req() req: AuthedRequest, @Param('code') code: string, @Body() dto: UpdateCouponDto) {
    requireRole(req, 'admin');
    const coupon = await this.coupons.findOneBy({ code });
    if (!coupon) throw new NotFoundException(`Coupon ${code} not found`);
    Object.assign(coupon, dto);
    return this.coupons.save(coupon);
  }
}
