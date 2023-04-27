export interface Quote2 {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  marketCap: number;
  timestamp: Date;
}

export interface Quote {
  timeOpen: Date;
  timeClose: Date;
  timeHigh: Date;
  timeLow: Date;
  quote: Quote2;
}

export interface Data {
  id: number;
  name: string;
  symbol: string;
  quotes: Quote[];
}

export interface Status {
  timestamp: Date;
  error_code: string;
  error_message: string;
  elapsed: string;
  credit_count: number;
}

export interface CoinMarketCapHistoricalResponse {
  data: Data;
  status: Status;
}
