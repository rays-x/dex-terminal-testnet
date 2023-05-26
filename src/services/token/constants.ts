import { BlockchainInfo } from './types';

export const Blockchains = {
  ethereum: {
    explorerAccountAddress: 'https://etherscan.io/address/:address',
    explorerTokenAddress: 'https://etherscan.io/token/:address',
    explorerTxHashAddress: 'https://etherscan.io/tx/:hash',
    evmChainId: 1,
    name: 'Ethereum Mainnet',
    image:
      'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880',
  },
  'binance-smart-chain': {
    explorerAccountAddress: 'https://bscscan.com/token/:address',
    explorerTokenAddress: 'https://bscscan.com/token/:address',
    explorerTxHashAddress: 'https://bscscan.com/tx/:hash',
    evmChainId: 56,
    name: 'Binance Smart Chain',
    image:
      'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png?1644979850',
  },
} as BlockchainInfo;
