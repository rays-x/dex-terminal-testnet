import { chunk, get, set, take } from 'lodash-es';
import Redis from 'ioredis';
import {
  HttpException,
  HttpStatus,
  Inject,
  OnModuleInit,
} from '@nestjs/common';
import Typegoose from '@typegoose/typegoose';
import { InjectModel } from 'nestjs-typegoose';
import { addDays, differenceInDays, format } from 'date-fns';
import { Types } from 'mongoose';
import md5 from 'md5';
import { proxyRequest } from 'helpers/proxyRequest';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { awaiter, promiseMap } from '../../utils';
import {
  CMC_ID_USD_COIN,
  CMC_USER_AGENT,
  REDIS_TAG,
  TOKEN_CHAIN_IDS,
} from '../../constants';
import { BitQueryService } from '../BitQuery';
import { TokenCMCTokenInfoResponse } from '../../types/Token/TokenCMCTokenInfoResponse';
import TokenEntity, {
  TokenEntityDefaultPopulate,
  TokenEntityDefaultSelect,
  TokenEntityDetailPopulate,
  TokenEntityPlatformPopulate,
} from '../../entities/Token/Token';
import TokenTagEntity from '../../entities/Token/TokenTag';
import PlatformEntity, {
  PlatformEntityDefaultPopulateSelect,
} from '../../entities/Platform';
import { Logger } from '../../config/logger/api-logger';
import {
  NewQueryTokensDto,
  TokenPaginationDto,
  TokensSortBy,
  TokensSortOrder,
  TransactionsResponse,
} from '../../dto/coinMarketCapScraper';
import { CmcToken } from '../coinMarketCapScraper/types';
import TokenHistoryEntity, {
  TokenHistoryEntityHoldersSelect,
  TokenHistoryEntitySwapsSelect,
  TokenHistoryEntityTradersSelect,
  TokenHistoryEntityTransfersSelect,
} from '../../entities/Token/History/TokenHistory';
import { CoinMarketCapHistoricalResponse } from '../../types/CoinMarketCap/CoinMarketCapHistoricalResponse';
import { TokenVolumeItem } from '../../types/Token/TokenVolumeItem';
import { CmcPairListResponse } from '../../types';
import PairEntity, {
  PairEntityBasePopulate,
  PairEntityDefaultSelect,
  PairEntityDexPopulate,
  PairEntityPlatformPopulate,
  PairEntityQuotePopulate,
} from '../../entities/Pair/Pair';
import DexEntity from '../../entities/Dex';
import { TokenPairItem } from '../../types/Token/TokenPairItem';
import { TokenCMCPlatformsResponse } from '../../types/Token/TokenCMCPlatformsResponse';
import { TokenCMCPlatformDexsResponse } from '../../types/Token/TokenCMCPlatformDexsResponse';
import PairHistoryEntity, {
  PairHistoryEntityDefaultSelect,
} from '../../entities/Pair/PairHistory';
import { PairLiquidityItem } from '../../types/Token/PairLiquidityItem';
import { HttpStatusMessages } from '../../messages/http';
import { TokenTransfersItem } from '../../types/Token/TokenTransfersItem';
import { TokenSwapsItem } from '../../types/Token/TokenSwapsItem';
import { TokenHoldersItem } from '../../types/Token/TokenHoldersItem';
import { getRange } from '../../utils/diff';
import { TokenTradersItem } from '../../types/Token/TokenTradersItem';

const DEFAULT_AWAIT_TIME: number = 0.65 * 1000;

const getDateDaysAgoArraysBy100 = (date: Date) => {
  const until = new Date(`${format(new Date(), 'yyyy-MM-dd')}T00:00:00.000Z`);
  const daysDiff = differenceInDays(until, date);
  const result = Array.from({ length: daysDiff })
    .map(
      (_, i) =>
        `${format(
          addDays(new Date(until), -(i + 1)),
          'yyyy-MM-dd'
        )}T00:00:00.000Z`
    )
    .reverse();
  return chunk(result, 100);
};

export class TokenService implements OnModuleInit {
  awaitTime: number = DEFAULT_AWAIT_TIME;

  sharedFilter = {
    slug: {
      $exists: true,
    },
    $or: [
      {
        volume: { $exists: true, $ne: 0 },
      },
      {
        volumeChangePercentage24h: { $exists: true, $ne: 0 },
      },
      {
        'statistics.priceChangePercentage1h': { $exists: true, $ne: 0 },
      },
      {
        'statistics.priceChangePercentage24h': { $exists: true, $ne: 0 },
      },
      {
        'statistics.marketCap': { $exists: true, $ne: 0 },
      },
      {
        'statistics.marketCapChangePercentage24h': { $exists: true, $ne: 0 },
      },
    ],
    volume: { $exists: true, $ne: 0 },
    platforms: {
      $elemMatch: {
        platform: {
          $in: TOKEN_CHAIN_IDS,
        },
      },
      $exists: true,
      $type: 'array',
      $ne: [],
    },
  };

  constructor(
    @InjectRedis(REDIS_TAG) private readonly redisClient: Redis,
    @InjectModel(TokenEntity)
    private readonly repoToken: Typegoose.ReturnModelType<typeof TokenEntity>,
    @InjectModel(TokenTagEntity)
    private readonly repoTokenTag: Typegoose.ReturnModelType<
      typeof TokenTagEntity
    >,
    @InjectModel(PlatformEntity)
    private readonly repoPlatform: Typegoose.ReturnModelType<
      typeof PlatformEntity
    >,
    @InjectModel(TokenHistoryEntity)
    private readonly repoTokenHistory: Typegoose.ReturnModelType<
      typeof TokenHistoryEntity
    >,
    @InjectModel(PairEntity)
    private readonly repoPair: Typegoose.ReturnModelType<typeof PairEntity>,
    @InjectModel(PairHistoryEntity)
    private readonly repoPairHistory: Typegoose.ReturnModelType<
      typeof PairHistoryEntity
    >,
    @InjectModel(DexEntity)
    private readonly repoDex: Typegoose.ReturnModelType<typeof DexEntity>,
    @Inject(BitQueryService) private readonly bitQueryService: BitQueryService
  ) {}

  async onModuleInit() {
    promiseMap(
      [
        // this.syncTokens,
        // this.syncTokensHistory,
        // this.syncPlatforms,
        // this.syncDexs,
        // this.syncPairs,
        // this.syncTokenTransfers,
        // this.syncTokenSwaps,
        // this.syncTokenHolders,
        // this.syncTradersVolume,
      ],
      async (start) => {
        try {
          await start(this);
        } catch (e) {
          Logger.error(get(e, 'message', e));
        }
      }
    );
  }

