import { get, set } from 'lodash-es';
import Redis from 'ioredis';
import md5 from 'md5';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { REDIS_TAG } from '../../constants';
import { getStatsLiquidity } from './helper';

export class CovalentService {
  awaiterStatsLiquidityList: {
    [k: string]: boolean;
  } = {};

  constructor(@InjectRedis(REDIS_TAG) private readonly redisClient: Redis) {}

  async statsLiquidity(
    btcAddress?: string,
    ethAddress?: string,
    update = false
  ): Promise<any> {
    const cacheKey = `cov:statsLiquidity:${md5(`${btcAddress}_${ethAddress}`)}`;

    try {
      const cache = JSON.parse(
        (await this.redisClient.get(cacheKey)) || 'null'
      );

      if (cacheKey in this.awaiterStatsLiquidityList) {
        if (cache && !update) {
          return cache;
        }
        return [];
      }

      if (cache && !update) {
        return cache;
      }

      if (!(cacheKey in this.awaiterStatsLiquidityList)) {
        this.awaiterStatsLiquidityList[cacheKey] = true;
      }

      const data: {
        eth?: { [date: string]: number };
        bsc?: { [date: string]: number };
      } = Object.fromEntries(
        (
          await Promise.all(
            Object.entries({
              btcAddress,
              ethAddress,
            }).map(async ([key, token]) => {
              switch (key) {
                case 'btcAddress': {
                  return [
                    'btc',
                    token
                      ? await getStatsLiquidity({
                          chain: '56',
                          dex: 'pancakeswap_v2',
                          token,
                        })
                      : undefined,
                  ];
                }
                case 'ethAddress': {
                  return [
                    'eth',
                    token
                      ? await getStatsLiquidity({
                          chain: '1',
                          dex: 'uniswap_v2',
                          token,
                        })
                      : undefined,
                  ];
                }
                default:
                  throw new Error('Invalid address type');
              }
            })
          )
        ).filter(([, d]) => d)
      );

      const map = {};

      Object.values(data).forEach((items: { [date: string]: number }) => {
        Object.entries(items).forEach(([date, value]) => {
          set(map, date, value + get(map, date, 0));
        });
      });

      const result = Object.entries(map)
        .map(([date, amount]: [string, number]) => ({ date, amount }))
        .sort((a, b) =>
          String(a.date).localeCompare(String(b.date), undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        );

      await this.redisClient.set(
        cacheKey,
        JSON.stringify(result),
        'PX',
        24 * 60 * 60 * 1000
      );

      if (cacheKey in this.awaiterStatsLiquidityList) {
        delete this.awaiterStatsLiquidityList[cacheKey];
      }

      return result;
    } catch (e) {
      if (cacheKey in this.awaiterStatsLiquidityList) {
        delete this.awaiterStatsLiquidityList[cacheKey];
      }
    }

    return [];
  }
}
