import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsIn } from 'class-validator';

import { AuthGuard, type AuthedRequest, type JwtPayload } from '../auth/auth.guard';
import { requireRole } from '../auth/roles';
import type { PaymentMethod } from '../entities/payment.entity';
import { PaymentsService } from './payments.service';

class PayDto {
  @IsIn(['UPI', 'CARD', 'CASH'])
  method: PaymentMethod;
}

/**
 * Invoice is opened in a browser tab, which can't set an Authorization
 * header — so it authenticates via a ?token= query param instead.
 */
@Controller()
export class InvoiceController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly jwt: JwtService,
  ) {}

  @Get('payments/:id/invoice')
  @Header('content-type', 'text/html; charset=utf-8')
  async invoice(@Param('id') id: string, @Query('token') token?: string) {
    if (!token) throw new UnauthorizedException('Missing token');
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return this.payments.invoiceHtml(payload.sub, id);
  }
}

@Controller()
@UseGuards(AuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('bookings/:id/pay')
  pay(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: PayDto) {
    return this.payments.pay(req.user.sub, id, dto.method);
  }

  @Get('payments')
  mine(@Req() req: AuthedRequest) {
    return this.payments.forUser(req.user.sub);
  }

  @Get('provider/payouts')
  payouts(@Req() req: AuthedRequest) {
    requireRole(req, 'provider');
    return this.payments.payoutsForProvider(req.user.sub);
  }

  @Get('admin/payments')
  allPayments(@Req() req: AuthedRequest) {
    requireRole(req, 'admin');
    return this.payments.all();
  }

  @Post('admin/payments/:id/refund')
  refund(@Req() req: AuthedRequest, @Param('id') id: string) {
    requireRole(req, 'admin');
    return this.payments.refund(id);
  }

  @Get('admin/payouts')
  adminPayouts(@Req() req: AuthedRequest) {
    requireRole(req, 'admin');
    return this.payments.adminPayouts();
  }

  @Post('admin/payouts/settle')
  settle(@Req() req: AuthedRequest) {
    requireRole(req, 'admin');
    return this.payments.settleAll();
  }
}
