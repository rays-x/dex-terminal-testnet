import { Module } from '@nestjs/common';
import { BitQueryService } from '../services/BitQuery';
import { BitQueryController } from '../controllers/BitQuery';

@Module({
  imports: [],
  providers: [BitQueryService],
  exports: [BitQueryService],
  controllers: [BitQueryController],
})
export class BitQueryModule {}
