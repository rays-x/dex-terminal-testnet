interface Platform {
  id: number;
  name: string;
  cryptoId: number;
  dexerPlatformName: string;
}

interface BaseToken {
  name: string;
  symbol: string;
  address: string;
}

interface QuoteToken {
  name: string;
  symbol: string;
  address: string;
}

interface DexerInfo {
  id: number;
  name: string;
}

interface Datum {
  poolId: string;
  platform: Platform;
  baseToken: BaseToken;
  quoteToken: QuoteToken;
  dexerInfo: DexerInfo;
  priceUsd: string;
  volume24h: string;
  liquidity: string;
  priceChange24h: string;
  pairContractAddress: string;
  updateDate: any;
  liquidityScore: string;
  confidenceScore: string;
}

interface Status {
  timestamp: Date;
  error_code: string;
  error_message: string;
  elapsed: string;
  credit_count: number;
}

export interface CmcPairListResponse {
  data?: Datum[];
  status: Status;
}
