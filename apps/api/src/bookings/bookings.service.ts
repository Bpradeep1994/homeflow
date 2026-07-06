import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Booking, BookingStatus } from '../entities/booking.entity';
import { SubService } from '../entities/catalog.entity';
import { Payment } from '../entities/payment.entity';
import { ProviderProfile, VerificationStatus } from '../entities/provider-profile.entity';
import { Review } from '../entities/review.entity';
import { User } from '../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

const LIFECYCLE: BookingStatus[] = [
  BookingStatus.ASSIGNED,
  BookingStatus.ON_THE_WAY,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
];

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(SubService) private readonly services: Repository<SubService>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(ProviderProfile) private readonly profiles: Repository<ProviderProfile>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Review) private readonly reviewsRepo: Repository<Review>,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Terminal transition: COMPLETED → CLOSED once the booking has both a
   * successful payment and a review. Called after each of the two events.
   */
  async closeIfSettled(id: string) {
    const booking = await this.get(id);
    if (booking.status !== BookingStatus.COMPLETED) return booking;
    const paid = await this.payments.findOneBy({ booking: { id }, status: 'PAID' });
    const reviewed = await this.reviewsRepo.findOneBy({ booking: { id } });
    if (!paid || !reviewed) return booking;
    booking.status = BookingStatus.CLOSED;
    booking.history.push({ status: BookingStatus.CLOSED, at: new Date().toISOString() });
    await this.bookings.save(booking);
    await this.notifications.notify(
      booking.customer.id,
      'Booking closed',
      `${booking.id} is all wrapped up. Thanks for choosing HomeFlow!`,
    );
    return booking;
  }

  private async get(id: string): Promise<Booking> {
    const booking = await this.bookings.findOneBy({ id });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    return booking;
  }

  async create(customerId: string, serviceIds: string[], address: string, date: string, timeSlot: string) {
    const services = await this.services.find({
      where: { id: In(serviceIds) },
      relations: { category: true },
    });
    if (services.length !== serviceIds.length) {
      throw new BadRequestException('Unknown service id in request');
    }
    const inactive = services.find((s) => !s.active);
    if (inactive) throw new BadRequestException(`${inactive.name} is currently unavailable`);
    const customer = await this.users.findOneByOrFail({ id: customerId });
    if (customer.status === 'BLOCKED') throw new ForbiddenException('Account is blocked — contact support');

    const booking = await this.bookings.save(
      this.bookings.create({
        id: `HF-${Date.now().toString(36).toUpperCase()}`,
        customer,
        services,
        address,
        date,
        timeSlot,
        amount: services.reduce((sum, s) => sum + s.price, 0),
        status: BookingStatus.PENDING,
        declinedBy: [],
        history: [{ status: BookingStatus.PENDING, at: new Date().toISOString() }],
      }),
    );

    await this.dispatch(booking, services[0].category.name);
    return booking;
  }

  /**
   * Offer the booking to every eligible provider. First accept wins.
   * Eligible = APPROVED, ACTIVE, online, serves the category, not on holiday
   * for the booking date, and the slot starts inside their working hours.
   */
  private async dispatch(booking: Booking, category: string, exclude: string[] = []) {
    const profiles = await this.profiles.findBy({
      verificationStatus: VerificationStatus.APPROVED,
    });
    const slotStart = booking.timeSlot.slice(0, 5); // "HH:MM – HH:MM"
    const eligible = profiles.filter(
      (p) =>
        p.services.includes(category) &&
        p.user.status === 'ACTIVE' &&
        p.online &&
        !exclude.includes(p.user.id) &&
        !p.holidays.includes(booking.date) &&
        p.workingStart <= slotStart &&
        slotStart <= p.workingEnd,
    );
    await Promise.all(
      eligible.map((p) =>
        this.notifications.notify(
          p.user.id,
          'New booking available',
          `${booking.services.map((s) => s.name).join(', ')} · ${booking.timeSlot} · earn ₹${Math.round(booking.amount * 0.8)}`,
        ),
      ),
    );
  }

  all() {
    return this.bookings.find({ order: { createdAt: 'DESC' }, take: 200 });
  }

  forCustomer(customerId: string) {
    return this.bookings.find({
      where: { customer: { id: customerId } },
      order: { createdAt: 'DESC' },
    });
  }

  async detail(userId: string, id: string) {
    const booking = await this.get(id);
    if (booking.customer.id !== userId && booking.provider?.id !== userId) {
      throw new ForbiddenException('Not your booking');
    }
    return booking;
  }

  async cancel(customerId: string, id: string) {
    const booking = await this.get(id);
    if (booking.customer.id !== customerId) throw new ForbiddenException('Not your booking');
    if (![BookingStatus.PENDING, BookingStatus.ASSIGNED].includes(booking.status)) {
      throw new ConflictException(`Cannot cancel a booking in ${booking.status}`);
    }
    booking.status = BookingStatus.CANCELLED;
    booking.history.push({ status: BookingStatus.CANCELLED, at: new Date().toISOString() });
    await this.bookings.save(booking);
    if (booking.provider) {
      await this.notifications.notify(booking.provider.id, 'Booking cancelled', `${booking.id} was cancelled by the customer`);
    }
    return booking;
  }

  private async requireApprovedProvider(providerId: string): Promise<User> {
    const profile = await this.profiles.findOneBy({ user: { id: providerId } });
    if (profile?.user.status === 'BLOCKED') {
      throw new ForbiddenException('Account is blocked — contact support');
    }
    if (profile?.verificationStatus !== VerificationStatus.APPROVED) {
      throw new ForbiddenException('Complete profile verification to receive bookings');
    }
    return profile.user;
  }

  async reschedule(customerId: string, id: string, date: string, timeSlot: string) {
    const booking = await this.get(id);
    if (booking.customer.id !== customerId) throw new ForbiddenException('Not your booking');
    if (![BookingStatus.PENDING, BookingStatus.ASSIGNED].includes(booking.status)) {
      throw new ConflictException(`Cannot reschedule a booking in ${booking.status}`);
    }
    booking.date = date;
    booking.timeSlot = timeSlot;
    await this.bookings.save(booking);
    if (booking.provider) {
      await this.notifications.notify(
        booking.provider.id,
        'Booking rescheduled',
        `${booking.id} moved to ${date} · ${timeSlot}`,
      );
    }
    return booking;
  }

  async offersFor(providerId: string) {
    await this.requireApprovedProvider(providerId);
    const profile = await this.profiles.findOneByOrFail({ user: { id: providerId } });
    const pending = await this.bookings.find({
      where: { status: BookingStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
    return pending.filter(
      (b) => !b.declinedBy.includes(providerId) && !profile.holidays.includes(b.date),
    );
  }

  /** Provider backs out before starting work → booking re-enters dispatch. */
  async cancelByProvider(providerId: string, id: string) {
    const booking = await this.get(id);
    if (booking.provider?.id !== providerId) throw new ForbiddenException('Not your job');
    if (![BookingStatus.ASSIGNED, BookingStatus.ON_THE_WAY].includes(booking.status)) {
      throw new ConflictException(`Cannot cancel a job in ${booking.status}`);
    }
    booking.provider = null;
    booking.status = BookingStatus.PENDING;
    booking.declinedBy.push(providerId); // don't re-offer to the canceller
    booking.history.push({ status: BookingStatus.PENDING, at: new Date().toISOString() });
    await this.bookings.save(booking);

    await this.notifications.notify(
      booking.customer.id,
      'Finding you a new professional',
      `Your professional had to cancel ${booking.id} — we're re-assigning it now.`,
    );
    const first = await this.services.findOne({
      where: { id: booking.services[0]?.id },
      relations: { category: true },
    });
    if (first) await this.dispatch(booking, first.category.name, booking.declinedBy);
    return booking;
  }

  async accept(providerId: string, id: string) {
    const provider = await this.requireApprovedProvider(providerId);
    const booking = await this.get(id);
    if (booking.status !== BookingStatus.PENDING) {
      throw new ConflictException('This booking was already taken');
    }
    booking.provider = provider;
    booking.status = BookingStatus.ASSIGNED;
    booking.history.push({ status: BookingStatus.ASSIGNED, at: new Date().toISOString() });
    await this.bookings.save(booking);
    await this.notifications.notify(
      booking.customer.id,
      'Professional assigned',
      `${booking.provider.name} will arrive ${booking.date} · ${booking.timeSlot}`,
    );
    return booking;
  }

  async decline(providerId: string, id: string) {
    const booking = await this.get(id);
    if (!booking.declinedBy.includes(providerId)) {
      booking.declinedBy.push(providerId);
      await this.bookings.save(booking);
    }
    return { ok: true };
  }

  jobsFor(providerId: string) {
    return this.bookings.find({
      where: { provider: { id: providerId } },
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(providerId: string, id: string, status: BookingStatus) {
    const booking = await this.get(id);
    if (booking.provider?.id !== providerId) throw new ForbiddenException('Not your job');

    const from = LIFECYCLE.indexOf(booking.status);
    const to = LIFECYCLE.indexOf(status);
    if (from === -1 || to !== from + 1) {
      throw new ConflictException(`Cannot move from ${booking.status} to ${status}`);
    }
    booking.status = status;
    booking.history.push({ status, at: new Date().toISOString() });
    await this.bookings.save(booking);

    if (status === BookingStatus.COMPLETED) {
      await this.profiles.increment({ user: { id: providerId } }, 'jobsDone', 1);
    }
    const messages: Partial<Record<BookingStatus, string>> = {
      [BookingStatus.ON_THE_WAY]: `${booking.provider.name} is on the way`,
      [BookingStatus.IN_PROGRESS]: 'Work has started',
      [BookingStatus.COMPLETED]: 'Job completed — please pay and leave a review',
    };
    await this.notifications.notify(booking.customer.id, `Booking ${booking.id}`, messages[status]!);
    return booking;
  }
}
