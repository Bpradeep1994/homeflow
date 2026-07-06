import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ServiceCategory, SubService } from '../entities/catalog.entity';
import { ProviderProfile, VerificationStatus } from '../entities/provider-profile.entity';
import { User } from '../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

export interface VerificationInput {
  idDocumentUrl: string;
  services: string[]; // category names
  city: string;
  serviceAreas: string[];
  experienceYears: number;
  photoUrl?: string;
  certificates?: string[];
}

export interface ProfileUpdate {
  photoUrl?: string;
  certificates?: string[];
  workingStart?: string;
  workingEnd?: string;
  holidays?: string[];
  serviceAreas?: string[];
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(ProviderProfile) private readonly profiles: Repository<ProviderProfile>,
    @InjectRepository(ServiceCategory) private readonly categories: Repository<ServiceCategory>,
    @InjectRepository(SubService) private readonly services: Repository<SubService>,
    private readonly notifications: NotificationsService,
  ) {}

  private async getUser(id: string): Promise<User> {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async profileFor(userId: string): Promise<ProviderProfile | null> {
    return this.profiles.findOneBy({ user: { id: userId } });
  }

  // --- Provider self-service ---

  async submitVerification(userId: string, input: VerificationInput) {
    const user = await this.getUser(userId);
    for (const name of input.services) {
      if (!(await this.categories.findOneBy({ name }))) {
        throw new BadRequestException(`Unknown service "${name}" — must match a category name`);
      }
    }
    let profile = await this.profileFor(userId);
    if (profile?.verificationStatus === VerificationStatus.APPROVED) {
      throw new ConflictException('Profile already approved');
    }
    profile ??= this.profiles.create({ user });
    Object.assign(profile, {
      idDocumentUrl: input.idDocumentUrl,
      services: input.services,
      city: input.city,
      serviceAreas: input.serviceAreas,
      experienceYears: input.experienceYears,
      photoUrl: input.photoUrl ?? profile.photoUrl,
      certificates: input.certificates ?? profile.certificates ?? [],
      verificationStatus: VerificationStatus.PENDING,
    });
    return this.profiles.save(profile);
  }

  /** Photo, certificates, schedule (working hours + holidays), areas. */
  async updateProfile(userId: string, patch: ProfileUpdate) {
    const profile = await this.profileFor(userId);
    if (!profile) throw new NotFoundException('No provider profile — submit verification first');
    for (const key of ['photoUrl', 'certificates', 'workingStart', 'workingEnd', 'holidays', 'serviceAreas'] as const) {
      if (patch[key] !== undefined) Object.assign(profile, { [key]: patch[key] });
    }
    return this.profiles.save(profile);
  }

  async setAvailability(userId: string, online: boolean) {
    const profile = await this.profileFor(userId);
    if (!profile) throw new NotFoundException('No provider profile — submit verification first');
    profile.online = online;
    await this.profiles.save(profile);
    return { online: profile.online };
  }

  // --- Admin: user management ---

  listUsers(role?: string) {
    return this.users.find({
      where: role ? { role: role as User['role'] } : {},
      order: { createdAt: 'DESC' },
    });
  }

  listProviders() {
    return this.profiles.find({ order: { createdAt: 'DESC' } });
  }

  async setBlocked(userId: string, blocked: boolean) {
    const user = await this.getUser(userId);
    user.status = blocked ? 'BLOCKED' : 'ACTIVE';
    return this.users.save(user);
  }

  // --- Admin: provider verification ---

  pendingVerifications() {
    return this.profiles.findBy({ verificationStatus: VerificationStatus.PENDING });
  }

  async reviewVerification(userId: string, approve: boolean, reason?: string) {
    const profile = await this.profileFor(userId);
    if (!profile || profile.verificationStatus !== VerificationStatus.PENDING) {
      throw new ConflictException('No pending verification for this user');
    }
    profile.verificationStatus = approve ? VerificationStatus.APPROVED : VerificationStatus.REJECTED;
    await this.profiles.save(profile);
    await this.notifications.notify(
      profile.user.id,
      approve ? 'Profile approved 🎉' : 'Verification rejected',
      approve
        ? 'You can now go online and receive bookings.'
        : `Please re-submit your documents. ${reason ?? ''}`.trim(),
    );
    return profile;
  }

  // --- Admin: service management ---

  async createCategory(id: string, name: string, emoji: string) {
    if (await this.categories.findOneBy({ id })) throw new ConflictException(`Category ${id} exists`);
    return this.categories.save(this.categories.create({ id, name, emoji, services: [] }));
  }

  async createService(
    categoryId: string,
    dto: { id: string; name: string; price: number; durationMinutes?: number; description?: string; quoteOnVisit?: boolean; emergency?: boolean },
  ) {
    const category = await this.categories.findOneBy({ id: categoryId });
    if (!category) throw new NotFoundException(`Category ${categoryId} not found`);
    if (await this.services.findOneBy({ id: dto.id })) throw new ConflictException(`Service ${dto.id} exists`);
    return this.services.save(this.services.create({ ...dto, category }));
  }

  async updateService(
    id: string,
    patch: { price?: number; durationMinutes?: number; description?: string; active?: boolean; name?: string },
  ) {
    const service = await this.services.findOneBy({ id });
    if (!service) throw new NotFoundException(`Service ${id} not found`);
    Object.assign(service, patch);
    return this.services.save(service);
  }
}
