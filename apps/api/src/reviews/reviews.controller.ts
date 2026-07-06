import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import { requireRole } from '../auth/roles';
import { ReviewsService } from './reviews.service';

class ReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  photos?: string[];
}

class ReportReviewDto {
  @IsString()
  @MinLength(4)
  reason: string;
}

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post('bookings/:id/review')
  @UseGuards(AuthGuard)
  create(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: ReviewDto) {
    return this.reviews.create(req.user.sub, id, dto.rating, dto.comment, dto.photos ?? []);
  }

  @Post('reviews/:id/report')
  @UseGuards(AuthGuard)
  report(@Param('id') id: string, @Body() dto: ReportReviewDto) {
    return this.reviews.report(id, dto.reason);
  }

  @Get('admin/reviews/reported')
  @UseGuards(AuthGuard)
  reported(@Req() req: AuthedRequest) {
    requireRole(req, 'admin');
    return this.reviews.reportedReviews();
  }

  @Get('admin/reviews')
  @UseGuards(AuthGuard)
  allReviews(@Req() req: AuthedRequest) {
    requireRole(req, 'admin');
    return this.reviews.all();
  }

  @Get('providers/:id/reviews')
  forProvider(@Param('id') id: string) {
    return this.reviews.forProvider(id);
  }

  @Get('providers/:id/score')
  score(@Param('id') id: string) {
    return this.reviews.scoreFor(id);
  }
}
