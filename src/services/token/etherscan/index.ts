import got from 'got';
import pThrottle from 'p-throttle';

import { coingeckoNetworksMapper } from '../coinGecko';

const networkToExplorerUrl = {
  'binance-smart-chain': 'https://bscscan.com',
  ethereum: 'https://etherscan.com',
} as Record<keyof typeof coingeckoNetworksMapper, string>;

const holdersDataRegExp = /var holdersplotData = \[.+\]/g;

export const throttledHoldersStats = pThrottle({
  limit: 10,
  interval: 500,
})(async (network: keyof typeof coingeckoNetworksMapper, tokenAddr: string) => {
  const res = await got.get(
    `${networkToExplorerUrl[network]}/token/${tokenAddr}`,
    { responseType: 'text' }
  );

  /* make matching faster */
  const match = res.body.slice(res.body.length / 2).match(holdersDataRegExp)[0];

  if (!match) {
    throw new Error('Failed to parse Etherscan answer');
  }

  const parsed = eval(
    match.slice(22).replaceAll('Date.UTC(', "'").replaceAll('),', "',")
  ) as { x?: string; y?: number }[];

  return parsed
    .filter(({ x, y }) => x && y)
    .map(({ x, y }) => ({ t: new Date(x).getTime(), v: y }));
});
