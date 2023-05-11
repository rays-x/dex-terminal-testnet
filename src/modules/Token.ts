import { Module } from '@nestjs/common';
import { TokenService } from 'services/token';
import { TokenController } from '../controllers/Token';
import { PrismaModule } from './PrismaModule';

@Module({
  imports: [PrismaModule],
  providers: [TokenService],
  exports: [TokenService],
  controllers: [TokenController],
})
export class TokenModule {}
