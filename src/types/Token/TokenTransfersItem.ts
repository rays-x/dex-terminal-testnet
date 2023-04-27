import { Types } from 'mongoose';

export interface TokenTransfersItem {
  id: Types.ObjectId | string;
  date: Date | string;
  totalAmount?: number;
  totalAmountUsd?: number;
  medianTransferAmount?: number;
  medianTransferAmountUsd?: number;
  averageTransferAmount?: number;
  averageTransferAmountUsd?: number;
  uniqReceivers?: number;
  uniqSenders?: number;
  transferCount?: number;
}
