import { Module } from '@nestjs/common';
import { PrismaService } from 'services/prisma';

@Module({
  imports: [],
  providers: [PrismaService],
  exports: [PrismaService],
  controllers: [],
})
export class PrismaModule {}
