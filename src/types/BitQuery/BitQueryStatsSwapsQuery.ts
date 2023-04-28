interface Date {
  date: string;
}

interface Swap {
  date: Date;
  tradeAmountUsd: number;
  countTxs: number;
}

interface Stats {
  swaps: Swap[];
}

interface Data {
  stats: Stats;
}

export interface BitQueryStatsSwapsQuery {
  data: Data;
}
