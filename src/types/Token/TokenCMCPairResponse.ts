export interface MarketPairResponse {
  data: Data;
  status: Status;
}

interface Data {
  id: number;
  name: string;
  symbol: string;
  numMarketPairs: number;
  marketPairs: MarketPair[];
}

interface MarketPair {
  exchangeId: number;
  exchangeName: string;
  exchangeSlug: string;
  exchangeNotice: string;
  platformId?: number;
  platformName?: string;
  pairContractAddress?: string;
  outlierDetected: number;
  priceExcluded: number;
  volumeExcluded: number;
  marketId: number;
  marketPair: string;
  category: string;
  marketUrl: string;
  marketScore: string;
  marketReputation: number;
  baseSymbol: string;
  baseCurrencyId: number;
  quoteSymbol: string;
  quoteCurrencyId: number;
  price: number;
  volumeUsd: number;
  effectiveLiquidity: number;
  liquidity: number;
  lastUpdated: string;
  quote: number;
  volumeBase: number;
  volumeQuote: number;
  dexerUrl?: string;
  feeType: string;
  depthUsdNegativeTwo: number;
  depthUsdPositiveTwo: number;
  reservesAvailable: number;
  porAuditStatus: number;
}

interface Status {
  timestamp: string;
  error_code: string;
  error_message: string;
  elapsed: string;
  credit_count: number;
}
