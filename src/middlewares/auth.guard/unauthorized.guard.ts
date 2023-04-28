import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { HttpStatusMessages } from '../../messages/http';

@Injectable()
export default class UnAuthorizedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { session } = context.switchToHttp().getRequest<any>();
    const unAuthorized = !session.user;
    if (!unAuthorized) {
      throw new HttpException(
        {
          statusCode: HttpStatus.METHOD_NOT_ALLOWED,
          // message:[headers['cookie'].includes('i18n_redirected=ru')? HttpStatusMessagesRu.METHOD_NOT_ALLOWED: HttpStatusMessages.METHOD_NOT_ALLOWED]
          message: HttpStatusMessages.METHOD_NOT_ALLOWED,
        },
        HttpStatus.METHOD_NOT_ALLOWED
      );
    }
    return unAuthorized;
  }
}
