export interface CmcPoolsResponse {
  data: {
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
    updateDate: number;
    liquidityScore: string;
    confidenceScore: string;
    isLiquidityAbnormal: number;
  }[];
  status: {
    timestamp: string;
    error_code: string;
    error_message: string;
    elapsed: string;
    credit_count: number;
  };
}

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
