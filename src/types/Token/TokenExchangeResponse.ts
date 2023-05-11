export interface TokenExchangeResponse {
  data: Data;
  status: Status;
}

interface Data {
  platformVolume24h: string;
  txns24h: string;
  dataTimeStamp: string;
  pairList: PairList[];
  exchangeList: ExchangeList[];
  top5: Top5[];
}

interface PairList {
  platformId: number;
  platformName: string;
  dexerPlatformName: string;
  dexerId: number;
  dexerName: string;
  volume1h: string;
  volume24h: string;
  txns24h: string;
  liquidityScore?: string;
  exchangeScore?: string;
}

interface ExchangeList {
  platformId: number;
  platformName: string;
  dexerPlatformName: string;
  dexerId: number;
  dexerName: string;
  volume1h: string;
  volume24h: string;
  txns24h: string;
  liquidityScore?: string;
  exchangeScore?: string;
}

interface Top5 {
  platformId: number;
  platformName: string;
  dexerPlatformName: string;
  dexerId: number;
  dexerName: string;
  volume1h: string;
  volume24h: string;
  txns24h: string;
  liquidityScore: string;
  exchangeScore: string;
}

interface Status {
  timestamp: string;
  error_code: string;
  error_message: string;
  elapsed: string;
  credit_count: number;
}
