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
import { ProviderProfile } from '../entities/provider-profile.entity';
import { Review } from '../entities/review.entity';
import { User } from '../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(ProviderProfile) private readonly profiles: Repository<ProviderProfile>,
    private readonly notifications: NotificationsService,
    private readonly bookingsService: BookingsService,
  ) {}

  async create(customerId: string, bookingId: string, rating: number, comment?: string, photos: string[] = []) {
    const booking = await this.bookings.findOneBy({ id: bookingId });
    if (!booking) throw new NotFoundException(`Booking ${bookingId} not found`);
    if (booking.customer.id !== customerId) throw new ForbiddenException('Not your booking');
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new ConflictException('Review after the job is completed');
    }
    if (!booking.provider) throw new ConflictException('No provider on this booking');
    if (await this.reviews.findOneBy({ booking: { id: bookingId } })) {
      throw new ConflictException('Booking already reviewed');
    }

    const review = await this.reviews.save(
      this.reviews.create({
        booking,
        customer: booking.customer,
        provider: booking.provider,
        rating,
        comment,
        photos,
      }),
    );

    // Keep the provider's denormalized average in sync.
    const raw = await this.reviews
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .where('r.providerId = :id', { id: booking.provider.id })
      .getRawOne<{ avg: string }>();
    const avg = Number(raw?.avg ?? rating);
    await this.profiles.update(
      { user: { id: booking.provider.id } },
      { rating: Math.round(avg * 10) / 10 },
    );

    await this.notifications.notify(
      booking.provider.id,
      'New review',
      `${'★'.repeat(rating)} from ${booking.customer.name ?? 'a customer'}`,
    );
    await this.bookingsService.closeIfSettled(booking.id);
    return review;
  }

  /** Flag a review for admin moderation (disputes, abuse). */
  async report(reviewId: string, reason: string) {
    const review = await this.reviews.findOneBy({ id: reviewId });
    if (!review) throw new NotFoundException(`Review ${reviewId} not found`);
    review.reported = true;
    review.reportReason = reason;
    return this.reviews.save(review);
  }

  reportedReviews() {
    return this.reviews.find({ where: { reported: true }, order: { createdAt: 'DESC' } });
  }

  all() {
    return this.reviews.find({ order: { createdAt: 'DESC' }, take: 200 });
  }

  async forProvider(providerId: string) {
    const items = await this.reviews.find({
      where: { provider: { id: providerId } },
      order: { createdAt: 'DESC' },
    });
    const average = items.length
      ? Math.round((items.reduce((s, r) => s + r.rating, 0) / items.length) * 10) / 10
      : 0;
    return { average, count: items.length, items };
  }

  /** Provider scorecard: rating distribution + operational metrics. */
  async scoreFor(providerId: string) {
    const profile = await this.profiles.findOneBy({ user: { id: providerId } });
    if (!profile) throw new NotFoundException(`Provider ${providerId} not found`);

    const { average, count, items } = await this.forProvider(providerId);
    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of items) distribution[r.rating as 1 | 2 | 3 | 4 | 5]++;

    const assigned = await this.bookings.find({ where: { provider: { id: providerId } } });
    const completed = assigned.filter((b) => b.status === BookingStatus.COMPLETED).length;
    const cancelled = assigned.filter((b) => b.status === BookingStatus.CANCELLED).length;
    const closed = completed + cancelled;

    return {
      providerId,
      name: profile.user.name,
      services: profile.services,
      city: profile.city,
      experienceYears: profile.experienceYears,
      averageRating: average,
      reviewCount: count,
      distribution,
      jobsDone: profile.jobsDone,
      completionRate: closed ? Math.round((completed / closed) * 100) : null,
    };
  }
}
