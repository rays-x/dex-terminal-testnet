import {Module} from '@nestjs/common';
import {TypegooseModule} from 'nestjs-typegoose';
import TokenEntity from '../entities/Token/Token';
import {SwapService} from '../services/Swap';
import {SwapController} from '../controllers/Swap';

@Module({
  imports: [TypegooseModule.forFeature([TokenEntity])],
  providers: [SwapService],
  exports: [SwapService],
  controllers: [SwapController]
})
export class SwapModule {
}
