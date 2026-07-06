import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

import { AuthGuard, type AuthedRequest } from './auth.guard';
import { AuthService } from './auth.service';

class RequestOtpDto {
  @Matches(/^\+?[0-9]{10,14}$/, { message: 'phone must be a valid number' })
  phone: string;
}

class VerifyOtpDto extends RequestOtpDto {
  @IsString()
  otp: string;

  @IsOptional()
  @IsIn(['customer', 'provider'])
  role?: 'customer' | 'provider';

  @IsOptional()
  @IsString()
  name?: string;
}

class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

class ResetPasswordDto extends RequestOtpDto {
  @IsString()
  otp: string;

  @IsString()
  @MinLength(8)
  newPassword: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp/request')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.phone);
  }

  @Post('otp/verify')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.otp, dto.role, dto.name);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('password/reset')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.phone, dto.otp, dto.newPassword, dto.email);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: AuthedRequest) {
    return this.auth.me(req.user.sub);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  updateMe(@Req() req: AuthedRequest, @Body() dto: UpdateMeDto) {
    return this.auth.updateMe(req.user.sub, dto.name, dto.email);
  }
}
