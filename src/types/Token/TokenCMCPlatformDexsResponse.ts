export interface PairList {
  dexerId: number;
  dexerName: string;
  volume1h: string;
  volume24h: string;
  liquidityScore: string;
  exchangeScore: string;
}

export interface ExchangeList {
  dexerId: number;
  dexerName: string;
  volume1h: string;
  volume24h: string;
  liquidityScore: string;
  exchangeScore: string;
}

export interface Top5 {
  dexerId: number;
  dexerName: string;
  volume1h: string;
  volume24h: string;
  liquidityScore: string;
  exchangeScore: string;
}

export interface Data {
  platformId: number;
  platformName: string;
  cryptoId: number;
  dexerPlatformName: string;
  platformVolume24h: string;
  dataTimeStamp: string;
  pairList: PairList[];
  exchangeList: ExchangeList[];
  top5: Top5[];
}

export interface Status {
  timestamp: Date;
  error_code: string;
  error_message: string;
  elapsed: string;
  credit_count: number;
}

export interface TokenCMCPlatformDexsResponse {
  data: Data;
  status: Status;
}