  public async tokens({
    chains: _chainIds,
    search: _search,
    limit,
    offset,
    sortBy,
    sortOrder,
  }: NewQueryTokensDto): Promise<{
    tokens: CmcToken[];
    tokensCount: number;
  }> {
    const chainIds = _chainIds.length ? _chainIds : TOKEN_CHAIN_IDS;
    const search = _search?.toLowerCase();
    const filterShared = {
      ...this.sharedFilter,
      platforms: {
        ...this.sharedFilter.platforms,
        $elemMatch: {
          platform: {
            $in: chainIds,
          },
        },
      },
    };
    const filter = search
      ? {
          $and: [
            {
              $or: [
                {
                  name: {
                    $regex: new RegExp(search, 'i'),
                  },
                },
                {
                  symbol: {
                    $regex: new RegExp(search, 'i'),
                  },
                },
                {
                  platforms: {
                    $elemMatch: {
                      address: {
                        $regex: new RegExp(search, 'i'),
                      },
                    },
                  },
                },
              ],
            },
            {
              ...filterShared,
            },
          ],
        }
      : filterShared;

    const [tokens, tokensCount] = await Promise.all([
      this.repoToken
        .find(filter)
        .populate(TokenEntityDefaultPopulate)
        .skip(Number(offset))
        .limit(Number(limit))
        .sort(
          (() =>
            `${sortOrder === TokensSortOrder.desc ? '-' : ''}${(() => {
              switch (sortBy) {
                case TokensSortBy.volume: {
                  return 'volume';
                }
                case TokensSortBy.volumeChangePercentage24h: {
                  return 'volumeChangePercentage24h';
                }
                case TokensSortBy.marketCap: {
                  return 'statistics.marketCap';
                }
                case TokensSortBy.liquidity: {
                  return 'statistics.fullyDilutedMarketCap';
                }
                case TokensSortBy.circulatingSupply: {
                  return 'statistics.circulatingSupply';
                }
                case TokensSortBy.price: {
                  return 'statistics.price';
                }
                case TokensSortBy.priceChangePercentage1h: {
                  return 'statistics.priceChangePercentage1h';
                }
                case TokensSortBy.priceChangePercentage24h: {
                  return 'statistics.priceChangePercentage24h';
                }
                // case TokensSortBy.symbol:
                default: {
                  return 'symbol';
                }
              }
            })()}`)()
        )
        .select(TokenEntityDefaultSelect),
      this.repoToken.count(filter),
    ]);
    return {
      tokens: tokens.map((data) => ({
        id: data.id,
        slug: data.slug,
        name: data.name,
        symbol: data.symbol,
        logoURI: `https://s2.coinmarketcap.com/static/img/coins/64x64/${data.cmc}.png`,
        liquidity: data.statistics.fullyDilutedMarketCap,
        volume: data.volume,
        volumeChangePercentage24h: data.volumeChangePercentage24h,
        circulatingSupply:
          Number(data.statistics.circulatingSupply) ||
          Number(data.selfReportedCirculatingSupply || 0),
        marketCap: data.statistics.marketCap,
        price: data.statistics.price,
        priceChangePercentage1h: data.statistics.priceChangePercentage1h,
        priceChangePercentage24h: data.statistics.priceChangePercentage24h,
        cmcId: data.cmc,
        platforms: data.platforms.map(
          ({ id, address, platform: platformId }) => ({
            id,
            address,
            platformId,
          })
        ),
      })),
      tokensCount,
    };
  }

  public async token(slug: string): Promise<any> {
    const token = (
      await this.repoToken
        .findOne({ slug })
        .select([...TokenEntityDefaultSelect, 'cmcAdded'])
        .populate(TokenEntityDetailPopulate)
    )?.toJSON();
    if (!token) {
      throw new HttpException(
        HttpStatusMessages.NOT_FOUND,
        HttpStatus.NOT_FOUND
      );
    }
    const { cmcAdded, ...result } = token;
    return {
      ...result,
      dateLaunched: result.dateLaunched || cmcAdded,
    };
  }

  public async volume(
    token: Types.ObjectId,
    { limit, offset }: TokenPaginationDto
  ): Promise<{
    items: TokenVolumeItem[];
    count: number;
  }> {
    const cacheKey = `token:volume:${token}`;
    const cache = JSON.parse((await this.redisClient.get(cacheKey)) || 'null');
    if (cache) {
      return cache;
    }
    const filter = {
      token,
    };
    const [items, count] = await Promise.all([
      this.repoTokenHistory
        .find(filter)
        .skip(Number(offset))
        .limit(Number(limit) || Infinity)
        .sort('-date')
        .select(['_id', 'date', 'volume']),
      this.repoTokenHistory.count(filter),
    ]);
    const result = {
      items,
      count,
    };
    await this.redisClient.set(
      cacheKey,
      JSON.stringify(result),
      'PX',
      24 * 60 * 60 * 1000
    );
    return result;
  }

  public async transfers(
    token: Types.ObjectId,
    { limit, offset }: TokenPaginationDto
  ): Promise<{
    items: TokenTransfersItem[];
    count: number;
  }> {
    const cacheKey = `token:transfers:${token}`;
    const cache = JSON.parse((await this.redisClient.get(cacheKey)) || 'null');
    if (cache) {
      return cache;
    }
    const filter = {
      token,
      transfers: {
        $exists: true,
        $type: 'object',
        $ne: {},
      },
    };
    const [items, count] = await Promise.all([
      this.repoTokenHistory
        .find(filter)
        .skip(Number(offset))
        .limit(Number(limit) || Infinity)
        .sort('-date')
        .select(TokenHistoryEntityTransfersSelect),
      this.repoTokenHistory.count(filter),
    ]);
    const result = {
      items: items.map((item) => {
        const { id, date, transfers } = item.toJSON();
        return {
          id,
          date,
          ...transfers,
        };
      }),
      count,
    };
    await this.redisClient.set(
      cacheKey,
      JSON.stringify(result),
      'PX',
      24 * 60 * 60 * 1000
    );
    return result;
  }

  public async swaps(
    token: Types.ObjectId,
    { limit, offset }: TokenPaginationDto
  ): Promise<{
    items: TokenSwapsItem[];
    count: number;
  }> {
    const cacheKey = `token:swaps:${token}`;
    const cache = JSON.parse((await this.redisClient.get(cacheKey)) || 'null');
    if (cache) {
      return cache;
    }
    const filter = {
      token,
      swaps: {
        $exists: true,
      },
    };
    const [items, count] = await Promise.all([
      this.repoTokenHistory
        .find(filter)
        .skip(Number(offset))
        .limit(Number(limit) || Infinity)
        .sort('-date')
        .select(TokenHistoryEntitySwapsSelect),
      this.repoTokenHistory.count(filter),
    ]);
    const result = {
      items: items.map((item) => {
        const { id, date, swaps } = item.toJSON();
        return {
          id,
          date,
          ...swaps,
        };
      }),
      count,
    };
    await this.redisClient.set(
      cacheKey,
      JSON.stringify(result),
      'PX',
      24 * 60 * 60 * 1000
    );
    return result;
  }

  public async holders(
    token: Types.ObjectId,
    { limit, offset }: TokenPaginationDto
  ): Promise<{
    items: TokenHoldersItem[];
    count: number;
  }> {
    const cacheKey = `token:holders:${token}`;
    const cache = JSON.parse((await this.redisClient.get(cacheKey)) || 'null');
    if (cache) {
      return cache;
    }
    const filter = {
      token,
      holders: {
        $exists: true,
      },
      'holders.count': {
        $gt: 0,
      },
    };
    const [items, count] = await Promise.all([
      this.repoTokenHistory
        .find(filter)
        .skip(Number(offset))
        .limit(Number(limit) || Infinity)
        .sort('-date')
        .select(TokenHistoryEntityHoldersSelect),
      this.repoTokenHistory.count(filter),
    ]);
    const result = {
      items: items.map((item) => {
        const { id, date, holders } = item.toJSON();
        return {
          id,
          date,
          ...holders,
        };
      }),
      count,
    };
    await this.redisClient.set(
      cacheKey,
      JSON.stringify(result),
      'PX',
      24 * 60 * 60 * 1000
    );
    return result;
  }

  public async traders(
    token: Types.ObjectId,
    { limit, offset }: TokenPaginationDto
  ): Promise<{
    items: TokenTradersItem[];
    count: number;
  }> {
    const cacheKey = `token:traders:${token}`;
    const cache = JSON.parse((await this.redisClient.get(cacheKey)) || 'null');
    if (cache) {
      return cache;
    }
    const filter = {
      token,
      traders: {
        $exists: true,
      },
    };
    const [items, count] = await Promise.all([
      this.repoTokenHistory
        .find(filter)
        .skip(Number(offset))
        .limit(Number(limit) || Infinity)
        .sort('-date')
        .select(TokenHistoryEntityTradersSelect),
      this.repoTokenHistory.count(filter),
    ]);
    const result = {
      items: items.map((item) => {
        const { id, date, traders } = item.toJSON();
        return {
          id,
          date,
          items: traders,
        };
      }),
      count,
    };
    await this.redisClient.set(
      cacheKey,
      JSON.stringify(result),
      'PX',
      24 * 60 * 60 * 1000
    );
    return result;
  }

