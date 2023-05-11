import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { get } from 'lodash-es';

export const UserId = createParamDecorator(
  (key: string, ctx: ExecutionContext): string =>
    get(ctx.switchToHttp().getRequest<any>(), 'session.user.id')
);
export const UserEmail = createParamDecorator(
  (key: string, ctx: ExecutionContext): string | undefined =>
    get(ctx.switchToHttp().getRequest<any>(), 'session.user.email')
);
