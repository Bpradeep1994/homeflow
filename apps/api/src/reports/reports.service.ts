import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Booking, BookingStatus } from '../entities/booking.entity';
import { Payment } from '../entities/payment.entity';
import { ProviderProfile } from '../entities/provider-profile.entity';
import { Review } from '../entities/review.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(ProviderProfile) private readonly profiles: Repository<ProviderProfile>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
  ) {}

  /** Platform-wide summary for the admin dashboard/reports page. */
  async summary() {
    const [allBookings, allPayments, allReviews, profiles] = await Promise.all([
      this.bookings.find(),
      this.payments.find(),
      this.reviews.find(),
      this.profiles.find(),
    ]);

    const byStatus = Object.fromEntries(
      Object.values(BookingStatus).map((s) => [s, allBookings.filter((b) => b.status === s).length]),
    );
    const paid = allPayments.filter((p) => p.status === 'PAID');
    const closedOrDone = (byStatus[BookingStatus.COMPLETED] ?? 0) + (byStatus[BookingStatus.CLOSED] ?? 0);
    const decided = closedOrDone + (byStatus[BookingStatus.CANCELLED] ?? 0);

    return {
      users: {
        customers: await this.users.countBy({ role: 'customer' }),
        providers: await this.users.countBy({ role: 'provider' }),
        blocked: await this.users.countBy({ status: 'BLOCKED' }),
      },
      providers: {
        approved: profiles.filter((p) => p.verificationStatus === 'APPROVED').length,
        pendingVerification: profiles.filter((p) => p.verificationStatus === 'PENDING').length,
        online: profiles.filter((p) => p.online).length,
      },
      bookings: {
        total: allBookings.length,
        byStatus,
        completionRate: decided ? Math.round((closedOrDone / decided) * 100) : null,
      },
      revenue: {
        collected: paid.reduce((s, p) => s + p.amount, 0),
        commission: paid.reduce((s, p) => s + p.commission, 0),
        payouts: paid.reduce((s, p) => s + p.payout, 0),
        pendingSettlement: paid.filter((p) => !p.settledAt).reduce((s, p) => s + p.payout, 0),
        refunded: allPayments.filter((p) => p.status === 'REFUNDED').reduce((s, p) => s + p.amount, 0),
      },
      reviews: {
        count: allReviews.length,
        average: allReviews.length
          ? Math.round((allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length) * 10) / 10
          : null,
      },
      topProviders: profiles
        .sort((a, b) => b.jobsDone - a.jobsDone)
        .slice(0, 5)
        .map((p) => ({ name: p.user.name, city: p.city, jobsDone: p.jobsDone, rating: p.rating })),
    };
  }

  /** Weekly trends + performance tables for the Reports page. */
  async trends(weeks = 8) {
    const [allBookings, allPayments, customers, profiles] = await Promise.all([
      this.bookings.find(),
      this.payments.find(),
      this.users.findBy({ role: 'customer' }),
      this.profiles.find(),
    ]);
    const paid = allPayments.filter((p) => p.status === 'PAID');

    // Monday-aligned weekly buckets, oldest first.
    const now = new Date();
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const buckets = Array.from({ length: weeks }, (_, i) => {
      const start = new Date(monday);
      start.setDate(monday.getDate() - (weeks - 1 - i) * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return { start, end };
    });
    const label = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
    const inBucket = (iso: Date | string, b: { start: Date; end: Date }) => {
      const t = new Date(iso);
      return t >= b.start && t < b.end;
    };

    const weekly = buckets.map((b) => ({
      week: label(b.start),
      revenue: paid.filter((p) => inBucket(p.createdAt, b)).reduce((s, p) => s + p.amount, 0),
      bookings: allBookings.filter((x) => inBucket(x.createdAt, b)).length,
      newCustomers: customers.filter((c) => inBucket(c.createdAt, b)).length,
    }));

    const cancelled = allBookings.filter((b) => b.status === BookingStatus.CANCELLED).length;
    const decided = allBookings.filter((b) =>
      [BookingStatus.COMPLETED, BookingStatus.CLOSED, BookingStatus.CANCELLED].includes(b.status),
    ).length;

    const earningsByProvider = new Map<string, number>();
    for (const p of paid) {
      const id = p.booking.provider?.id;
      if (id) earningsByProvider.set(id, (earningsByProvider.get(id) ?? 0) + p.payout);
    }

    return {
      weekly,
      cancellationRate: decided ? Math.round((cancelled / decided) * 1000) / 10 : null,
      providerPerformance: profiles
        .filter((p) => p.verificationStatus === 'APPROVED')
        .map((p) => ({
          name: p.user.name,
          services: p.services,
          city: p.city,
          rating: p.rating,
          jobsDone: p.jobsDone,
          online: p.online,
          earnings: earningsByProvider.get(p.user.id) ?? 0,
        }))
        .sort((a, b) => b.earnings - a.earnings),
    };
  }
}
