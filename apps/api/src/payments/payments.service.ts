import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BookingsService } from '../bookings/bookings.service';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { Payment, PaymentMethod } from '../entities/payment.entity';
import { NotificationsService } from '../notifications/notifications.service';

const COMMISSION_RATE = 0.2;

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    private readonly notifications: NotificationsService,
    private readonly bookingsService: BookingsService,
  ) {}

  /** Simple HTML invoice — a PDF generator can replace the template later. */
  async invoiceHtml(userId: string, paymentId: string): Promise<string> {
    const payment = await this.payments.findOneBy({ id: paymentId });
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);
    const b = payment.booking;
    if (b.customer.id !== userId && b.provider?.id !== userId) {
      throw new ForbiddenException('Not your payment');
    }
    const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
    const rows = b.services
      .map((s) => `<tr><td>${s.name}</td><td class="r">${inr(s.price)}</td></tr>`)
      .join('');
    const refunded = payment.status === 'REFUNDED';
    return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${b.id}</title>
<style>
 body{font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 20px;color:#111}
 h1{font-size:22px} .muted{color:#666;font-size:14px}
 table{width:100%;border-collapse:collapse;margin:20px 0}
 td,th{padding:8px 4px;border-bottom:1px solid #eee;text-align:left} .r{text-align:right}
 .total td{font-weight:700;border-top:2px solid #111;border-bottom:none}
 .badge{display:inline-block;padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700;
 background:${refunded ? '#fee2e2;color:#b91c1c' : '#dcfce7;color:#15803d'}}
</style></head><body>
<h1>🏠 HomeFlow — Tax Invoice</h1>
<p class="muted">Invoice ${payment.id.slice(0, 8).toUpperCase()} · Booking ${b.id} ·
 ${new Date(payment.createdAt).toDateString()}</p>
<p><b>Billed to:</b> ${b.customer.name ?? b.customer.phone}<br>
<span class="muted">${b.address}</span></p>
<p><b>Service by:</b> ${b.provider?.name ?? '—'} · ${b.date} · ${b.timeSlot}</p>
<table>
 <tr><th>Service</th><th class="r">Amount</th></tr>
 ${rows}
 <tr class="total"><td>Total (${payment.method})</td><td class="r">${inr(payment.amount)}</td></tr>
</table>
<p>Status: <span class="badge">${payment.status}</span>${refunded ? ' — refund reaches your account in 5–7 business days' : ''}</p>
<p class="muted">HomeFlow · Hyderabad · support@homeflow.in</p>
</body></html>`;
  }

  async pay(customerId: string, bookingId: string, method: PaymentMethod) {
    const booking = await this.bookings.findOneBy({ id: bookingId });
    if (!booking) throw new NotFoundException(`Booking ${bookingId} not found`);
    if (booking.customer.id !== customerId) throw new ForbiddenException('Not your booking');
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new ConflictException('Payment is collected after the job is completed');
    }
    if (await this.payments.findOneBy({ booking: { id: bookingId } })) {
      throw new ConflictException('Booking already paid');
    }

    const commission = Math.round(booking.amount * COMMISSION_RATE);
    const payment = await this.payments.save(
      this.payments.create({
        booking,
        method,
        amount: booking.amount,
        commission,
        payout: booking.amount - commission,
      }),
    );
    if (booking.provider) {
      await this.notifications.notify(
        booking.provider.id,
        'Payment received',
        `₹${payment.payout} payout for ${booking.id} (settles Monday)`,
      );
    }
    await this.bookingsService.closeIfSettled(booking.id);
    return payment;
  }

  all() {
    return this.payments.find({ order: { createdAt: 'DESC' }, take: 200 });
  }

  async forUser(userId: string) {
    const all = await this.payments.find({ order: { createdAt: 'DESC' } });
    return all.filter(
      (p) => p.booking.customer.id === userId || p.booking.provider?.id === userId,
    );
  }

  /** Admin-triggered refund (dispute resolution). Gateway reversal plugs in here. */
  async refund(paymentId: string) {
    const payment = await this.payments.findOneBy({ id: paymentId });
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);
    if (payment.status === 'REFUNDED') throw new ConflictException('Already refunded');
    if (payment.settledAt) throw new ConflictException('Payout already settled — recover from provider first');
    payment.status = 'REFUNDED';
    await this.payments.save(payment);
    await this.notifications.notify(
      payment.booking.customer.id,
      'Refund initiated',
      `₹${payment.amount} for ${payment.booking.id} — back in 5–7 business days`,
    );
    return payment;
  }

  /** Provider earnings summary: period breakdown + settled vs pending. */
  async payoutsForProvider(providerId: string) {
    const all = await this.payments.find({ order: { createdAt: 'DESC' } });
    const mine = all.filter((p) => p.booking.provider?.id === providerId && p.status === 'PAID');
    const sum = (items: Payment[]) => items.reduce((s, p) => s + p.payout, 0);
    const settled = mine.filter((p) => p.settledAt);
    const pending = mine.filter((p) => !p.settledAt);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - ((startOfDay.getDay() + 6) % 7)); // Monday
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const since = (from: Date) => sum(mine.filter((p) => new Date(p.createdAt) >= from));

    return {
      totalEarned: sum(mine),
      today: since(startOfDay),
      thisWeek: since(startOfWeek),
      thisMonth: since(startOfMonth),
      pendingSettlement: sum(pending),
      settled: sum(settled),
      payments: mine,
    };
  }

  /** Admin view: unsettled payouts grouped per provider. */
  async adminPayouts() {
    const all = await this.payments.find();
    const unsettled = all.filter((p) => p.status === 'PAID' && !p.settledAt && p.booking.provider);
    const byProvider = new Map<string, { provider: string; providerId: string; payments: number; amount: number }>();
    for (const p of unsettled) {
      const key = p.booking.provider!.id;
      const row = byProvider.get(key) ?? {
        provider: p.booking.provider!.name ?? p.booking.provider!.phone,
        providerId: key,
        payments: 0,
        amount: 0,
      };
      row.payments += 1;
      row.amount += p.payout;
      byProvider.set(key, row);
    }
    return [...byProvider.values()];
  }

  /** Weekly settlement batch: marks all unsettled payouts settled and notifies providers. */
  async settleAll() {
    const rows = await this.adminPayouts();
    const now = new Date().toISOString();
    await this.payments
      .createQueryBuilder()
      .update()
      .set({ settledAt: now })
      .where("status = 'PAID' AND settledAt IS NULL")
      .execute();
    await Promise.all(
      rows.map((r) =>
        this.notifications.notify(r.providerId, 'Payout settled', `₹${r.amount} for ${r.payments} job(s) sent to your bank`),
      ),
    );
    return { settledProviders: rows.length, settledAt: now };
  }
}
