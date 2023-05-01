import pAll from 'p-all';
import pThrottle from 'p-throttle';

import { req } from 'helpers/proxyRequest';
import { chunk, merge } from 'lodash-es';
import {
  CPCCoinsResponse,
  CmcStats,
  CmcStatsResponse,
  CoinGeckoTokens,
  CmcCoin,
  CmcCoinWithStats,
  CmcUniswapTokensResponse,
} from './types';

const CMC_API_KEY = '9365749c-5395-452c-9ab7-c87ceccb64eb';
const CMC_IDS_PER_REQ = 500;

const throttle = pThrottle({
  limit: 1,
  interval: 2000,
});

export async function getCmcTokens(): Promise<[string, CmcCoin][]> {
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

  return values.map((value) => [
    value[idIndex],
    {
      name: value[nameIndex],
      slug: value[slugIndex],
      symbol: value[symbolIndex],
      contracts: value[addressIndex],
      isActive: Boolean(value[isActiveIndex]),
    },
  ]);
}

export async function getPancakeswapTokenContracts(): Promise<string[]> {
  const pages = await pAll(
    [1].map(
      (page) => async () =>
        req<CoinGeckoTokens>(
          'https://api.coingecko.com/api/v3/exchanges/pancakeswap_new/tickers',
          { responseType: 'json', searchParams: { page } }
        )
    ),
    { concurrency: 1 }
  );

  return [
    ...new Set(
      pages.flatMap((page) => page.tickers.map((ticker) => ticker.base))
    ),
  ];
}

export async function getUniswapTokenContracts(): Promise<string[]> {
  const { tokens } = await req<CmcUniswapTokensResponse>(
    'https://api.coinmarketcap.com/data-api/v3/uniswap/all.json',
    { responseType: 'json' }
  );

  return tokens.map(({ address }) => address).filter(Boolean);
}

export async function getCmcStats(
  ids: string[]
): Promise<Record<string, CmcStats>> {
  const throttled = throttle(async (_ids: string[]) => {
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

  const responses = await Promise.all(
    chunk(ids, CMC_IDS_PER_REQ).map(throttled)
  );

  return merge(responses);
}

export function statsToTokenInfo(
  tokenInfo: CmcCoin,
  cmcTokenStats: CmcStats
): CmcCoinWithStats {
  return {
    ...tokenInfo,
    liquidity: 0,
    volume: cmcTokenStats.quote.USD.volume_24h.toString(),
    volumeChangePercentage24h: cmcTokenStats.quote.USD.volume_change_24h,
    circulatingSupply: cmcTokenStats.circulating_supply.toString(),
    marketCap:
      cmcTokenStats.quote.USD.market_cap?.toString() ||
      cmcTokenStats.self_reported_market_cap?.toString() ||
      '',
    price: cmcTokenStats.quote.USD.price.toString(),
    priceChangePercentage1h: cmcTokenStats.quote.USD.percent_change_1h,
    priceChangePercentage24h: cmcTokenStats.quote.USD.percent_change_24h,
  };
}
