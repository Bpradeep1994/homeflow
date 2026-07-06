import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ServiceCategory } from '../entities/catalog.entity';

@Controller('catalog')
export class CatalogController {
  constructor(
    @InjectRepository(ServiceCategory) private readonly categories: Repository<ServiceCategory>,
  ) {}

  @Get()
  async all() {
    const categories = await this.categories.find();
    // Customers only see admin-activated services.
    return categories.map((c) => ({ ...c, services: c.services.filter((s) => s.active) }));
  }
}
