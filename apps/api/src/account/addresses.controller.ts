import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsString, MinLength } from 'class-validator';
import { Repository } from 'typeorm';

import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import { SavedAddress } from '../entities/saved-address.entity';
import { User } from '../entities/user.entity';

class CreateAddressDto {
  @IsString()
  @MinLength(2)
  label: string;

  @IsString()
  @MinLength(10)
  line: string;
}

@Controller('addresses')
@UseGuards(AuthGuard)
export class AddressesController {
  constructor(
    @InjectRepository(SavedAddress) private readonly addresses: Repository<SavedAddress>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  @Get()
  mine(@Req() req: AuthedRequest) {
    return this.addresses.find({
      where: { user: { id: req.user.sub } },
      order: { createdAt: 'ASC' },
    });
  }

  @Post()
  async create(@Req() req: AuthedRequest, @Body() dto: CreateAddressDto) {
    const user = await this.users.findOneByOrFail({ id: req.user.sub });
    return this.addresses.save(this.addresses.create({ user, label: dto.label, line: dto.line }));
  }

  @Delete(':id')
  async remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    const address = await this.addresses.findOne({ where: { id }, relations: { user: true } });
    if (!address) throw new NotFoundException('Address not found');
    if (address.user.id !== req.user.sub) throw new ForbiddenException('Not your address');
    await this.addresses.remove(address);
    return { ok: true };
  }
}
