import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { Repository } from 'typeorm';

import { ServiceCategory } from '../entities/catalog.entity';
import { ProviderProfile, VerificationStatus } from '../entities/provider-profile.entity';
import { User } from '../entities/user.entity';

// Mirrors the catalog in apps/customer/lib/data/catalog.dart.
const catalog = [
  {
    id: 'electrician',
    name: 'Electrician',
    emoji: '⚡',
    services: [
      { id: 'el-fan', name: 'Fan Repair', price: 199, durationMinutes: 45, description: 'Ceiling/table fan not spinning, wobbling or making noise — diagnosis and repair.' },
      { id: 'el-light', name: 'Light Installation', price: 149, durationMinutes: 30, description: 'Install tube lights, LED panels, chandeliers or outdoor lights.' },
      { id: 'el-switch', name: 'Switch Repair', price: 99, durationMinutes: 30, description: 'Replace or repair faulty switches and switchboards.' },
      { id: 'el-socket', name: 'Socket Repair', price: 99, durationMinutes: 30, description: 'Fix loose, sparking or dead power sockets.' },
      { id: 'el-wiring', name: 'Wiring', price: 249, quoteOnVisit: true, durationMinutes: 120, description: 'New wiring or rewiring — inspection first, final quote before work starts.' },
      { id: 'el-doorbell', name: 'Door Bell', price: 129, durationMinutes: 30, description: 'Install or repair wired and wireless door bells.' },
      { id: 'el-mcb', name: 'MCB Repair', price: 199, durationMinutes: 45, description: 'Tripping MCB/fuse issues — diagnose and replace.' },
      { id: 'el-emergency', name: 'Emergency Service', price: 399, emergency: true, durationMinutes: 60, description: '24×7 urgent electrical faults — priority dispatch.' },
    ],
  },
  {
    id: 'ac-repair',
    name: 'AC Repair',
    emoji: '❄️',
    services: [
      { id: 'ac-install', name: 'AC Installation', price: 1499, durationMinutes: 120, description: 'Split/window AC installation including bracket mounting and gas check.' },
      { id: 'ac-service', name: 'AC Service', price: 499, durationMinutes: 60, description: 'Routine service: filter/coil cleaning, gas pressure and performance check.' },
      { id: 'ac-clean', name: 'AC Cleaning', price: 399, durationMinutes: 45, description: 'Deep foam-jet cleaning of indoor and outdoor units.' },
      { id: 'ac-gas', name: 'Gas Refilling', price: 2499, durationMinutes: 90, description: 'Refrigerant top-up/refill with leak test (R22/R32/R410A).' },
      { id: 'ac-cooling', name: 'Cooling Issue', price: 299, quoteOnVisit: true, durationMinutes: 60, description: 'AC not cooling — inspection charge, final quote after diagnosis.' },
      { id: 'ac-leak', name: 'Water Leakage', price: 299, quoteOnVisit: true, durationMinutes: 60, description: 'Indoor unit dripping — drain/installation inspection, quote on visit.' },
      { id: 'ac-compressor', name: 'Compressor Repair', price: 299, quoteOnVisit: true, durationMinutes: 90, description: 'Compressor faults — inspection charge, repair/replace quote on visit.' },
    ],
  },
  {
    id: 'cleaning',
    name: 'House Cleaning',
    emoji: '🧹',
    services: [
      { id: 'cl-full', name: 'Full Home Cleaning', price: 2999, durationMinutes: 240, description: 'Complete deep clean: all rooms, kitchen, bathrooms, balconies.' },
      { id: 'cl-kitchen', name: 'Kitchen Cleaning', price: 999, durationMinutes: 90, description: 'Degrease chimney exterior, tiles, counters, sink and cabinets.' },
      { id: 'cl-bathroom', name: 'Bathroom Cleaning', price: 599, durationMinutes: 60, description: 'Descale tiles, fittings, WC and shower area; sanitize surfaces.' },
      { id: 'cl-sofa', name: 'Sofa Cleaning', price: 799, durationMinutes: 60, description: 'Shampoo + vacuum for fabric or leather sofas (up to 5 seats).' },
      { id: 'cl-carpet', name: 'Carpet Cleaning', price: 699, durationMinutes: 60, description: 'Machine shampoo and dry for carpets and rugs.' },
      { id: 'cl-window', name: 'Window Cleaning', price: 499, durationMinutes: 60, description: 'Glass, grills and sills — inside and reachable outside.' },
    ],
  },
];

const demoUsers: (Partial<User> & { profile?: Partial<ProviderProfile> })[] = [
  { phone: '+919000000000', name: 'HomeFlow Admin', role: 'admin', email: 'admin@homeflow.in' },
  {
    phone: '+919000000001', name: 'Ravi Kumar', role: 'provider',
    profile: { services: ['AC Repair'], city: 'Hyderabad', experienceYears: 8, rating: 4.8, jobsDone: 312, verificationStatus: VerificationStatus.APPROVED, online: true, serviceAreas: ['Madhapur', 'Kondapur', 'Gachibowli'] },
  },
  {
    phone: '+919000000002', name: 'Suresh Yadav', role: 'provider',
    profile: { services: ['Electrician'], city: 'Hyderabad', experienceYears: 5, rating: 4.6, jobsDone: 178, verificationStatus: VerificationStatus.APPROVED, online: true, serviceAreas: ['Kukatpally', 'Miyapur'] },
  },
  {
    phone: '+919000000003', name: 'Lakshmi Devi', role: 'provider',
    profile: { services: ['House Cleaning'], city: 'Hyderabad', experienceYears: 6, rating: 4.9, jobsDone: 245, verificationStatus: VerificationStatus.APPROVED, online: true, serviceAreas: ['Kondapur', 'Banjara Hills'] },
  },
];

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Seed');

  constructor(
    @InjectRepository(ServiceCategory) private readonly categories: Repository<ServiceCategory>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(ProviderProfile) private readonly profiles: Repository<ProviderProfile>,
  ) {}

  async onApplicationBootstrap() {
    if ((await this.categories.count()) === 0) {
      await this.categories.save(this.categories.create(catalog));
      this.logger.log(`Seeded ${catalog.length} categories`);
    }
    for (const { profile, ...u } of demoUsers) {
      if (!(await this.users.findOneBy({ phone: u.phone! }))) {
        if (u.role === 'admin') {
          // Dev admin password — change in production.
          u.passwordHash = await hash(process.env.ADMIN_PASSWORD ?? 'admin123', 10);
        }
        const user = await this.users.save(this.users.create(u));
        if (profile) {
          await this.profiles.save(this.profiles.create({ ...profile, user }));
        }
      }
    }
  }
}
