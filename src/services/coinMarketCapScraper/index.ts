import { get, uniqBy } from 'lodash-es';
import Redis from 'ioredis';
import { Inject, Injectable } from '@nestjs/common';
import md5 from 'md5';
import { proxyRequest } from 'helpers/proxyRequest';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Logger } from '../../config/logger/api-logger';
import { Network, TransactionsResponse } from '../../dto/coinMarketCapScraper';
import { CmcPairListResponse } from '../../types';
import {
  CMC_ID_BTC_PLATFORM,
  CMC_ID_ETH_PLATFORM,
  CMC_USER_AGENT,
  REDIS_TAG,
} from '../../constants';
import { BitQueryService } from '../BitQuery';
import { CovalentService } from '../covalent';
import { CmcCoinWithStats, CmcCoins, CmcToken } from './types';
import {
  getCmcStats,
  getCmcTokens,
  getPancakeswapTokenContracts,
  getUniswapTokenContracts,
  isValidStats,
  statsToTokenInfo,
} from './helpers';

const DEFAULT_AWAIT_TIME: number = 0.65 * 1000;

@Injectable()
export class CoinMarketCapScraperService {
  awaiterPairsList: {
    [k: string]: boolean;
  } = {};

  awaitTime: number = DEFAULT_AWAIT_TIME;

  constructor(
    @InjectRedis(REDIS_TAG) private readonly redisClient: Redis,
    @Inject(BitQueryService) private readonly bitQueryService: BitQueryService,
    @Inject(CovalentService) private readonly covalentService: CovalentService
  ) {}

  public async onModuleInit(): Promise<void> {
    try {
      await this.getFilteredTokens(
        await getPancakeswapTokenContracts(),
        'cmc:getPancakeswapTokens'
      );

      await this.getFilteredTokens(
        await getUniswapTokenContracts(),
        'cmc:getUniswapTokens'
      );
    } catch (e) {
      Logger.error(e?.message || e);
    }
  }

  async tokens(
    networks: Network[] = [Network.bsc, Network.eth]
  ): Promise<CmcToken[]> {
    const panTokens = networks.includes(Network.bsc)
      ? await this.getFilteredTokens(
          await getPancakeswapTokenContracts(),
          'cmc:getPancakeswapTokens'
        )
      : {};

    const uniTokens = networks.includes(Network.eth)
      ? await this.getFilteredTokens(
          await getUniswapTokenContracts(),
          'cmc:getUniswapTokens'
        )
      : {};

    return uniqBy(
      [...Object.entries(panTokens), ...Object.entries(uniTokens)],
      0
    ).map(([id, tokenInfo]) => ({
      ...tokenInfo,
      id,
      cmcId: Number.parseInt(id, 10),
      logoURI: `https://s2.coinmarketcap.com/static/img/coins/64x64/${id}.png`,
      volume: Number.parseFloat(tokenInfo.volume),
      circulatingSupply: Number.parseFloat(tokenInfo.circulatingSupply),
      marketCap: Number.parseFloat(tokenInfo.marketCap),
      price: Number.parseFloat(tokenInfo.price),
    }));
  }

  async pairsInfo(
    platform: string,
    pairs: string[]
  ): Promise<{
    [k: string]: unknown;
  }> {
    const cacheKey = `cmc:pairInfo:${platform}:${md5(pairs.join(','))}`;
    const cache = await this.redisClient.get(cacheKey);

    if (cache) {
      return JSON.parse(cache);
    }

    const result = {};

    await Promise.all(
      pairs.map(async (pair) => {
        const body = await proxyRequest(
          {
            headers: {
              'user-agent': CMC_USER_AGENT,
              'accept-encoding': 'gzip, deflate, br',
            },
            searchParams: {
              base: 0,
              t: new Date().getTime(),
              'dexer-platform-name': platform,
              address: pair,
            },
            responseType: 'json',
          },
          `https://api.coinmarketcap.com/dexer/v3/dexer/pair-info`
        );

        const data = get(body, 'data') as any;
        if (data) {
          result[data.address] = data;
        }
      })
    );

    if (pairs.length === Object.keys(result).length) {
      await this.redisClient.set(
        cacheKey,
        JSON.stringify(result),
        'PX',
        30 * 24 * 60 * 60 * 1000
      );
    }

    return result;
  }

