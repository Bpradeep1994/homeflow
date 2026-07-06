import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Favorite } from '../entities/favorite.entity';
import { ProviderProfile } from '../entities/provider-profile.entity';
import { SavedAddress } from '../entities/saved-address.entity';
import { User } from '../entities/user.entity';
import { AddressesController } from './addresses.controller';
import { FavoritesController } from './favorites.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SavedAddress, Favorite, User, ProviderProfile])],
  controllers: [AddressesController, FavoritesController],
})
export class AccountModule {}
