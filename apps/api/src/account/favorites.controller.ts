import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import { Favorite } from '../entities/favorite.entity';
import { ProviderProfile } from '../entities/provider-profile.entity';
import { User } from '../entities/user.entity';

@Controller('favorites')
@UseGuards(AuthGuard)
export class FavoritesController {
  constructor(
    @InjectRepository(Favorite) private readonly favorites: Repository<Favorite>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(ProviderProfile) private readonly profiles: Repository<ProviderProfile>,
  ) {}

  /** Favorites with each provider's profile (services, rating, city). */
  @Get()
  async mine(@Req() req: AuthedRequest) {
    const items = await this.favorites.find({
      where: { customer: { id: req.user.sub } },
      order: { createdAt: 'DESC' },
    });
    return Promise.all(
      items.map(async (f) => ({
        id: f.id,
        provider: f.provider,
        profile: await this.profiles.findOneBy({ user: { id: f.provider.id } }),
      })),
    );
  }

  @Post(':providerUserId')
  async add(@Req() req: AuthedRequest, @Param('providerUserId') providerUserId: string) {
    const provider = await this.users.findOneBy({ id: providerUserId, role: 'provider' });
    if (!provider) throw new BadRequestException('Not a provider');
    const existing = await this.favorites.findOneBy({
      customer: { id: req.user.sub },
      provider: { id: providerUserId },
    });
    if (existing) return existing;
    const customer = await this.users.findOneByOrFail({ id: req.user.sub });
    return this.favorites.save(this.favorites.create({ customer, provider }));
  }

  @Delete(':providerUserId')
  async remove(@Req() req: AuthedRequest, @Param('providerUserId') providerUserId: string) {
    await this.favorites.delete({
      customer: { id: req.user.sub },
      provider: { id: providerUserId },
    });
    return { ok: true };
  }
}
