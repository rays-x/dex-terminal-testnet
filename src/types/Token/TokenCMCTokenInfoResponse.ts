interface Tag {
  slug: string;
  name: string;
  category: string;
}

interface Urls {
  website: string[];
  technical_doc: string[];
  explorer: string[];
  source_code: string[];
  message_board: string[];
  chat: string[];
  announcement: any[];
  reddit: any[];
  facebook: any[];
  twitter: string[];
}

interface Statistics {
  price: number;
  priceChangePercentage1h: number;
  priceChangePercentage24h: number;
  priceChangePercentage7d: number;
  priceChangePercentage30d: number;
  priceChangePercentage60d: number;
  priceChangePercentage90d: number;
  marketCap: number;
  marketCapChangePercentage24h: number;
  fullyDilutedMarketCap: number;
  fullyDilutedMarketCapChangePercentage24h: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply: number;
  marketCapDominance: number;
  rank: number;
  low24h: number;
  high24h: number;
  low7d: number;
  high7d: number;
  low30d: number;
  high30d: number;
  low90d: number;
  high90d: number;
  low52w: number;
  high52w: number;
  lowAllTime: number;
  highAllTime: number;
  lowAllTimeChangePercentage: number;
  highAllTimeChangePercentage: number;
  lowAllTimeTimestamp: Date;
  highAllTimeTimestamp: Date;
  lowYesterday: number;
  highYesterday: number;
  openYesterday: number;
  closeYesterday: number;
  priceChangePercentageYesterday: number;
  volumeYesterday: number;
  turnover: number;
  ytdPriceChangePercentage: number;
  roi: number;
  status: string;
}

interface Wallet {
  id: number;
  universalLink: string;
}

interface Platform {
  contractId: number;
  contractAddress: string;
  contractPlatform: string;
  contractPlatformId: number;
  contractChainId: number;
  contractRpcUrl: string[];
  contractNativeCurrencyName: string;
  contractNativeCurrencySymbol: string;
  contractNativeCurrencyDecimals: number;
  contractBlockExplorerUrl: string;
  contractExplorerUrl: string;
  contractDecimals: number;
  platformCryptoId: number;
  sort: number;
  wallets: Wallet[];
}

interface RelatedCoin {
  id: number;
  name: string;
  slug: string;
  price: number;
  priceChangePercentage24h: number;
  priceChangePercentage7d: number;
}

interface RelatedExchange {
  id: number;
  name: string;
  slug: string;
}

interface Wallet2 {
  id: number;
  name: string;
  tier: number;
  url: string;
  chains: string;
  types: string;
  introduction: string;
  star: number;
  security: number;
  easyToUse: number;
  decentration: boolean;
  focusNumber: number;
  rank: number;
  logo: string;
  multipleChain: boolean;
}

interface AuditInfo {
  coinId: string;
  auditor: string;
  auditStatus: number;
  score: string;
  auditTime: Date;
  reportUrl: string;
}

interface HolderList {
  address: string;
  balance: number;
  share: number;
}

interface Holders {
  holderCount: number;
  holderList: HolderList[];
  topTenHolderRatio: number;
  topTwentyHolderRatio: number;
  topFiftyHolderRatio: number;
  topHundredHolderRatio: number;
}

export interface TokenCMCTokenInfoResponse {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  category: string;
  description: string;
  dateAdded: Date;
  status: string;
  notice: string;
  alertLink: string;
  latestUpdateTime: Date;
  watchCount: string;
  tags: Tag[];
  selfReportedTags?: string[];
  selfReportedCirculatingSupply?: string;
  urls: Urls;
  volume: number;
  volumeChangePercentage24h: number;
  cexVolume: number;
  dexVolume: number;
  statistics: Statistics;
  platforms: Platform[];
  relatedCoins: RelatedCoin[];
  relatedExchanges: RelatedExchange[];
  wallets: Wallet2[];
  isAudited: boolean;
  auditInfos: AuditInfo[];
  holders: Holders;
  displayTV: number;
  holdersFlag: boolean;
  ratingsFlag: boolean;
  analysisFlag: boolean;
  socialsFlag: boolean;
  launchPrice: number;
  dateLaunched: string;
}
