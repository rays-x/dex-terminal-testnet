import { Module } from '@nestjs/common';
import { CovalentService } from 'services/covalent';
import { CovalentController } from '../controllers/Covalent';

@Module({
  imports: [],
  providers: [CovalentService],
  exports: [CovalentService],
  controllers: [CovalentController],
})
export class CovalentModule {}