  public async liquidity(
    token: Types.ObjectId,
    { limit, offset }: TokenPaginationDto
  ): Promise<{
    items: PairLiquidityItem[];
    count: number;
  }> {
    const cacheKey = `token:liquidity:${token}`;
    const cache = JSON.parse((await this.redisClient.get(cacheKey)) || 'null');
    if (cache) {
      return cache;
    }
    const pairs = (
      await this.repoPair
        .find({
          $or: [
            {
              base: token,
            },
            {
              quote: token,
            },
          ],
        })
        .select('_id')
    ).map(({ id }) => id);
    const filter = {
      pair: {
        $in: pairs,
      },
    };
    const items = (
      await this.repoPairHistory
        .find(filter)
        .skip(Number(offset))
        .limit(Number(limit) || Infinity)
        .sort('-date')
        .select(PairHistoryEntityDefaultSelect)
    )
      .map((item) => item.toJSON())
      .reduce<{ [k: string]: number }>((prev, { date: _date, liquidity }) => {
        const date = `${_date.getTime()}`;
        set(prev, date, get(prev, date, 0) + liquidity);
        return prev;
      }, {});
    const result = {
      items: Object.entries(items).map(([date, liquidity]) => ({
        id: new Types.ObjectId(),
        date: new Date(Number(date)).toISOString(),
        liquidity,
      })),
      count: Object.keys(items).length,
    };
    await this.redisClient.set(
      cacheKey,
      JSON.stringify(result),
      'PX',
      24 * 60 * 60 * 1000
    );
    return result;
  }

  public async pairs(
    token: Types.ObjectId,
    { limit, offset }: TokenPaginationDto
  ): Promise<{
    items: TokenPairItem[];
    count: number;
  }> {
    const filter = {
      $or: [
        {
          base: token,
        },
        {
          quote: token,
        },
      ],
      platform: {
        $in: TOKEN_CHAIN_IDS,
      },
    };
    const [items, count] = await Promise.all([
      this.repoPair
        .find(filter)
        .skip(Number(offset))
        .limit(Number(limit) || Infinity)
        .select(PairEntityDefaultSelect)
        .populate([
          PairEntityBasePopulate,
          PairEntityQuotePopulate,
          PairEntityDexPopulate,
          {
            path: PairEntityPlatformPopulate.path,
            select: [
              ...PlatformEntityDefaultPopulateSelect,
              'dexerTxHashFormat',
            ],
          },
        ])
        .sort('-volume24h')
        .collation({ locale: 'en_US', numericOrdering: true }),
      this.repoPair.count(filter),
    ]);
    return {
      items,
      count,
    };
  }

  public async transactions(
    token: string,
    { limit, offset }: TokenPaginationDto
  ): Promise<any> {
    const filter = {
      $or: [
        {
          base: token,
        },
        {
          quote: token,
        },
      ],
      platform: {
        $in: TOKEN_CHAIN_IDS,
      },
    };
    const pairs: {
      id: string;
      cmc: string;
      platform: number;
      reverseOrder: boolean;
    }[] = (
      await this.repoPair
        .find(filter)
        .skip(Number(offset))
        .limit(Number(limit) || Infinity)
        .select(['base', 'cmc'])
        .populate({
          path: PairEntityPlatformPopulate.path,
          select: 'cmc',
        })
        .sort('-volume24h')
        .collation({ locale: 'en_US', numericOrdering: true })
    ).map((_pair) => {
      const { base, platform, ...pair } = _pair.toJSON();
      return {
        ...pair,
        platform: get(platform, 'cmc'),
        reverseOrder: String(base) !== token,
      };
    });
    return Object.fromEntries(
      await Promise.all(
        take(pairs, 10).map(async ({ id, cmc, platform, reverseOrder }) => {
          const {
            data: { transactions },
          } = await proxyRequest<TransactionsResponse>({
            headers: {
              'user-agent': CMC_USER_AGENT,
              'accept-encoding': 'gzip, deflate, br',
            },
            url: 'https://api.coinmarketcap.com',
            pathname: `/kline/v3/k-line/transactions/${platform}/${cmc}`,
            searchParams: {
              'reverse-order': reverseOrder,
            },
            responseType: 'json',
          });
          return [id, transactions];
        })
      )
    );
  }

  private async getCmcTokens(self: TokenService): Promise<string[]> {
    await awaiter(self.awaitTime);
    const { fields, values } = await proxyRequest<{
      fields: string[];
      values: any[][];
    }>(
      { responseType: 'json' },
      'https://s3.coinmarketcap.com/generated/core/crypto/cryptos.json'
    );
    const slugIndex = fields.indexOf('slug');
    const activeIndex = fields.indexOf('is_active');
    const actives = values.filter((item) => item[activeIndex]);
    return actives.map((item) => item[slugIndex]);
  }

  private async getTokenData(
    self: TokenService,
    slug: string
  ): Promise<TokenCMCTokenInfoResponse> {
    await awaiter(self.awaitTime);
    const body = await proxyRequest<string>(
      {
        headers: {
          'user-agent': CMC_USER_AGENT,
          'accept-encoding': 'gzip, deflate, br',
        },
      },
      `https://coinmarketcap.com/currencies/${slug}/`
    );
    const regex = body.match(
      /<script id="__NEXT_DATA__" type="application\/json">(?<jsonData>.+)<\/script>/m
    );
    const data = JSON.parse(get(regex, 'groups.jsonData', 'null') || 'null');
    return get(data, 'props.pageProps.info');
  }

  private async getPlatformsData(
    self: TokenService
  ): Promise<TokenCMCPlatformsResponse['data']> {
    await awaiter(self.awaitTime);
    const body = await proxyRequest<TokenCMCPlatformsResponse>(
      {
        headers: {
          'user-agent': CMC_USER_AGENT,
          'accept-encoding': 'gzip, deflate, br',
        },
        responseType: 'json',
      },
      `https://api.coinmarketcap.com/dexer/v3/dexer/platforms`
    );
    return get(body, 'data', []).filter(
      ({ visibilityOnDexscan }) => visibilityOnDexscan
    );
  }

