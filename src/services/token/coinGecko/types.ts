export type CoinsListResponse = {
  id: string;
  symbol: string;
  name: string;
  platforms: Record<string, string>;
}[];

interface Entity {
  data: {
    id: string;
    type: string;
  };
}

export interface CoinsPairsResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      base_token_price_usd: string;
      base_token_price_native_currency: string;
      quote_token_price_usd: string;
      quote_token_price_native_currency: string;
      address: string;
      name: string;
      reserve_in_usd: string;
      pool_created_at: unknown;
      token_price_usd: string;
    };
    relationships: {
      dex: Entity;
      base_token: Entity;
      quote_token: Entity;
    };
  }[];
}

export interface CoinGeckoExchangesResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      name: string;
    };
  }[];
  links: {
    first: string;
    prev: unknown;
    next: unknown;
    last: string;
  };
}

export type CoinGeckoStatsResponse = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation?: number;
  total_volume: number;
  high_24h?: number;
  low_24h?: number;
  price_change_24h?: number;
  price_change_percentage_24h?: number;
  market_cap_change_24h?: number;
  market_cap_change_percentage_24h?: number;
  circulating_supply: number;
  total_supply?: number;
  max_supply?: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi?: {
    times: number;
    currency: string;
    percentage: number;
  };
  last_updated: string;
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_24h_in_currency?: number;
  z?: number;
  price_change_percentage_7d_in_currency: number;
}[];
