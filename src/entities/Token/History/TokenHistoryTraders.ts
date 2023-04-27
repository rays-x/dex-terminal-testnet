import { prop } from '@typegoose/typegoose';

export class TokenHistoryTraders {
  @prop()
  tradeAmount?: number;

  @prop()
  userCount?: number;

  @prop()
  swapsCount?: number;
}
