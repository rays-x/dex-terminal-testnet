import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Types } from 'mongoose';
import { get } from 'lodash';

export const UserId = createParamDecorator(
  (key: string, ctx: ExecutionContext): Types.ObjectId =>
    get(ctx.switchToHttp().getRequest<any>(), 'session.user.id')
);
export const UserEmail = createParamDecorator(
  (key: string, ctx: ExecutionContext): Types.ObjectId | undefined =>
    get(ctx.switchToHttp().getRequest<any>(), 'session.user.email')
);