  private async syncTokens(self: TokenService) {
    Logger.debug(`syncTokens start`);
    const tokenSlugs = await self.getCmcTokens(self);
    if (!tokenSlugs.length) {
      return;
    }
    const tokenExists = await self.repoToken
      .find()
      .select(['slug', 'updatedAt']);
    const tokenSlugsNew = tokenSlugs.filter(
      (slug) => tokenExists.findIndex(({ slug: _ }) => _ === slug) === -1
    );
    const tokenSlugsNeedUpdate = tokenExists
      .filter(
        ({ slug, updatedAt }) =>
          tokenSlugs.indexOf(slug) !== -1 &&
          new Date(updatedAt).getTime() <
            new Date().getTime() - 1000 * 60 * 60 * 24
      )
      .map(({ slug }) => slug);
    const tokenSlugsOld = tokenExists
      .filter(({ slug }) => tokenSlugs.indexOf(slug) === -1)
      .map(({ slug }) => slug);
    Logger.debug(`tokenSlugsNew:${tokenSlugsNew.length}`);
    Logger.debug(`tokenSlugsNeedUpdate:${tokenSlugsNeedUpdate.length}`);
    Logger.debug(`tokenSlugsOld:${tokenSlugsOld.length}`);
    const tokensToDelete = (
      await self.repoToken
        .find({
          slug: {
            $in: tokenSlugsOld,
          },
        })
        .select(['id'])
    ).map(({ id }) => id);
    await Promise.all(
      tokensToDelete.map(async (tokenId) => {
        await self.repoTokenHistory.deleteMany({
          token: tokenId,
        });
        await self.repoToken.deleteOne({ _id: tokenId });
        const repoPairsToDelete = (
          await self.repoPair.find({
            $or: [
              {
                base: tokenId,
              },
              {
                quote: tokenId,
              },
            ],
          })
        ).map(({ id }) => id);
        if (!repoPairsToDelete.length) {
          return;
        }
        console.log('repoPairsToDelete', repoPairsToDelete);
        await self.repoPairHistory.deleteMany({
          pair: {
            $in: repoPairsToDelete,
          },
        });
        await self.repoPair.deleteMany({
          _id: {
            $in: repoPairsToDelete,
          },
        });
      })
    );
    const tokensToUpsert = [
      ...new Set([...tokenSlugsNew, ...tokenSlugsNeedUpdate]),
    ];
    await promiseMap(tokensToUpsert, async (slug) => {
      for (let i = 1; i < 6; i++) {
        try {
          const data = await self.getTokenData(self, slug);
          if (data) {
            try {
              const platforms = await Promise.all(
                get(data, 'platforms', []).map(
                  async ({
                    contractPlatform: name,
                    contractChainId: chainId,
                    contractAddress: address,
                    // platformCryptoId: cmcCrypto,
                    contractPlatformId: cmc,
                    contractDecimals: decimals,
                  }) => {
                    const platform = await self.repoPlatform.findOneAndUpdate(
                      {
                        cmc,
                      },
                      {
                        name,
                        cmc,
                        chainId,
                        // cmcCrypto
                      },
                      {
                        upsert: true,
                        new: true,
                      }
                    );
                    return {
                      platform: platform.id,
                      address,
                      decimals,
                    };
                  }
                )
              );
              await self.repoToken
                .findOneAndUpdate(
                  { slug },
                  {
                    cmc: data.id,
                    cmcAdded: new Date(
                      `${format(
                        new Date(data.dateAdded),
                        'yyyy-MM-dd'
                      )}T00:00:00.000Z`
                    ),
                    slug: data.slug,
                    name: data.name,
                    symbol: data.symbol,
                    category: data.category,
                    description: data.description,
                    dateLaunched: data.dateLaunched,
                    tags: await Promise.all(
                      get(data, 'tags', []).map(
                        async ({ slug: s, name, category }) => {
                          const tag = await self.repoTokenTag.findOneAndUpdate(
                            {
                              slug: s,
                            },
                            {
                              slug: s,
                              name,
                              category,
                            },
                            {
                              upsert: true,
                              new: true,
                            }
                          );
                          return {
                            tag: tag.id,
                          };
                        }
                      )
                    ),
                    urls: {
                      website: get(data, 'urls.website', []).map((link) => ({
                        link,
                      })),
                      technicalDoc: get(data, 'urls.technicalDoc', []).map(
                        (link) => ({ link })
                      ),
                      explorer: get(data, 'urls.explorer', []).map((link) => ({
                        link,
                      })),
                      sourceCode: get(data, 'urls.sourceCode', []).map(
                        (link) => ({ link })
                      ),
                      messageBoard: get(data, 'urls.messageBoard', []).map(
                        (link) => ({ link })
                      ),
                      chat: get(data, 'urls.chat', []).map((link) => ({
                        link,
                      })),
                      announcement: get(data, 'urls.announcement', []).map(
                        (link) => ({ link })
                      ),
                      reddit: get(data, 'urls.reddit', []).map((link) => ({
                        link,
                      })),
                      facebook: get(data, 'urls.facebook', []).map((link) => ({
                        link,
                      })),
                      twitter: get(data, 'urls.twitter', []).map((link) => ({
                        link,
                      })),
                    },
                    volume: data.volume,
                    volumeChangePercentage24h: data.volumeChangePercentage24h,
                    cexVolume: data.cexVolume,
                    dexVolume: data.dexVolume,
                    statistics: {
                      price: get(data, 'statistics.price'),
                      priceChangePercentage1h: get(
                        data,
                        'statistics.priceChangePercentage1h'
                      ),
                      priceChangePercentage24h: get(
                        data,
                        'statistics.priceChangePercentage24h'
                      ),
                      priceChangePercentage7d: get(
                        data,
                        'statistics.priceChangePercentage7d'
                      ),
                      marketCap: get(data, 'statistics.marketCap'),
                      marketCapChangePercentage24h: get(
                        data,
                        'statistics.marketCapChangePercentage24h'
                      ),
                      fullyDilutedMarketCap: get(
                        data,
                        'statistics.fullyDilutedMarketCap'
                      ),
                      fullyDilutedMarketCapChangePercentage24h: get(
                        data,
                        'statistics.fullyDilutedMarketCapChangePercentage24h'
                      ),
                      circulatingSupply: get(
                        data,
                        'statistics.circulatingSupply'
                      ),
                      totalSupply: get(data, 'statistics.totalSupply'),
                    },
                    platforms,
                    selfReportedTags: data.selfReportedTags,
                    selfReportedCirculatingSupply:
                      data.selfReportedCirculatingSupply,
                  },
                  {
                    upsert: true,
                    new: true,
                  }
                )
                .select(['id']);
              Logger.debug(
                `updated ${slug} ${tokensToUpsert.indexOf(slug) + 1} of ${
                  tokensToUpsert.length
                }`
              );
              break;
            } catch (e) {
              Logger.error(e);
            }
          } else {
            await awaiter(i * 30 * 1000);
          }
        } catch (e) {
          await awaiter(i * 60 * 1000);
        }
      }
    });
    Logger.debug(`syncTokens done`);
  }

  private async syncTokensHistory(self: TokenService) {
    Logger.debug(`syncPlatforms start`);
    const tokens = await self.repoToken
      .find({
        ...self.sharedFilter,
        cmcAdded: {
          $exists: true,
        },
      })
      .select(['id', 'slug', 'cmc', 'cmcAdded'])
      .sort({ cmc: 1 });
    await promiseMap(tokens, async (token) => {
      const lastHistoryDate = get(
        await self.repoTokenHistory
          .findOne({
            token: token.id,
          })
          .sort('-date')
          .select(['date']),
        'date',
        token.cmcAdded
      );
      if (
        lastHistoryDate.getTime() ===
        new Date(
          `${format(addDays(new Date(), -1), 'yyyy-MM-dd')}T00:00:00.000Z`
        ).getTime()
      ) {
        return;
      }
      const chunksDate = getDateDaysAgoArraysBy100(lastHistoryDate);
      await promiseMap(chunksDate, async (dateChunk) => {
        const [timeStart, timeEnd] = [
          new Date(dateChunk.at(0)).getTime() / 1000,
          new Date(dateChunk.at(-1)).getTime() / 1000,
        ];
        for (let i = 1; i < 6; i++) {
          try {
            const data = await proxyRequest<CoinMarketCapHistoricalResponse>(
              {
                searchParams: {
                  id: token.cmc,
                  convertId: CMC_ID_USD_COIN,
                  timeStart,
                  timeEnd,
                },
                headers: {
                  'user-agent': CMC_USER_AGENT,
                  'accept-encoding': 'gzip, deflate, br',
                },
                responseType: 'json',
              },
              `https://api.coinmarketcap.com/data-api/v3/cryptocurrency/historical`
            );
            await Promise.all(
              get(data, 'data.quotes', []).map(async (quote) => {
                const date = new Date(
                  `${format(
                    new Date(quote.quote.timestamp),
                    'yyyy-MM-dd'
                  )}T00:00:00.000Z`
                );
                try {
                  await self.repoTokenHistory.findOneAndUpdate(
                    {
                      token: token.id,
                      date,
                    },
                    {
                      token: token.id,
                      date,
                      volume: quote.quote.volume,
                      marketCap: quote.quote.marketCap,
                      price: quote.quote.close,
                    },
                    {
                      upsert: true,
                    }
                  );
                } catch (e) {
                  Logger.error(e);
                }
              })
            );
            break;
          } catch (e) {
            Logger.error(e);
            await awaiter(i * 60 * 1000);
          }
        }
      });
      Logger.debug(
        `history done ${token.cmc} ${
          tokens.findIndex(({ slug }) => slug === token.slug) + 1
        } of ${tokens.length}`
      );
    });
    Logger.debug(`syncTokensHistory done`);
  }