  async pairsList(address: string, platform: number): Promise<any> {
    const cacheKey = `cmc:pairList:${platform}:${md5(address)}`;
    if (cacheKey in this.awaiterPairsList) {
      return [];
    }

    const cache = await this.redisClient.get(cacheKey);
    if (cache) {
      return JSON.parse(cache);
    }

    if (!(cacheKey in this.awaiterPairsList)) {
      this.awaiterPairsList[cacheKey] = true;
    }

    try {
      const getData = async (
        params,
        prev: CmcPairListResponse['data']
      ): Promise<CmcPairListResponse['data']> => {
        const { data } = await proxyRequest<CmcPairListResponse>(
          {
            headers: {
              'user-agent': CMC_USER_AGENT,
              'accept-encoding': 'gzip, deflate, br',
            },
            searchParams: params,
            responseType: 'json',
          },
          `https://api.coinmarketcap.com/dexer/v3/dexer/pair-list`
        );

        return !data?.length
          ? prev
          : getData(
              {
                ...params,
                start: params.start + 100,
              },
              [...prev, ...data]
            );
      };

      const data = await getData(
        {
          'base-address': address,
          start: 1,
          limit: 100,
          'platform-id': platform,
        },
        []
      );

      const result = data
        ?.filter((item) => item.platform.id === platform)
        .sort((a, b) => Number(b.volume24h) - Number(a.volume24h));

      if (data) {
        await this.redisClient.set(
          cacheKey,
          JSON.stringify(result),
          'PX',
          30 * 24 * 60 * 60 * 1000
        );
      }

      if (cacheKey in this.awaiterPairsList) {
        delete this.awaiterPairsList[cacheKey];
      }

      return result;
    } catch (e) {
      if (cacheKey in this.awaiterPairsList) {
        delete this.awaiterPairsList[cacheKey];
      }
    }

    return [];
  }

  async transactions(
    btcPairs: string[],
    ethPairs: string[]
  ): Promise<TransactionsResponse['data']['transactions']> {
    const pairs: {
      [k: string]: TransactionsResponse['data']['transactions'];
    } = Object.fromEntries(
      await Promise.all(
        [
          ...btcPairs.map((pairId) => [CMC_ID_BTC_PLATFORM, pairId]),
          ...ethPairs.map((pairId) => [CMC_ID_ETH_PLATFORM, pairId]),
        ].map(async ([key, params]) => {
          const [pairId, reversOrder, from] = String(params).split('_');
          const {
            data: { transactions },
          } = await proxyRequest<TransactionsResponse>({
            headers: {
              'user-agent': CMC_USER_AGENT,
              'accept-encoding': 'gzip, deflate, br',
            },
            url: 'https://api.coinmarketcap.com',
            pathname: `/kline/v3/k-line/transactions/${key}/${pairId}`,
            searchParams: from
              ? {
                  'reverse-order': reversOrder === 'true',
                  from,
                }
              : {
                  'reverse-order': reversOrder === 'true',
                },
            responseType: 'json',
          });
          return [
            pairId,
            transactions.map((_) => ({
              pairId,
              exchange: key === CMC_ID_BTC_PLATFORM ? 'pancakeswap' : 'uniswap',
              ..._,
            })),
          ];
        })
      )
    );

    const pairsIds = Object.keys(pairs);

    const lastTime = pairsIds.reduce((prev, pairId) => {
      const transactions = pairs[pairId];
      const lastElementTime = Number(get(transactions.at(-1), 'time'));

      if (Number.isNaN(prev)) {
        return lastElementTime;
      }

      return lastElementTime < prev ? lastElementTime : prev;
    }, NaN);

    return Number.isNaN(lastTime)
      ? []
      : Object.values(pairs)
          .reduce((prev, transactions) => {
            const filtered = transactions.filter(
              (transaction) => Number(transaction.time) >= lastTime
            );
            return [...prev, ...filtered];
          }, [])
          .sort((a, b) => Number(b.time) - Number(a.time));
  }

  private async getFilteredTokens(
    allowedContracts: string[],
    cacheKey: string
  ): Promise<CmcCoins> {
    const cache = await this.redisClient.get(cacheKey);

    if (cache) {
      const parsed = JSON.parse(cache);

      if (Object.keys(parsed).length) {
        return parsed;
      }
    }

    Logger.debug(`waiting for: ${cacheKey}...`);

    const uniTokenContractsSet = new Set(
      allowedContracts.map((contract) => contract.toLowerCase())
    );

    const cmcTokens = await getCmcTokens();

    const uniTokens = cmcTokens.filter(([, slug]) =>
      slug.contracts.some((contract) => uniTokenContractsSet.has(contract))
    );

    const cmcTokenStats = await getCmcStats(uniTokens.map(([id]) => id));

    const uniTokensWithStats = Object.fromEntries<CmcCoinWithStats>(
      uniTokens
        .filter(
          ([id]) => !!cmcTokenStats[id] && isValidStats(cmcTokenStats[id])
        )
        .map(([id, tokenInfo]) => [
          id,
          statsToTokenInfo(tokenInfo, cmcTokenStats[id]),
        ])
    );

    await this.redisClient.set(
      cacheKey,
      JSON.stringify(uniTokensWithStats),
      'PX',
      24 * 60 * 60 * 1000
    );

    return uniTokensWithStats;
  }
}
