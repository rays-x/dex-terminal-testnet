import { prop } from '@typegoose/typegoose';

export class TokenHistorySwaps {
  @prop()
  countTxs?: number;

  @prop()
  tradeAmountUsd?: number;
}