  private async syncPlatforms(self: TokenService): Promise<void> {
    Logger.debug(`syncPlatforms start`);
    const platformsCmc = await self.getPlatformsData(self);
    await Promise.all(
      platformsCmc.map(async (platform) =>
        self.repoPlatform.findOneAndUpdate(
          {
            cmc: platform.id,
          },
          {
            cmc: platform.id,
            cmcCrypto: platform.cryptoId,
            cmcDexerName: platform.dexerPlatformName,
            name: platform.name,
            explorerUrlFormat: platform.explorerUrlFormat,
            dexerTxHashFormat: platform.dexerTxhashFormat,
          },
          {
            upsert: true,
          }
        )
      )
    );
    Logger.debug(`syncPlatforms done`);
  }

  private async syncDexs(self: TokenService): Promise<void> {
    Logger.debug(`_syncDexs start`);
    const platforms = await self.repoPlatform
      .find({
        cmcDexerName: {
          $exists: true,
        },
      })
      .select('cmc');
    await promiseMap<PlatformEntity>(platforms, async (platform) => {
      const data = await proxyRequest<TokenCMCPlatformDexsResponse>(
        {
          headers: {
            'user-agent': CMC_USER_AGENT,
            'accept-encoding': 'gzip, deflate, br',
          },
          searchParams: {
            'platform-id': platform.cmc,
          },
          responseType: 'json',
        },
        'https://api.coinmarketcap.com/dexer/v3/platformpage/platform-dexers'
      );
      const dexs = get(data, 'data.exchangeList', []);
      await Promise.all(
        dexs.map(async (dex) =>
          self.repoDex.findOneAndUpdate(
            {
              cmc: dex.dexerId,
            },
            {
              cmc: dex.dexerId,
              name: dex.dexerName,
              platform: platform.id,
            },
            {
              upsert: true,
            }
          )
        )
      );
    });
    Logger.debug(`_syncDexs done`);
  }

  private async syncPairs(self: TokenService) {
    Logger.debug(`_syncPairs start`);
    const tokens: {
      id: string;
      platforms: { [k: string]: { id: string; address: string } };
    }[] = (
      await self.repoToken
        .find({
          ...self.sharedFilter,
          platforms: {
            ...self.sharedFilter.platforms,
            $elemMatch: {
              platform: {
                $in: TOKEN_CHAIN_IDS,
              },
            },
          },
          dexVolume: {
            $gt: 0,
          },
        })
        .select(['_id', 'platforms.address'])
        .populate({
          ...TokenEntityPlatformPopulate,
          select: ['_id', 'cmc'],
        })
        .sort('-statistics.marketCap')
    ).map((item) => ({
      id: String(item.id),
      platforms: Object.fromEntries(
        item.platforms.map(({ platform, address }) => [
          (platform as PlatformEntity).cmc,
          {
            address: address.toLowerCase(),
            id: String(platform.id),
          },
        ])
      ),
    }));
    const dexsObject = Object.fromEntries(
      (await self.repoDex.find().select(['_id', 'cmc'])).map(({ _id, cmc }) => [
        cmc,
        _id,
      ])
    );
    const platformsObject = Object.fromEntries(
      (await self.repoPlatform.find().select(['_id', 'cmc'])).map(
        ({ _id, cmc }) => [cmc, _id]
      )
    );
    await promiseMap(tokens, async (token) => {
      const platformId = Object.keys(token.platforms).sort().shift();
      const cacheKey = `cmc:pairList:${token.id}`;
      const cache = JSON.parse(
        (await self.redisClient.get(cacheKey)) || 'null'
      );
      if (cache) {
        return;
      }
      let start = 1;
      let hasNextPage = true;
      let pairList: CmcPairListResponse['data'] = [];
      const makeRequest = async (): Promise<boolean> => {
        await awaiter(self.awaitTime);
        const { data } = await proxyRequest<CmcPairListResponse>(
          {
            headers: {
              'user-agent': CMC_USER_AGENT,
              'accept-encoding': 'gzip, deflate, br',
            },
            searchParams: {
              'base-address': get(token.platforms, `${platformId}.address`),
              start,
              limit: 100,
              'platform-id': platformId,
              'sort-field': 'volume24h',
              desc: true,
            },
            responseType: 'json',
          },
          `https://api.coinmarketcap.com/dexer/v3/dexer/pair-list`
        );
        start += 100;
        pairList = data || [];
        return Boolean(
          pairList.length &&
            !pairList.find((item) => get(item, 'volume24h', '0') === '0')
        );
      };
      for (let i = 1; i < 6; i++) {
        try {
          while (hasNextPage !== false) {
            hasNextPage = await makeRequest();
            await Promise.all(
              pairList
                .filter(({ volume24h }) => volume24h !== '0')
                .map(async (item) => {
                  try {
                    const quoteId = get(
                      tokens.find(
                        ({ platforms }) =>
                          get<any, string>(
                            platforms,
                            `${item.platform.id}.address`
                          ) === item.quoteToken.address.toLowerCase()
                      ),
                      'id'
                    );
                    if (!quoteId) {
                      return;
                    }
                    await self.repoPair
                      .findOneAndUpdate(
                        { cmc: item.poolId, base: token.id },
                        {
                          cmc: item.poolId,
                          base: token.id,
                          quote: quoteId,
                          dex: get(dexsObject, item.dexerInfo.id),
                          platform: get(platformsObject, item.platform.id),
                          address: item.pairContractAddress,
                          liquidity: item.liquidity,
                          volume24h: item.volume24h,
                        },
                        {
                          upsert: true,
                        }
                      )
                      .select('id');
                  } catch (e) {
                    // skip shit coins found error
                    Logger.error(get(e, 'message', e));
                  }
                })
            );
            Logger.debug(
              `pair ${
                tokens.findIndex((_token) => _token.id === token.id) + 1
              } of ${tokens.length}, ${token.id} , offset: ${start}`
            );
          }
          try {
            await self.redisClient.set(
              cacheKey,
              JSON.stringify(true),
              'PX',
              24 * 60 * 60 * 1000
            );
          } catch (e) {
            //
          }
          break;
        } catch (e) {
          console.error(e);
          await awaiter(i * 60 * 1000);
        }
      }
    });
    Logger.debug(`_syncPairs done`);
  }

