import got from 'got';
import pThrottle from 'p-throttle';

import {
  CoinGeckoExchangesResponse,
  CoinGeckoStatsResponse,
  CoinsListResponse,
  CoinsPairsResponse,
} from './types';

export async function getCoinGeckoCoins(): Promise<CoinsListResponse> {
  const { body } = await got.get<CoinsListResponse>(
    'https://api.coingecko.com/api/v3/coins/list',
    { searchParams: { include_platform: true }, responseType: 'json' }
  );

  return body;
}

export async function getCoinGeckoPairs(
  coinGeckoNetwork: string,
  tokenAddress: string
): Promise<CoinsPairsResponse> {
  const { body } = await got.get<CoinsPairsResponse>(
    `https://api.geckoterminal.com/api/v2/networks/${coinGeckoNetwork}/tokens/${tokenAddress}/pools`,
    { responseType: 'json' }
  );

  return body;
}

export async function getCoinGeckoExchanges(
  coinGeckoNetwork: string
): Promise<CoinGeckoExchangesResponse> {
  const { body } = await got.get<CoinGeckoExchangesResponse>(
    `https://api.geckoterminal.com/api/v2/networks/${coinGeckoNetwork}/dexes`,
    { responseType: 'json' }
  );

  return body;
}

export async function getCoinGeckoCoinsWithStats(
  limit: number,
  perPage = 200
): Promise<CoinGeckoStatsResponse> {
  const throttled = pThrottle({ interval: 60 * 1000, limit: 1 })(
    async (page: number) => {
      const { body } = await got.get<CoinGeckoStatsResponse>(
        'https://api.coingecko.com/api/v3/coins/markets',
        {
          searchParams: {
            vs_currency: 'usd',
            per_page: perPage,
            page,
            // sparkline: false,
            price_change_percentage: '1h,24h,7d',
            // locale: 'en',
          },
          responseType: 'json',
          headers: {
            accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7',
            'cache-control': 'max-age=0',
            'sec-ch-ua':
              '"Google Chrome";v="113", "Chromium";v="113", "Not-A.Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
          },
        }
      );
      return body;
    }
  );

  const responses = await Promise.all(
    Array.from({ length: limit / perPage }, (_, i) => i + 1).map(throttled)
  );

  return responses.flat();
}
