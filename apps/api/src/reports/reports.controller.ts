import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import { requireRole } from '../auth/roles';
import { ReportsService } from './reports.service';

@Controller('admin/reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  summary(@Req() req: AuthedRequest) {
    requireRole(req, 'admin');
    return this.reports.summary();
  }

  @Get('trends')
  trends(@Req() req: AuthedRequest) {
    requireRole(req, 'admin');
    return this.reports.trends();
  }
}