  private async syncPairsLiquidity(self: TokenService) {
    Logger.debug(`syncPairsLiquidity start`);
    const TokenChainIdStrings = TOKEN_CHAIN_IDS.map(String);
    const platforms = (
      await self.repoPlatform
        .find({
          _id: {
            $in: TOKEN_CHAIN_IDS,
          },
          bqSlug: {
            $exists: true,
          },
        })
        .select('bqSlug')
    ).map(({ id, bqSlug }) => ({ id, bqSlug }));
    const tokens: {
      id: string;
      platforms: {
        id: string;
        pairs: {
          bqSlug: string;
          id: string;
          address: string;
          base: {
            id: string;
            address: string;
          };
          quote: {
            id: string;
            address: string;
          };
        }[];
      }[];
    }[] = await Promise.all(
      (
        await self.repoToken
          .find({
            ...self.sharedFilter,
            platforms: {
              ...self.sharedFilter.platforms,
              $elemMatch: {
                platform: {
                  $in: TOKEN_CHAIN_IDS,
                },
              },
            },
            dexVolume: {
              $gt: 0,
            },
          })
          .select(['_id', 'platforms.address'])
          .populate({
            ...TokenEntityPlatformPopulate,
            select: ['_id', 'cmc'],
          })
          .sort('-statistics.marketCap')
      ).map(async (item) => ({
        id: String(item.id),
        platforms: await Promise.all(
          item.platforms
            .filter(({ platform }) =>
              TokenChainIdStrings.includes(String(platform.id))
            )
            .map(async ({ platform }) => ({
              id: String(platform.id),
              pairs: (
                await self.repoPair
                  .find({
                    $or: [
                      {
                        base: item.id,
                      },
                      {
                        quote: item.id,
                      },
                    ],
                    platform: platform.id,
                  })
                  .select(['base', 'quote', 'address'])
                  .populate([
                    {
                      ...PairEntityBasePopulate,
                      select: ['platforms.platform', 'platforms.address'],
                    },
                    {
                      ...PairEntityQuotePopulate,
                      select: ['platforms.platform', 'platforms.address'],
                    },
                  ])
              ).map((pair) => ({
                bqSlug: platforms.find(
                  (_platform) => _platform.id === String(platform.id)
                )?.bqSlug,
                id: pair.id,
                address: pair.address,
                base: {
                  id: String(pair.base.id),
                  address: (pair.base as TokenEntity).platforms
                    .find(
                      (_platform) =>
                        String(_platform.platform) === String(platform.id)
                    )
                    ?.address?.toLowerCase(),
                },
                quote: {
                  id: String(pair.quote.id),
                  address: (pair.quote as TokenEntity).platforms
                    .find(
                      (_platform) =>
                        String(_platform.platform) === String(platform.id)
                    )
                    ?.address?.toLowerCase(),
                },
              })),
            }))
        ),
      }))
    );
    await promiseMap<(typeof tokens)[0]>(tokens, async (token) => {
      await promiseMap<(typeof token)['platforms'][0]>(
        token.platforms,
        async (platform) => {
          await promiseMap(chunk(platform.pairs, 80), async (chunkPairs) => {
            await Promise.all(
              chunkPairs.map(async (pair) => {
                const lastHistoryDate = get(
                  await self.repoPairHistory
                    .findOne({
                      pair: pair.id,
                    })
                    .sort('-date')
                    .select(['date']),
                  'date',
                  new Date(0)
                );
                if (
                  lastHistoryDate.getTime() ===
                  new Date(
                    `${format(
                      addDays(new Date(), -1),
                      'yyyy-MM-dd'
                    )}T00:00:00.000Z`
                  ).getTime()
                ) {
                  return;
                }
                const firstHistoryDate = get(
                  await self.repoPairHistory
                    .findOne({
                      pair: pair.id,
                    })
                    .sort('date')
                    .select(['date']),
                  'date'
                );
                let daysOffset = 0;
                let daysOffsetNew = 0;
                if (firstHistoryDate) {
                  daysOffset = differenceInDays(
                    firstHistoryDate,
                    new Date(
                      `${format(lastHistoryDate, 'yyyy-MM-dd')}T00:00:00.000Z`
                    )
                  );
                }
                if (lastHistoryDate.getTime() !== new Date(0).getTime()) {
                  daysOffsetNew = differenceInDays(
                    new Date(
                      `${format(
                        addDays(new Date(), -1),
                        'yyyy-MM-dd'
                      )}T00:00:00.000Z`
                    ),
                    lastHistoryDate
                  );
                }
                await Promise.all(
                  [daysOffset, daysOffsetNew]
                    .filter((_, i) => (i > 0 ? _ !== 0 : true))
                    .map(async (offset, index) => {
                      for (
                        let dayStep =
                          -2 + (index > 0 && offset > 0 ? 2 : offset);
                        true;
                        dayStep--
                      ) {
                        try {
                          const date = new Date(
                            `${format(
                              addDays(new Date(), dayStep),
                              'yyyy-MM-dd'
                            )}T00:00:00.000Z`
                          );
                          if (index > 0) {
                            if (
                              await self.repoPairHistory.countDocuments({
                                token: token.id,
                                date,
                              })
                            ) {
                              break;
                            }
                          }
                          const [priceBase, priceQuote] = [
                            get(
                              await self.repoTokenHistory
                                .findOne({
                                  token: pair.base.id,
                                  date,
                                })
                                .select('price'),
                              'price'
                            ),
                            get(
                              await self.repoTokenHistory
                                .findOne({
                                  token: pair.quote.id,
                                  date,
                                })
                                .select('price'),
                              'price'
                            ),
                          ];
                          if (!priceBase || !priceQuote) {
                            break;
                          }
                          const balances =
                            await self.bitQueryService.getBalancesOfPair({
                              network: pair.bqSlug,
                              date: date.toISOString(),
                              poolAddress: pair.address,
                              baseToken: pair.base.address,
                              quoteToken: pair.quote.address,
                            });
                          if (!Object.keys(balances || {}).length) {
                            if (
                              daysOffset !== 0 &&
                              dayStep === -2 + daysOffset
                            ) {
                              dayStep = -1;
                              continue;
                            } else {
                              break;
                            }
                          }
                          const liquidity =
                            get(balances, pair.base.address, 0) * priceBase +
                            get(balances, pair.quote.address, 0) * priceQuote;
                          await self.repoPairHistory.findOneAndUpdate(
                            {
                              pair: pair.id,
                              date,
                            },
                            {
                              pair: pair.id,
                              date,
                              liquidity,
                            },
                            {
                              upsert: true,
                            }
                          );
                        } catch (e) {
                          Logger.error(get(e, 'message', e));
                          break;
                        }
                        // Logger.debug(`daysOffset ${pair.address} ${dayStep}`);
                      }
                    })
                );
                Logger.debug(
                  `pair ${
                    platform.pairs.findIndex(({ id }) => id === pair.id) + 1
                  } of:${platform.pairs.length}`
                );
              })
            );
          });
          Logger.debug(
            `platforms ${
              token.platforms.findIndex(({ id }) => id === platform.id) + 1
            } of:${token.platforms.length}`
          );
        }
      );
      Logger.debug(
        `tokens ${tokens.findIndex(({ id }) => id === token.id) + 1} of:${
          tokens.length
        }`
      );
    });
    Logger.debug(`syncPairsLiquidity done`);
  }

