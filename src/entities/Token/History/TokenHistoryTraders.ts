import Typegoose from '@typegoose/typegoose';

const { prop } = Typegoose;

export class TokenHistoryTraders {
  @prop()
  tradeAmount?: number;

  @prop()
  userCount?: number;

  @prop()
  swapsCount?: number;
}
