import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ServiceCategory, SubService } from '../entities/catalog.entity';
import { ProviderProfile } from '../entities/provider-profile.entity';
import { User } from '../entities/user.entity';
import { CatalogController } from './catalog.controller';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceCategory, SubService, User, ProviderProfile])],
  controllers: [CatalogController],
  providers: [SeedService],
})
export class CatalogModule {}
