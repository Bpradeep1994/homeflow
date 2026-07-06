import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';

import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  mine(@Req() req: AuthedRequest) {
    return this.notifications.forUser(req.user.sub);
  }

  @Post('read')
  markAllRead(@Req() req: AuthedRequest) {
    return this.notifications.markAllRead(req.user.sub);
  }
}
