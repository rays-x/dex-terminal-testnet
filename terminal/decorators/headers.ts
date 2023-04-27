import {createParamDecorator, ExecutionContext} from '@nestjs/common';

export const CustomHeaders = createParamDecorator((data, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return data ? req.headers[data] : req.headers;
});
