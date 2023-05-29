import { coingeckoNetworksMapper } from '../coinGecko';

export const bitQueryNetworksMapper = {
  'binance-smart-chain': 'bsc',
  ethereum: 'ethereum',
} as Record<keyof typeof coingeckoNetworksMapper, string>;
