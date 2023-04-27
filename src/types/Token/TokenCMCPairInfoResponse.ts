interface Platform {
  id: number;
  name: string;
  explorerUrlFormat: string;
  cryptoId: number;
  dexerPlatformName: string;
  dexerTxhashFormat: string;
  visibilityOnDexscan: boolean;
}

interface DexerInfo {
  id: number;
  name: string;
}

interface BaseToken {
  id?: string;
  name: string;
  address: string;
  symbol: string;
  slug?: string;
  cryptoSymbol?: string;
}

interface QuoteToken {
  id?: string;
  name: string;
  address: string;
  symbol: string;
  slug?: string;
  cryptoSymbol?: string;
}

interface PoolInfoD {
  liquidity: string;
  pooledBase: string;
  pooledQuote: string;
  poolCreationDate: string;
  percentPooled: string;
}

interface SubItemList {
  code: string;
  riskyLevel: string;
  group: string;
  order: number;
}

interface TokenSecurityDTO {
  tokenContractAddress: string;
  openSource: boolean;
  proxy: boolean;
  mintable: boolean;
  ownerAddress: string;
  canTakeBackOwnership: boolean;
  ownerChangeBalance: boolean;
  hiddenOwner: boolean;
  selfDestruct: boolean;
  externalCall: boolean;
  buyTax: string;
  sellTax: string;
  cannotBuy: boolean;
  cannotSellAll: boolean;
  slippageModifiable: boolean;
  honeypot: boolean;
  transferPausable: boolean;
  blacklisted: boolean;
  whitelisted: boolean;
  inDex: boolean;
  antiWhale: boolean;
  tradingCoolDown: boolean;
  personalSlippageModifiable: boolean;
  updateDate: number;
  riskyItems: number;
  attentionItems: number;
  subItemList: SubItemList[];
}

interface Data {
  poolId: string;
  address: string;
  platform: Platform;
  dexerInfo: DexerInfo;
  baseToken: BaseToken;
  quoteToken: QuoteToken;
  priceUsd: string;
  priceQuote: string;
  volume24h: string;
  volumeQuote24h: string;
  priceChange24h: string;
  fdv: string;
  poolInfoD?: PoolInfoD;
  reverseOrder: boolean;
  totalSupply: string;
  seeOnCmc: boolean;
  tradeOnDexUrl: string;
  priceHighest: string;
  priceLowest: string;
  priceQuoteHighest: string;
  priceQuoteLowest: string;
  txnFormatUrl: string;
  balancerPoolAddress: string;
  extraPoolAddress: string;
  priceHighest24h: string;
  priceLowest24h: string;
  priceQuoteHighest24h: string;
  priceQuoteLowest24h: string;
  priceHighest1m: string;
  priceLowest1m: string;
  priceQuoteHighest1m: string;
  priceQuoteLowest1m: string;
  showPairAddress: boolean;
  telegramBotUrl: string;
  tokenSecurityDTO?: TokenSecurityDTO;
}

interface Status {
  timestamp: Date;
  error_code: string;
  error_message: string;
  elapsed: string;
  credit_count: number;
}

export interface TokenCMCPairInfoResponse {
  data?: Data;
  status: Status;
}
