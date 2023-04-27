interface Maker {
  address: string;
}

interface Taker {
  address: string;
}

interface TradersDistributionValue {
  maker: Maker;
  taker: Taker;
  tradeAmount: number;
}

interface Stats {
  tradersDistributionValue: TradersDistributionValue[];
}

interface Data {
  stats: Stats;
}

export interface BitQueryStatsTradersDistributionValueQuery {
  data: Data;
}