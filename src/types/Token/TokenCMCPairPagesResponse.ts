export interface PageList {
  platformId: number;
  platformName: string;
  dexerPlatformName: string;
  platformCryptoId: number;
  pairContractAddress: string;
  poolId: string;
  dexerId: number;
  dexerName: string;
  baseTokenName: string;
  baseTokenAddress: string;
  baseTokenSymbol: string;
  quotoTokenName: string;
  quotoTokenAddress: string;
  quotoTokenSymbol: string;
  priceUsd: string;
  priceQuote: string;
  volumeUsd24h: string;
  basePrice1h: string;
  quotePrice1h: string;
  quoteChange24h: string;
  baseChange24h: string;
  fdv: string;
  liquidity: string;
  txns24h: string;
  hitSort: string;
  hitSortIndex: string;
  baseCurrencyName: string;
  marketUrl: string;
  baseCurrencyId?: number;
  baseCurrencySlug: string;
}

export interface Data {
  hasNextPage: boolean;
  total: string;
  count: number;
  pageList: PageList[];
}

export interface Status {
  timestamp: Date;
  error_code: string;
  error_message: string;
  elapsed: string;
  credit_count: number;
}

export interface TokenCMCPairPagesResponse {
  data: Data;
  status: Status;
}
