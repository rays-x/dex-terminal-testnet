import { Module } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { BotManagerService } from '../services/BotManager';
import { BotManagerController } from '../controllers/BotManager';
import ExchangeEntity from '../entities/Bot/Exchange';
import UserEntity from '../entities/Bot/User';
import StrategyEntity from '../entities/Bot/Strategy';
import BotEntity from '../entities/Bot/Bot';
import BotLogEntity from '../entities/Bot/BotLog';

@Module({
  imports: [
    TypegooseModule.forFeature([
      ExchangeEntity,
      UserEntity,
      StrategyEntity,
      BotEntity,
      BotLogEntity,
    ]),
  ],
  providers: [BotManagerService],
  exports: [BotManagerService],
  controllers: [BotManagerController],
})
export class BotManagerModule {}
