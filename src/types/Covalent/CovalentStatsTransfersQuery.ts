interface Token0 {
  contract_address: string;
  contract_name: string;
  volume_in_24h: string;
  volume_out_24h: string;
  quote_rate: number;
  reserve: string;
  logo_url: string;
  contract_ticker_symbol: string;
  contract_decimals: number;
  volume_in_7d: string;
  volume_out_7d: string;
}

interface Token1 {
  contract_address: string;
  contract_name: string;
  volume_in_24h: string;
  volume_out_24h: string;
  quote_rate: number;
  reserve: string;
  logo_url: string;
  contract_ticker_symbol: string;
  contract_decimals: number;
  volume_in_7d: string;
  volume_out_7d: string;
}

interface VolumeTimeseries7d {
  dex_name: string;
  chain_id: string;
  dt: Date;
  exchange: string;
  sum_amount0in: string;
  sum_amount0out: string;
  sum_amount1in: string;
  sum_amount1out: string;
  volume_quote: number;
  token0_quote_rate: number;
  token1_quote_rate: number;
  swap_count_24: number;
}

interface VolumeTimeseries30d {
  dex_name: string;
  chain_id: string;
  dt: Date;
  exchange: string;
  sum_amount0in: string;
  sum_amount0out: string;
  sum_amount1in: string;
  sum_amount1out: string;
  volume_quote: number;
  token0_quote_rate: number;
  token1_quote_rate: number;
  swap_count_24: number;
}

interface LiquidityTimeseries7d {
  dex_name: string;
  chain_id: string;
  dt: Date;
  exchange: string;
  r0_c: string;
  r1_c: string;
  liquidity_quote: number;
  token0_quote_rate: number;
  token1_quote_rate: number;
}

interface LiquidityTimeseries30d {
  dex_name: string;
  chain_id: string;
  dt: Date;
  exchange: string;
  r0_c: string;
  r1_c: string;
  liquidity_quote: number;
  token0_quote_rate: number;
  token1_quote_rate: number;
}

interface PriceTimeseries7d {
  dex_name: string;
  chain_id: string;
  dt: Date;
  exchange: string;
  price_of_token0_in_token1: number;
  price_of_token0_in_token1_description: string;
  price_of_token1_in_token0: number;
  price_of_token1_in_token0_description: string;
  quote_currency: string;
  price_of_token0_in_quote_currency: number;
  price_of_token1_in_quote_currency: number;
}

interface PriceTimeseries30d {
  dex_name: string;
  chain_id: string;
  dt: Date;
  exchange: string;
  price_of_token0_in_token1: number;
  price_of_token0_in_token1_description: string;
  price_of_token1_in_token0: number;
  price_of_token1_in_token0_description: string;
  quote_currency: string;
  price_of_token0_in_quote_currency: number;
  price_of_token1_in_quote_currency: number;
}

interface Item {
  dex_name: string;
  chain_id: string;
  exchange: string;
  swap_count_24h: number;
  total_liquidity_quote: number;
  volume_24h_quote: number;
  fee_24h_quote: number;
  volume_7d_quote: number;
  annualized_fee: number;
  total_supply: string;
  quote_rate: number;
  quote_currency: string;
  block_height: number;
  token_0: Token0;
  token_1: Token1;
  token0_reserve_quote: number;
  token1_reserve_quote: number;
  volume_timeseries_7d: VolumeTimeseries7d[];
  volume_timeseries_30d: VolumeTimeseries30d[];
  liquidity_timeseries_7d: LiquidityTimeseries7d[];
  liquidity_timeseries_30d: LiquidityTimeseries30d[];
  price_timeseries_7d: PriceTimeseries7d[];
  price_timeseries_30d: PriceTimeseries30d[];
}

interface Pagination {
  has_more: boolean;
  page_number: number;
  page_size: number;
  total_count?: any;
}

interface Data {
  updated_at: Date;
  items: Item[];
  pagination: Pagination;
}

export interface CovalentStatsLiquidityQuery {
  data: Data;
  error: boolean;
  error_message?: any;
  error_code?: any;
}
