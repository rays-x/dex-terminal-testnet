interface Date {
  date: string;
}

interface Transfer {
  date: Date;
  total_amount: number;
  total_amount_usd: number;
  median_transfer_amount: number;
  median_transfer_amount_usd: number;
  average_transfer_amount: number;
  average_transfer_amount_usd: number;
  uniq_receivers: number;
  uniq_senders: number;
  transfer_count: number;
}

interface TransferNew {
  date: Date;
  totalAmount: number;
  totalAmountUsd: number;
  medianTransferAmount: number;
  medianTransferAmountUsd: number;
  averageTransferAmount: number;
  averageTransferAmountUsd: number;
  uniqReceivers: number;
  uniqSenders: number;
  transferCount: number;
}

interface Stats {
  transfers: Transfer[];
}

interface StatsNew {
  transfers: TransferNew[];
}

interface Data {
  stats: Stats;
}

interface DataNew {
  stats: StatsNew;
}

export interface BitQueryStatsTransfersQuery {
  data: Data;
}

export interface BitQueryStatsTransfersNewQuery {
  data: DataNew;
}
