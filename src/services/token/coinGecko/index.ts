import got from 'got';
import pThrottle from 'p-throttle';

import { chunk, merge } from 'lodash-es';
import {
  CoinGeckoExchangesResponse,
  CoinGeckoStatsResponse,
  CoinsListResponse,
  CoinsPairsResponse,
  PoolStatsResponse,
  PricesStatsResponse,
} from './types';
import {
  coingeckoNetworksMapper,
  invertedCoingeckoNetworksMapper,
} from './constants';

export async function getCoinGeckoCoins(): Promise<CoinsListResponse> {
  const { body } = await got.get<CoinsListResponse>(
    'https://api.coingecko.com/api/v3/coins/list',
    { searchParams: { include_platform: true }, responseType: 'json' }
  );

  return body;
}

export const getCoinGeckoPairs = pThrottle({ limit: 1, interval: 1000 })(
  async (
    coinGeckoNetwork: string,
    tokenAddress: string
  ): Promise<CoinsPairsResponse> => {
    const { body } = await got.get<CoinsPairsResponse>(
      `https://api.geckoterminal.com/api/v2/networks/${coinGeckoNetwork}/tokens/${tokenAddress}/pools`,
      {
        responseType: 'json',
        timeout: 3000,
        searchParams: { include: 'base_token,quote_token' },
      }
    );

    return body;
  }
);

export async function getCoinGeckoExchanges(
  coinGeckoNetwork: string
): Promise<CoinGeckoExchangesResponse> {
  const { body } = await got.get<CoinGeckoExchangesResponse>(
    `https://api.geckoterminal.com/api/v2/networks/${coinGeckoNetwork}/dexes`,
    { responseType: 'json' }
  );

  return body;
}

const PER_PAGE = 200;

const throttledCoinGeckoMarkets = pThrottle({ interval: 60 * 1000, limit: 1 })(
  async (page: number, order: 'market_cap_desc' | 'volume_desc') => {
    const { body } = await got.get<CoinGeckoStatsResponse>(
      'https://api.coingecko.com/api/v3/coins/markets',
      {
        timeout: 10000,
        searchParams: {
          vs_currency: 'usd',
          per_page: PER_PAGE,
          page,
          order,
          // sparkline: false,
          price_change_percentage: '1h,24h,7d',
          // locale: 'en',
        },
        responseType: 'json',
      }
    );
    return body;
  }
);

export async function getCoinGeckoCoinsWithStats(
  limit: number,
  order: 'market_cap_desc' | 'volume_desc'
): Promise<CoinGeckoStatsResponse> {
  const responses = await Promise.all(
    Array.from({ length: limit / PER_PAGE }, (_, i) => i + 1).map((l) =>
      throttledCoinGeckoMarkets(l, order)
    )
  );

  return responses.flat();
}

const throttledCoinGeckoPrices = pThrottle({ interval: 10 * 1000, limit: 1 })(
  async (ids: string[]) => {
    const { body } = await got.get<PricesStatsResponse>(
      'https://api.coingecko.com/api/v3/simple/price',
      {
        timeout: 10000,
        searchParams: {
          ids: ids.join(','),
          vs_currencies: 'usd,btc,eth',
          include_24hr_change: true,
        },
        responseType: 'json',
      }
    );
    return body;
  }
);

export async function getCoinGeckoCoinsPrices(
  ids: string[]
): Promise<PricesStatsResponse> {
  const responses = await Promise.all(
    chunk(ids, PER_PAGE).map(throttledCoinGeckoPrices)
  );

  /* @ts-ignore */
  return merge(...responses);
}

export const getPoolInfo = pThrottle({ limit: 2, interval: 4000 })(
  async (coinGeckoNetwork: string, poolAddress: string, baseToken: number) => {
    try {
      const { body } = await got.get<PoolStatsResponse>(
        `https://app.geckoterminal.com/api/p1/${coinGeckoNetwork}/pools/${poolAddress}`,
        {
          responseType: 'json',
          searchParams: { base_token: baseToken },
          timeout: 3000,
        }
      );

      return {
        tradesCount: body.data.attributes.historical_data.last_24h.swaps_count,
        buysCount:
          body.data.attributes.historical_data.last_24h.buy_swaps_count,
        sellsCount:
          body.data.attributes.historical_data.last_24h.sell_swaps_count,
        volume: body.data.attributes.historical_data.last_24h.volume_in_usd,
        liquidity: body.data.attributes.reserve_in_usd,
        price: body.data.attributes.price_in_usd,
        priceChangePercentage24h:
          Number.parseFloat(
            body.data.attributes.price_percent_changes.last_24h.slice(0, -1)
          ) || 0,
      };
    } catch {
      throw new Error(
        `Failed to get info about token ${baseToken}, pool ${poolAddress} in ${coinGeckoNetwork}`
      );
    }
  }
);

export { coingeckoNetworksMapper, invertedCoingeckoNetworksMapper };
