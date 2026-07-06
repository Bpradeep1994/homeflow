import { ForbiddenException } from '@nestjs/common';

import type { UserRole } from '../entities/user.entity';
import type { AuthedRequest } from './auth.guard';

export function requireRole(req: AuthedRequest, role: UserRole) {
  if (req.user.role !== role) throw new ForbiddenException(`Requires ${role} account`);
}
