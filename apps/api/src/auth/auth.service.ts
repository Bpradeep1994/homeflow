import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { Repository } from 'typeorm';

import { User, UserRole } from '../entities/user.entity';

/**
 * Dev OTP flow: the code is always 123456 and echoed by /auth/otp/request.
 * Swap in an SMS gateway (MSG91, Twilio, …) here — the API stays the same.
 */
const DEV_OTP = '123456';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  requestOtp(phone: string) {
    return { phone, otp: DEV_OTP, devNote: 'Dev mode: OTP is fixed. SMS gateway plugs in here.' };
  }

  private async issueToken(user: User) {
    if (user.status === 'BLOCKED') throw new UnauthorizedException('Account is blocked — contact support');
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      phone: user.phone,
    });
    return { accessToken, user };
  }

  async verifyOtp(phone: string, otp: string, role?: UserRole, name?: string) {
    if (otp !== DEV_OTP) throw new UnauthorizedException('Invalid OTP');

    let user = await this.users.findOneBy({ phone });
    if (!user) {
      user = await this.users.save(
        this.users.create({ phone, role: role ?? 'customer', name }),
      );
    } else if (name && !user.name) {
      user.name = name;
      await this.users.save(user);
    }
    return this.issueToken(user);
  }

  /** Email + password login (admin panel; any account with a password set). */
  async login(email: string, password: string) {
    const user = await this.users.findOneBy({ email });
    if (!user?.passwordHash || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueToken(user);
  }

  /** Password reset via OTP: prove phone ownership, then set the new password. */
  async resetPassword(phone: string, otp: string, newPassword: string, email?: string) {
    if (otp !== DEV_OTP) throw new UnauthorizedException('Invalid OTP');
    const user = await this.users.findOneBy({ phone });
    if (!user) throw new UnauthorizedException('No account for this phone');
    user.passwordHash = await hash(newPassword, 10);
    if (email && !user.email) user.email = email;
    await this.users.save(user);
    return this.issueToken(user);
  }

  me(userId: string) {
    return this.users.findOneBy({ id: userId });
  }

  async updateMe(userId: string, name?: string, email?: string) {
    const user = await this.users.findOneByOrFail({ id: userId });
    if (email && email !== user.email) {
      if (await this.users.findOneBy({ email })) {
        throw new UnauthorizedException('Email already in use');
      }
      user.email = email;
    }
    if (name) user.name = name;
    return this.users.save(user);
  }
}
