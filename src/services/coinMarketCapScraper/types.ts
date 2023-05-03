export interface CmcUniswapTokensResponse {
  tokens: {
    chainId: number;
    name: string;
    address: string;
    decimals: number;
    symbol: string;
    logoURI: string;
  }[];
}

export type CmcToken = {
  id: string;
  slug: string;
  name: string;
  symbol: string;
  logoURI: string;
  liquidity: number;
  volume: number;
  volumeChangePercentage24h: number;
  circulatingSupply: number;
  marketCap: number;
  price: number;
  priceChangePercentage1h: number;
  priceChangePercentage24h: number;
  cmcId: number;
};

export interface CoinGeckoTokens {
  name: string;
  tickers: Ticker[];
}

interface Ticker {
  base: string;
  target: string;
  market: Market;
  last: number;
  volume: number;
  converted_last: ConvertedLast;
  converted_volume: ConvertedVolume;
  trust_score: string;
  bid_ask_spread_percentage: number;
  timestamp: string;
  last_traded_at: string;
  last_fetch_at: string;
  is_anomaly: boolean;
  is_stale: boolean;
  trade_url: string;
  token_info_url: any;
  coin_id: string;
  target_coin_id: string;
}

interface Market {
  name: string;
  identifier: string;
  has_trading_incentive: boolean;
}

interface ConvertedLast {
  btc: number;
  eth: number;
  usd: number;
}

interface ConvertedVolume {
  btc: number;
  eth: number;
  usd: number;
}

export interface CmcStatsResponse {
  status: {
    timestamp: string;
    error_code: number;
    error_message: any;
    elapsed: number;
    credit_count: number;
    notice: any;
  };
  data?: Record<string, CmcStats>;
}

export interface CmcStats {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  num_market_pairs: number | null;
  date_added: string;
  tags: string[];
  max_supply: unknown;
  circulating_supply: number | null;
  total_supply: number | null;
  platform: {
    id: number;
    name: string;
    symbol: string;
    slug: string;
    token_address: string;
  };
  is_active: number;
  infinite_supply: boolean;
  cmc_rank: number | null;
  is_fiat: number;
  self_reported_circulating_supply: number | null;
  self_reported_market_cap: number | null;
  tvl_ratio: unknown;
  last_updated: string;
  quote: {
    USD: {
      price: number;
      volume_24h: number | null;
      volume_change_24h: number | null;
      percent_change_1h: number | null;
      percent_change_24h: number | null;
      percent_change_7d: number | null;
      percent_change_30d: number | null;
      percent_change_60d: number | null;
      percent_change_90d: number | null;
      market_cap: number | null;
      market_cap_dominance: number | null;
      fully_diluted_market_cap: number;
      tvl: unknown;
      last_updated: string;
    };
  };
}

export interface HasValidCmcQuote extends CmcStats {
  quote: {
    USD: {
      price: number;
      volume_24h: number;
      volume_change_24h: number;
      percent_change_1h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      percent_change_30d: number;
      percent_change_60d: number;
      percent_change_90d: number;
      market_cap: number;
      market_cap_dominance: number;
      fully_diluted_market_cap: number;
      tvl: unknown;
      last_updated: string;
    };
  };
}

export interface CPCCoinsResponse {
  fields: string[];
  values: Array<number | string | number[] | string[]>;
  batch: string;
}

export interface CmcCoin {
  name: string;
  slug: string;
  symbol: string;
  contracts: string[];
  isActive: boolean;
}

export interface CmcCoinWithStats extends CmcCoin {
  liquidity: number;
  volume: string;
  volumeChangePercentage24h: number;
  circulatingSupply: string;
  marketCap: string;
  price: string;
  priceChangePercentage1h: number;
  priceChangePercentage24h: number;
}

export type CmcCoins = Record<string, CmcCoinWithStats>;
