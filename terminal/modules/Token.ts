import {Module} from '@nestjs/common';
import {TypegooseModule} from 'nestjs-typegoose';
import TokenEntity from '../entities/Token/Token';
import {TokenController} from '../controllers/Token';
import {TokenService} from '../services/Token';
import TokenTagEntity from '../entities/Token/TokenTag';
import PlatformEntity from '../entities/Platform';
import TokenHistoryEntity from '../entities/Token/History/TokenHistory';
import PairEntity from '../entities/Pair/Pair';
import DexEntity from '../entities/Dex';
import {BitQueryModule} from './BitQuery';
import PairHistoryEntity from '../entities/Pair/PairHistory';

@Module({
  imports: [TypegooseModule.forFeature([
    TokenEntity, TokenTagEntity, TokenHistoryEntity,
    PairEntity, DexEntity, PlatformEntity,
    PairHistoryEntity
  ]), BitQueryModule],
  providers: [TokenService],
  exports: [TokenService],
  controllers: [TokenController]
})
export class TokenModule {
}
