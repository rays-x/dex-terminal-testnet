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

export interface PoolStatsResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      address: string;
      name: string;
      fully_diluted_valuation: string;
      base_token_id: string;
      price_in_usd: string;
      price_in_target_token: string;
      token_prices_in_usd: Record<string, string>;
      reserve_in_usd: string;
      reserve_threshold_met: boolean;
      from_volume_in_usd: string;
      to_volume_in_usd: string;
      api_address: string;
      pool_fee: unknown;
      token_weightages: unknown;
      balancer_pool_id: unknown;
      swap_count_24h: number;
      swap_url: string;
      sentiment_votes: {
        total: number;
        up_percentage: number;
        down_percentage: number;
      };
      price_percent_change: unknown;
      price_percent_changes: { last_24h: string };
      price_percent_changes_by_token_id: unknown;
      historical_data: {
        last_24h: SwapsStats;
      };
      historical_data_by_token_id: unknown;
      token_prices_by_token_id: unknown;
      locked_liquidity: unknown;
      security_indicators: unknown[];
      pool_reports_count: number;
      pool_created_at: unknown;
      latest_swap_timestamp: string;
      high_low_price_data_by_token_id: unknown;
    };
    relationships: unknown;
  };
}

interface SwapsStats {
  swaps_count: number;
  price_in_usd: any;
  volume_in_usd: string;
  buy_swaps_count: number;
  sell_swaps_count: number;
}