  private async syncTokenTransfers(self: TokenService) {
    Logger.debug(`syncTokenTransfers start`);
    const TokenChainIdStrings = TOKEN_CHAIN_IDS.map(String);
    const platforms = (
      await self.repoPlatform
        .find({
          _id: {
            $in: TOKEN_CHAIN_IDS,
          },
          bqSlug: {
            $exists: true,
          },
        })
        .select('bqSlug')
    ).map(({ id, bqSlug }) => ({ id, bqSlug }));
    const tokens: {
      id: string;
      platforms: {
        address: string;
        bqSlug: string;
      }[];
    }[] = await Promise.all(
      (
        await self.repoToken
          .find({
            ...self.sharedFilter,
            platforms: {
              ...self.sharedFilter.platforms,
              $elemMatch: {
                platform: {
                  $in: TOKEN_CHAIN_IDS,
                },
              },
            },
            dexVolume: {
              $gt: 0,
            },
          })
          .select(['_id', 'platforms.address'])
          .populate({
            ...TokenEntityPlatformPopulate,
            select: ['_id', 'cmc'],
          })
          .sort('-statistics.marketCap')
      ).map(async (item) => ({
        id: String(item.id),
        platforms: await Promise.all(
          item.platforms
            .filter(({ platform }) =>
              TokenChainIdStrings.includes(String(platform.id))
            )
            .map(async ({ platform, address }) => ({
              address,
              bqSlug: platforms.find(
                (_platform) => _platform.id === String(platform.id)
              )?.bqSlug,
            }))
        ),
      }))
    );
    await promiseMap<(typeof tokens)[0]>(tokens, async (token) => {
      const needUpdate = await self.repoTokenHistory
        .find({
          token: token.id,
          transfers: {
            $exists: false,
          },
        })
        .select('date')
        .sort('-date');
      const needUpdateChunks = chunk(needUpdate, 100);
      const updated = [];
      const errors = [];
      await promiseMap<(typeof needUpdateChunks)[0]>(
        needUpdateChunks,
        async (ch) => {
          const [since, till] = [ch.at(-1)?.date, ch.at(0)?.date];

          try {
            const data = await self.bitQueryService.statsTransfersNew(
              token.platforms.map(({ address, bqSlug: network }) => ({
                address,
                network,
              })),
              {
                since: since.toISOString(),
                till: till.toISOString(),
              }
            );

            await Promise.all(
              data.map(async ({ date, ...transfers }) => {
                updated.push(new Date(date).toISOString());

                await self.repoTokenHistory.findOneAndUpdate(
                  {
                    token: token.id,
                    date: new Date(date),
                  },
                  {
                    transfers,
                  }
                );
              })
            );
          } catch (e) {
            errors.push(1);

            console.error(
              e,
              token.platforms.map(({ address, bqSlug: network }) => ({
                address,
                network,
              })),
              {
                since: since.toISOString(),
                till: till.toISOString(),
              }
            );
          }
        }
      );
      if (!errors.length) {
        await Promise.all(
          needUpdate.map(async ({ date }) => {
            if (updated.includes(date.toISOString())) {
              return;
            }
            await self.repoTokenHistory.findOneAndUpdate(
              {
                token: token.id,
                date,
              },
              {
                transfers: {},
              }
            );
          })
        );
      }
      Logger.debug(
        `tokens ${tokens.findIndex(({ id }) => id === token.id) + 1} of:${
          tokens.length
        }`
      );
    });
    Logger.debug(`syncTokenTransfers done`);
  }

  private async syncTokenSwaps(self: TokenService) {
    Logger.debug(`syncTokenSwaps start`);
    const TokenChainIdStrings = TOKEN_CHAIN_IDS.map(String);
    const platforms = (
      await self.repoPlatform
        .find({
          _id: {
            $in: TOKEN_CHAIN_IDS,
          },
          bqSlug: {
            $exists: true,
          },
        })
        .select('bqSlug')
    ).map(({ id, bqSlug }) => ({ id, bqSlug }));
    const tokens: {
      id: string;
      platforms: {
        address: string;
        bqSlug: string;
      }[];
    }[] = await Promise.all(
      (
        await self.repoToken
          .find({
            ...self.sharedFilter,
            platforms: {
              ...self.sharedFilter.platforms,
              $elemMatch: {
                platform: {
                  $in: TOKEN_CHAIN_IDS,
                },
              },
            },
            dexVolume: {
              $gt: 0,
            },
          })
          .select(['_id', 'platforms.address'])
          .populate({
            ...TokenEntityPlatformPopulate,
            select: ['_id', 'cmc'],
          })
          .sort('-statistics.marketCap')
      ).map(async (item) => ({
        id: String(item.id),
        platforms: await Promise.all(
          item.platforms
            .filter(({ platform }) =>
              TokenChainIdStrings.includes(String(platform.id))
            )
            .map(async ({ platform, address }) => ({
              address,
              bqSlug: platforms.find(
                (_platform) => _platform.id === String(platform.id)
              )?.bqSlug,
            }))
        ),
      }))
    );
    await promiseMap<(typeof tokens)[0]>(tokens, async (token) => {
      try {
        const data = await self.bitQueryService.statsSwapsNew(
          token.platforms.map(({ address, bqSlug: network }) => ({
            address,
            network,
          }))
        );

        await Promise.all(
          data.map(async ({ date, ...swaps }) => {
            await self.repoTokenHistory.findOneAndUpdate(
              {
                token: token.id,
                date: new Date(date),
              },
              {
                swaps,
              }
            );
          })
        );
      } catch (e) {
        console.error(e);
      }
      Logger.debug(
        `tokens ${tokens.findIndex(({ id }) => id === token.id) + 1} of:${
          tokens.length
        }`
      );
    });
    Logger.debug(`syncTokenSwaps done`);
  }

  private async syncTokenHolders(self: TokenService) {
    Logger.debug(`syncTokenHolders start`);
    const TokenChainIdStrings = TOKEN_CHAIN_IDS.map(String);
    const platforms = (
      await self.repoPlatform
        .find({
          _id: {
            $in: TOKEN_CHAIN_IDS,
          },
          bqSlug: {
            $exists: true,
          },
        })
        .select('bqSlug')
    ).map(({ id, bqSlug }) => ({ id, bqSlug }));
    const tokens: {
      id: string;
      platforms: {
        address: string;
        bqSlug: string;
      }[];
    }[] = await Promise.all(
      (
        await self.repoToken
          .find({
            ...self.sharedFilter,
            _id: '63a13aef2afa55c2295cb0fc',
            platforms: {
              ...self.sharedFilter.platforms,
              $elemMatch: {
                platform: {
                  $in: TOKEN_CHAIN_IDS,
                },
              },
            },
          })
          .select(['_id', 'platforms.address'])
          .populate({
            ...TokenEntityPlatformPopulate,
            select: ['_id', 'cmc'],
          })
          .sort('-statistics.marketCap')
      ).map(async (item) => ({
        id: String(item.id),
        platforms: await Promise.all(
          item.platforms
            .filter(({ platform }) =>
              TokenChainIdStrings.includes(String(platform.id))
            )
            .map(async ({ platform, address }) => ({
              address,
              bqSlug: platforms.find(
                (_platform) => _platform.id === String(platform.id)
              )?.bqSlug,
            }))
        ),
      }))
    );
    const tokensChunks = chunk([tokens[0]], 15);
    await promiseMap<(typeof tokensChunks)[0]>(
      [tokensChunks[0]],
      async (_tokens) => {
        await Promise.all(
          _tokens.map(async (token) => {
            try {
              const dates = await self.repoTokenHistory
                .find({
                  token: token?.id,
                  holders: {
                    $exists: false,
                  },
                })
                .select('date');
              await promiseMap<(typeof dates)[0]>(dates, async ({ date }) => {
                const count = await self.bitQueryService.statsHoldersNew(
                  token.platforms.map(({ address, bqSlug: network }) => ({
                    address,
                    network,
                  })),
                  date.toISOString()
                );
                await self.repoTokenHistory.findOneAndUpdate(
                  {
                    token: token.id,
                    date,
                  },
                  {
                    holders: {
                      count,
                    },
                  }
                );
              });
              Logger.debug(
                `tokens ${
                  tokens.findIndex(({ id }) => id === token.id) + 1
                } of:${tokens.length}`
              );
            } catch (e) {
              console.error(e);
            }
          })
        );
      }
    );
    Logger.debug(`syncTokenHolders done`);
  }

