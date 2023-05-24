import got from 'got';
import pThrottle from 'p-throttle';

import {
  CoinGeckoExchangesResponse,
  CoinGeckoStatsResponse,
  CoinsListResponse,
  CoinsPairsResponse,
  PoolStatsResponse,
} from './types';

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
      { responseType: 'json' }
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
  async (page: number) => {
    const { body } = await got.get<CoinGeckoStatsResponse>(
      'https://api.coingecko.com/api/v3/coins/markets',
      {
        timeout: 10000,
        searchParams: {
          vs_currency: 'usd',
          per_page: PER_PAGE,
          page,
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
  limit: number
): Promise<CoinGeckoStatsResponse> {
  const responses = await Promise.all(
    Array.from({ length: limit / PER_PAGE }, (_, i) => i + 1).map(
      throttledCoinGeckoMarkets
    )
  );

  return responses.flat();
}

export async function getPoolInfo(
  coinGeckoNetwork: string,
  poolAddress: string,
  baseToken: number
) {
  try {
    const { body } = await got.get<PoolStatsResponse>(
      `https://app.geckoterminal.com/api/p1/${coinGeckoNetwork}/pools/${poolAddress}`,
      {
        responseType: 'json',
        searchParams: { base_token: baseToken },
      }
    );

    return {
      tradesCount: body.data.attributes.historical_data.last_24h.swaps_count,
      buysCount: body.data.attributes.historical_data.last_24h.buy_swaps_count,
      sellsCount:
        body.data.attributes.historical_data.last_24h.sell_swaps_count,
      volume: body.data.attributes.historical_data.last_24h.volume_in_usd,
      liquidity: body.data.attributes.reserve_in_usd,
      price: body.data.attributes.price_in_usd,
      priceChangePercentage24h: Number.parseFloat(
        body.data.attributes.price_percent_changes.last_24h.slice(0, -1)
      ),
    };
  } catch {
    throw new Error(
      `Failed to get info about token ${baseToken}, pool ${poolAddress} in ${coinGeckoNetwork}`
    );
  }
}
