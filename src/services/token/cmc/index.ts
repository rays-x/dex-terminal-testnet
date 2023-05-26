import pThrottle from 'p-throttle';

import { req } from 'helpers/proxyRequest';
import { chunk } from 'lodash-es';
import { CPCCoinsResponse, CmcStats, CmcStatsResponse, CmcCoin } from './types';

const { CMC_API_KEY } = process.env;
const CMC_IDS_PER_REQ = Number.parseInt(process.env.CMC_IDS_PER_REQ, 10);

export async function getCmcTokens(): Promise<CmcCoin[]> {
  const { fields, values } = await req<CPCCoinsResponse>(
    'https://s3.coinmarketcap.com/generated/core/crypto/cryptos.json',
    { responseType: 'json' }
  );

  const idIndex = fields.indexOf('id');
  const addressIndex = fields.indexOf('address');
  const symbolIndex = fields.indexOf('symbol');
  const slugIndex = fields.indexOf('slug');
  const nameIndex = fields.indexOf('name');
  const isActiveIndex = fields.indexOf('is_active');
  const rankIndex = fields.indexOf('rank');

  return values.map((value) => ({
    id: value[idIndex],
    name: value[nameIndex],
    slug: value[slugIndex],
    symbol: value[symbolIndex],
    contracts: value[addressIndex],
    isActive: Boolean(value[isActiveIndex]),
    rank: value[rankIndex],
  }));
}

const throttledLatestStats = pThrottle({
  limit: 10,
  interval: 30 * 1000,
})(async (_ids: string[]) => {
  const { status, data } = await req<CmcStatsResponse>(
    'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
    {
      responseType: 'json',
      searchParams: { id: _ids.join(',') },
      headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY },
    }
  );

  if (status.error_code || !data) {
    throw new Error(status.error_message);
  }

  return data;
});

export async function getCmcStats(
  ids: (number | string)[]
): Promise<Record<string, CmcStats>> {
  const responses = await Promise.all(
    chunk(ids, CMC_IDS_PER_REQ).map(throttledLatestStats)
  );

  return responses.reduce((m, res) => ({ ...m, ...res }), {});
}
