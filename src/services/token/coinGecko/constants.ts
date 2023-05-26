import { invert } from 'lodash-es';

export const coingeckoNetworksMapper = {
  ethereum: 'eth',
  'binance-smart-chain': 'bsc',
} as const;

export const invertedCoingeckoNetworksMapper = invert(coingeckoNetworksMapper);
