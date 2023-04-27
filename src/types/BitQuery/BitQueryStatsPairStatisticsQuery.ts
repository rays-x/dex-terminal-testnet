interface Timestamp {
  time: string;
}

interface Block {
  timestamp: Timestamp;
  height: number;
}

interface Exchange {
  fullName: string;
}

interface BuyCurrency {
  address: string;
  symbol: string;
}

interface SellCurrency {
  address: string;
  symbol: string;
}

interface Transaction {
  hash: string;
}

interface Maker {
  address: string;
}

interface Taker {
  address: string;
}

interface PairStatistic {
  maker: Maker;
  taker: Taker;
  block: Block;
  tradeIndex: string;
  exchange: Exchange;
  buyAmount: number;
  buyCurrency: BuyCurrency;
  sellAmount: number;
  sellCurrency: SellCurrency;
  transaction: Transaction;
}

interface Stats {
  pairStatistics: PairStatistic[];
}

interface Data {
  stats: Stats;
}

export interface BitQueryStatsPairStatisticsQuery {
  data: Data;
}
