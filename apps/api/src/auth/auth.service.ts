import { randomInt } from 'node:crypto';

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { Repository } from 'typeorm';

import { User, UserRole } from '../entities/user.entity';

/**
 * OTP modes:
 *  - MSG91_AUTH_KEY set   → random 6-digit codes, delivered by SMS via MSG91,
 *    5-minute expiry, never echoed in the response. Production behavior.
 *  - unset (dev)          → the code is always 123456 and echoed by
 *    /auth/otp/request so the apps can show it as a hint.
 */
const DEV_OTP = '123456';
const OTP_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger('Auth');
  private readonly pendingOtps = new Map<string, { code: string; expires: number }>();

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  private get smsConfigured(): boolean {
    return Boolean(process.env.MSG91_AUTH_KEY);
  }

  async requestOtp(phone: string) {
    if (!this.smsConfigured) {
      return { phone, otp: DEV_OTP, devNote: 'Dev mode: OTP is fixed. Set MSG91_AUTH_KEY for real SMS.' };
    }
    const code = String(randomInt(100000, 1000000));
    this.pendingOtps.set(phone, { code, expires: Date.now() + OTP_TTL_MS });
    try {
      const res = await fetch('https://control.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authkey: process.env.MSG91_AUTH_KEY!,
        },
        body: JSON.stringify({
          mobile: phone.replace('+', ''),
          otp: code,
          template_id: process.env.MSG91_TEMPLATE_ID,
        }),
      });
      if (!res.ok) throw new Error(`MSG91 ${res.status}`);
    } catch (err) {
      this.logger.error(`OTP SMS failed for ${phone}: ${String(err)}`);
      throw new UnauthorizedException('Could not send OTP — try again in a minute');
    }
    return { phone, devNote: 'OTP sent by SMS (valid 5 minutes)' };
  }

  private consumeOtp(phone: string, otp: string): boolean {
    if (!this.smsConfigured) return otp === DEV_OTP;
    const pending = this.pendingOtps.get(phone);
    if (!pending || pending.expires < Date.now() || pending.code !== otp) return false;
    this.pendingOtps.delete(phone); // single use
    return true;
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
    if (!this.consumeOtp(phone, otp)) throw new UnauthorizedException('Invalid or expired OTP');

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
    if (!this.consumeOtp(phone, otp)) throw new UnauthorizedException('Invalid or expired OTP');
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
