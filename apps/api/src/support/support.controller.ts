import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { Repository } from 'typeorm';

import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import { requireRole } from '../auth/roles';
import { Ticket, type TicketPriority, type TicketStatus } from '../entities/ticket.entity';
import { User } from '../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

class CreateTicketDto {
  @IsString()
  @MinLength(4)
  subject: string;

  @IsString()
  @MinLength(10)
  message: string;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsIn(['HIGH', 'MEDIUM', 'LOW'])
  priority?: TicketPriority;
}

class UpdateTicketDto {
  @IsIn(['OPEN', 'PENDING', 'RESOLVED'])
  status: TicketStatus;
}

@Controller()
@UseGuards(AuthGuard)
export class SupportController {
  constructor(
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly notifications: NotificationsService,
  ) {}

  @Post('support/tickets')
  async create(@Req() req: AuthedRequest, @Body() dto: CreateTicketDto) {
    const user = await this.users.findOneByOrFail({ id: req.user.sub });
    const ticket = await this.tickets.save(
      this.tickets.create({
        user,
        subject: dto.subject,
        message: dto.message,
        bookingId: dto.bookingId,
        priority: dto.priority ?? 'MEDIUM',
      }),
    );
    await this.notifications.notify(
      user.id,
      'Complaint registered',
      `Ticket ${ticket.id.slice(0, 8)} — our team will get back within 24 hours.`,
    );
    return ticket;
  }

  @Get('support/tickets')
  mine(@Req() req: AuthedRequest) {
    return this.tickets.find({
      where: { user: { id: req.user.sub } },
      order: { updatedAt: 'DESC' },
    });
  }

  // --- Admin ---

  @Get('admin/tickets')
  all(@Req() req: AuthedRequest) {
    requireRole(req, 'admin');
    return this.tickets.find({ order: { updatedAt: 'DESC' } });
  }

  @Patch('admin/tickets/:id')
  async update(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    requireRole(req, 'admin');
    const ticket = await this.tickets.findOneBy({ id });
    if (!ticket) throw new NotFoundException('Ticket not found');
    ticket.status = dto.status;
    await this.tickets.save(ticket);
    if (dto.status === 'RESOLVED') {
      await this.notifications.notify(ticket.user.id, 'Complaint resolved', ticket.subject);
    }
    return ticket;
  }
}
