import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { HttpStatusMessages } from '../../messages/http';

@Injectable()
export default class AuthorizedGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const { session } = context.switchToHttp().getRequest<any>();
    const authorized = session.user;
    if (!authorized) {
      throw new HttpException(
        {
          statusCode: HttpStatus.UNAUTHORIZED,
          // message:[headers['cookie'].includes('i18n_redirected=ru')? HttpStatusMessagesRu.UNAUTHORIZED: HttpStatusMessages.UNAUTHORIZED]
          message: HttpStatusMessages.UNAUTHORIZED,
        },
        HttpStatus.UNAUTHORIZED
      );
    }
    return true;
  }
}
