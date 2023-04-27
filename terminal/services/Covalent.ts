import {get, set} from 'lodash';
import Redis from 'ioredis';
import {InjectRedisClient} from 'nestjs-ioredis-tags';
import got from 'got';
import md5 from 'md5';
import {CovalentStatsLiquidityQuery} from '../types/Covalent/CovalentStatsTransfersQuery';
import {REDIS_TAG} from '../constants';

export class CovalentService {

  awaiterStatsLiquidityList: {
    [k: string]: boolean
  } = {};

  constructor(
    @InjectRedisClient(REDIS_TAG) private readonly redisClient: Redis
  ) {
  }

  async statsLiquidity(btcAddress?: string, ethAddress?: string, update = false): Promise<any> {
    const cacheKey = `cov:statsLiquidity:${md5(`${btcAddress}_${ethAddress}`)}`;
    try {
      const cache = JSON.parse(await this.redisClient.get(cacheKey) || 'null');
      if(cacheKey in this.awaiterStatsLiquidityList) {
        if(cache && !update) {
          return cache;
        }
        return [];
      }
      if(cache && !update) {
        return cache;
      }
      if(!(cacheKey in this.awaiterStatsLiquidityList)) {
        this.awaiterStatsLiquidityList[cacheKey] = true;
      }
      const data: Promise<{
        eth?: { [date: string]: number }
        bsc?: { [date: string]: number }
      }> = Object.fromEntries((await Promise.all(Object.entries({
        btcAddress,
        ethAddress
      }).map(async ([key, token]) => {
        switch(key) {
          case 'btcAddress': {
            return ['btc', token ? await this.getStatsLiquidity({
              chain: '56',
              dex: 'pancakeswap_v2',
              token
            }) : undefined];
          }
          case 'ethAddress': {
            return ['eth', token ? await this.getStatsLiquidity({
              chain: '1',
              dex: 'uniswap_v2',
              token
            }) : undefined];
          }
        }
      }))).filter(([, data]) => data));
      const map = {};
      Object.values(data)
      .forEach((items: { [date: string]: number }) => {
        Object.entries(items).forEach(([date, value]) => {
          set(map, date,
            value + get(map, date, 0)
          );
        });
      });
      const result = Object.entries(map)
      .map(([date, amount]: [string, number]) => ({date, amount}))
      .sort((a, b) => {
        return String(a.date).localeCompare(String(b.date), undefined, {
          numeric: true,
          sensitivity: 'base'
        });
      });
      await this.redisClient.set(cacheKey, JSON.stringify(result), 'PX', 24 * 60 * 60 * 1000);
      if(cacheKey in this.awaiterStatsLiquidityList) {
        delete this.awaiterStatsLiquidityList[cacheKey];
      }
      return result;
    } catch(e) {
      if(cacheKey in this.awaiterStatsLiquidityList) {
        delete this.awaiterStatsLiquidityList[cacheKey];
      }
    }
    return [];
  }

  private async getStatsLiquidity({chain, dex, token}: {
    chain: '1' | '56',
    dex: 'uniswap_v2' | 'pancakeswap_v2',
    token: string
  }): Promise<{ [date: string]: number }> {
    let page = 0;
    const summaryChart: { [date: string]: number } = {};
    while(true) {
      try {
        const {
          data: {
            items: liquiditySources,
            pagination: {
              has_more
            }
          }
        } = await got.get<CovalentStatsLiquidityQuery>(`https://api.covalenthq.com/v1/${chain}/xy=k/${dex}/tokens/address/${token}/`, {
          searchParams: {
            'quote-currency': 'USD',
            format: 'JSON',
            'page-number': page,
            'page-size': 500,
            key: 'ckey_65c7c5729a7141889c2cdea0556'
          },
          resolveBodyOnly: true,
          responseType: 'json'
        });
        const tokenLiquidityCharts = liquiditySources.map((ls) => ls.liquidity_timeseries_30d);
        tokenLiquidityCharts.forEach(tokenLiquidityChart => {
          tokenLiquidityChart.forEach((l) => {
            const date = String(l.dt).split('T').shift();
            set(summaryChart, date,
              l.liquidity_quote + get(summaryChart, date, 0)
            );
          });
        });
        if(!has_more) {
          break;
        } else {
          page++;
        }
      } catch(e) {
        console.error(get(e, 'message', e));
        break;
      }
    }
    return summaryChart;
  }
}
