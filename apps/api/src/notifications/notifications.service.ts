import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Notification } from '../entities/notification.entity';

/**
 * Delivery channels. Each stub logs in dev; swap the body for the real
 * integration without touching callers:
 *  - push  → Firebase Cloud Messaging (send to the user's device tokens)
 *  - sms   → MSG91 / Twilio (OTPs, critical booking updates)
 *  - email → SES / Resend (receipts, payout statements)
 */
class PushChannel {
  private readonly logger = new Logger('Push(FCM)');
  send(userId: string, title: string, body: string) {
    this.logger.log(`→ [${userId}] ${title}: ${body}`);
  }
}

class SmsChannel {
  private readonly logger = new Logger('SMS');
  send(userId: string, title: string, body: string) {
    this.logger.log(`→ [${userId}] ${title}: ${body}`);
  }
}

class EmailChannel {
  private readonly logger = new Logger('Email');
  send(userId: string, title: string, body: string) {
    this.logger.log(`→ [${userId}] ${title}: ${body}`);
  }
}

@Injectable()
export class NotificationsService {
  private readonly push = new PushChannel();
  private readonly sms = new SmsChannel();
  private readonly email = new EmailChannel();

  constructor(
    @InjectRepository(Notification) private readonly repo: Repository<Notification>,
  ) {}

  /**
   * Stores the in-app feed row, then fans out to delivery channels.
   * V1 policy: everything goes to push; SMS/email are opt-in per event type
   * once real providers are wired up.
   */
  async notify(
    userId: string,
    title: string,
    body: string,
    channels: { sms?: boolean; email?: boolean } = {},
  ) {
    await this.repo.save(this.repo.create({ userId, title, body }));
    this.push.send(userId, title, body);
    if (channels.sms) this.sms.send(userId, title, body);
    if (channels.email) this.email.send(userId, title, body);
  }

  forUser(userId: string) {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 50 });
  }

  async markAllRead(userId: string) {
    await this.repo.update({ userId, read: false }, { read: true });
    return { ok: true };
  }
}
