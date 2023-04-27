export type UniToken = {
  chainId: number;
  name: string;
  address: string;
  decimals: number;
  symbol: string;
  logoURI: string;
  slug: string;
};

export type CmcToken = {
  id: string;
  slug: string;
  name: string;
  symbol: string;
  logoURI: string;
  liquidity: number;
  volume: number;
  volumeChangePercentage24h: number;
  circulatingSupply: number;
  marketCap: number;
  price: number;
  priceChangePercentage1h: number;
  priceChangePercentage24h: number;
  cmcId: number;
};
