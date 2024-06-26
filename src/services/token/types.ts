import { coingeckoNetworksMapper } from './coinGecko/constants';

export type BlockchainInfo = Record<
  keyof typeof coingeckoNetworksMapper,
  {
    explorerAccountAddress: string;
    explorerTokenAddress: string;
    explorerTxHashAddress: string;
    evmChainId: number;
    name: string;
    image: string;
  }
>;

export interface Point<T = number> {
  /* timestamp */
  t: number;
  /* value */
  v: T;
}