  private async syncTradersVolume(self: TokenService) {
    Logger.debug(`syncTdv start`);
    await self.repoTokenHistory.updateMany(
      {
        $or: [
          {
            traders: { $eq: {}, $exists: true },
          },
          {
            traders: {
              $eq: [],
              $exists: true,
            },
          },
        ],
      },
      {
        $unset: {
          traders: 1,
        },
      }
    );
    const TokenChainIdStrings = TOKEN_CHAIN_IDS.map(String);
    const platforms = (
      await self.repoPlatform
        .find({
          _id: {
            $in: TOKEN_CHAIN_IDS,
          },
          bqSlug: {
            $exists: true,
          },
        })
        .select('bqSlug')
    ).map(({ id, bqSlug }) => ({ id, bqSlug }));
    const tokens: {
      id: string;
      platforms: {
        address: string;
        bqSlug: string;
      }[];
    }[] = await Promise.all(
      (
        await self.repoToken
          .find({
            ...self.sharedFilter,
            platforms: {
              ...self.sharedFilter.platforms,
              $elemMatch: {
                platform: {
                  $in: TOKEN_CHAIN_IDS,
                },
              },
            },
            dexVolume: {
              $gt: 0,
            },
          })
          .select(['_id', 'platforms.address'])
          .populate({
            ...TokenEntityPlatformPopulate,
            select: ['_id', 'cmc'],
          })
          .sort('-statistics.marketCap')
      ).map(async (item) => ({
        id: String(item.id),
        platforms: await Promise.all(
          item.platforms
            .filter(({ platform }) =>
              TokenChainIdStrings.includes(String(platform.id))
            )
            .map(async ({ platform, address }) => ({
              address,
              bqSlug: platforms.find(
                (_platform) => _platform.id === String(platform.id)
              )?.bqSlug,
            }))
        ),
      }))
    );
    const tokensChunks = chunk(tokens, 1);
    await promiseMap<(typeof tokensChunks)[0]>(
      tokensChunks,
      async (_tokens) => {
        await Promise.all(
          _tokens.map(async (token) => {
            try {
              const since = '2023-01-04T00:00:00.000Z'; // `${format(addDays(new Date(), -4), 'yyyy-MM-dd')}T00:00:00.000Z`;
              const till = '2023-01-05T00:00:00.000Z'; // `${format(addDays(new Date(), -3), 'yyyy-MM-dd')}T00:00:00.000Z`;
              if (
                await self.repoTokenHistory.countDocuments({
                  token: token.id,
                  date: since,
                  traders: {
                    $exists: true,
                  },
                })
              ) {
                return;
              }
              const chains = token.platforms.map(
                ({ address, bqSlug: network }) => ({
                  address,
                  network,
                  since,
                  till,
                })
              );

              await promiseMap<(typeof chains)[0]>(
                chains,
                async (variables) => {
                  try {
                    await awaiter(1000 * 0.6);
                    await self.bitQueryService.getStatsTradersDistributionValueNew(
                      variables
                    );
                  } catch (e) {
                    console.error(e);
                  }
                }
              );

              const [minAmount, maxAmount] = (
                await Promise.all(
                  chains.map(async (variables) => {
                    const cacheKey = `tdv:${md5(JSON.stringify(variables))}`;
                    const min: number = JSON.parse(
                      (await self.redisClient.get(`${cacheKey}:min`)) || '0'
                    );
                    const max: number = JSON.parse(
                      (await self.redisClient.get(`${cacheKey}:max`)) || '0'
                    );
                    await self.redisClient.del(`${cacheKey}:min`);
                    await self.redisClient.del(`${cacheKey}:max`);
                    return [min, max];
                  })
                )
              ).reduce(
                (prev, [min, max]) => {
                  const prevMin = prev.at(0);
                  const prevMax = prev.at(1);

                  return [
                    !prevMin || min < prevMin ? min : prevMin,
                    !prevMax || max > prevMax ? max : prevMax,
                  ];
                },
                [0, 0]
              );
              const steps = getRange(minAmount, maxAmount, 175000).map(
                (tradeAmount) => ({
                  tradeAmount,
                  userCount: 0,
                  swapsCount: 0,
                })
              );
              await promiseMap<(typeof chains)[0]>(
                chains,
                async (variables) => {
                  const userStepsCount: string[] = [];
                  const cacheKey = `tdv:${md5(JSON.stringify(variables))}`;
                  const stepOffsets = JSON.parse(
                    (await self.redisClient.get(cacheKey)) || '0'
                  );
                  await self.redisClient.del(cacheKey);
                  await promiseMap(
                    Array.from({ length: stepOffsets }).map(
                      (_, i) => `${cacheKey}:${i + 1}`
                    ),
                    async (key) => {
                      JSON.parse(
                        (await self.redisClient.get(key)) || '[]'
                      ).forEach((trade) => {
                        const stepIndex = steps.findIndex(
                          ({ tradeAmount }, index) => {
                            const lastStep = index + 1 === steps.length;
                            return (
                              tradeAmount <= trade.tradeAmount &&
                              (lastStep ||
                                trade.tradeAmount <
                                  get(steps, `${index + 1}.tradeAmount`, 0))
                            );
                          }
                        );

                        if (stepIndex === -1) {
                          return;
                        }

                        [
                          ...new Set([
                            trade.maker.address,
                            trade.taker.address,
                          ]),
                        ].forEach((user) => {
                          const cacheUserStep = `${user}_${stepIndex}`;
                          if (userStepsCount.includes(cacheUserStep)) {
                            return;
                          }
                          steps[stepIndex].userCount++;
                          userStepsCount.push(cacheUserStep);
                        });
                        steps[stepIndex].swapsCount++;
                      });
                      await self.redisClient.del(key);
                    }
                  );
                }
              );
              const traders = steps
                .filter(({ swapsCount, userCount }) => swapsCount || userCount)
                .reduce((prev, { tradeAmount, userCount, swapsCount }) => {
                  const prevElement = prev.at(-1);
                  const prevUserCount = get<any[], string, number>(
                    prevElement,
                    'userCount',
                    0
                  );
                  const prevSwapsCount = get<any[], string, number>(
                    prevElement,
                    'swapsCount',
                    0
                  );
                  if (swapsCount === 1 && prevSwapsCount === 1) {
                    return [
                      ...prev.filter((_, i) => i !== prev.length - 1),
                      {
                        tradeAmount,
                        userCount: prevUserCount + userCount,
                        swapsCount: prevSwapsCount + swapsCount,
                      },
                    ];
                  }
                  return [
                    ...prev,
                    {
                      tradeAmount,
                      userCount,
                      swapsCount,
                    },
                  ];
                }, [])
                .reverse()
                .reduce((prev, { tradeAmount, userCount, swapsCount }) => {
                  const prevElement = prev.at(-1);
                  const prevTradeAmount = get<any[], string, number>(
                    prevElement,
                    'tradeAmount',
                    0
                  );
                  const prevUserCount = get<any[], string, number>(
                    prevElement,
                    'userCount',
                    0
                  );
                  const prevSwapsCount = get<any[], string, number>(
                    prevElement,
                    'swapsCount',
                    0
                  );
                  if (
                    prevUserCount >= userCount ||
                    prevSwapsCount >= swapsCount
                  ) {
                    return [
                      ...prev.filter((_, i) => i !== prev.length - 1),
                      {
                        tradeAmount: prevTradeAmount,
                        userCount: prevUserCount + userCount,
                        swapsCount: prevSwapsCount + swapsCount,
                      },
                      {
                        tradeAmount,
                        userCount: prevUserCount + userCount,
                        swapsCount: prevSwapsCount + swapsCount,
                      },
                    ];
                  }
                  return [
                    ...prev,
                    {
                      tradeAmount,
                      userCount,
                      swapsCount,
                    },
                  ];
                }, [])
                .reverse();
              if (!traders.length) {
                return;
              }
              await self.repoTokenHistory.findOneAndUpdate(
                {
                  token: token.id,
                  date: new Date(since),
                },
                {
                  traders,
                }
              );
              Logger.debug(
                `tokens ${
                  tokens.findIndex(({ id }) => id === token.id) + 1
                } of:${tokens.length}`
              );
            } catch (e) {
              console.error(e);
            }
          })
        );
      }
    );
    Logger.debug(`syncTdv done`);
  }
}
