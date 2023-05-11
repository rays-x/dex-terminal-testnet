

export interface TokenTransfersItem {
  id: string | string;
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
