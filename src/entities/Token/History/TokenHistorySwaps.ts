import Typegoose from '@typegoose/typegoose';

const { prop } = Typegoose;

export class TokenHistorySwaps {
  @prop()
  countTxs?: number;

  @prop()
  tradeAmountUsd?: number;
}
