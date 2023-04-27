import { UseGuards } from '@nestjs/common';
import { AuthorizedGuard, UnAuthorizedGuard } from '../middlewares/auth.guard';

export function Unauthorized() {
  return UseGuards(UnAuthorizedGuard);
}

export function Authorized() {
  return UseGuards(AuthorizedGuard);
}
