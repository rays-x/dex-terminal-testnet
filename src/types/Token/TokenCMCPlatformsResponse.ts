export interface Datum {
  id: number;
  name: string;
  explorerUrlFormat: string;
  cryptoId: number;
  dexerPlatformName: string;
  dexerTxhashFormat: string;
  visibilityOnDexscan: boolean;
  icon: string;
}

export interface Status {
  timestamp: Date;
  error_code: string;
  error_message: string;
  elapsed: string;
  credit_count: number;
}

export interface TokenCMCPlatformsResponse {
  data: Datum[];
  status: Status;
}
