import {prop} from '@typegoose/typegoose';

export class TokenHistoryTransfers {
  @prop()
  totalAmount?: number;
  @prop()
  totalAmountUsd?: number;
  @prop()
  medianTransferAmount?: number;
  @prop()
  medianTransferAmountUsd?: number;
  @prop()
  averageTransferAmount?: number;
  @prop()
  averageTransferAmountUsd?: number;
  @prop()
  uniqReceivers?: number;
  @prop()
  uniqSenders?: number;
  @prop()
  transferCount?: number;
}