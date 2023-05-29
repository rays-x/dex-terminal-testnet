import { get, uniqBy } from 'lodash-es';
import Redis from 'ioredis';
import AsyncLock from 'async-lock';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { ExchangeType } from 'generated/client';
import { getCmcStats, getCmcTokens } from 'services/token/cmc';
import { PrismaService } from '../prisma';
import { REDIS_TAG } from '../../constants';

import { Logger } from '../../config/logger/api-logger';
import { NewQueryTokensDto } from '../../dto/coinMarketCapScraper';
import { CmcToken } from './cmc/types';
import { getSelectTokensQuery, mapDbTokenToResponse } from './helpers';
import {
  coingeckoNetworksMapper,
  getCoinGeckoCoins,
  getCoinGeckoCoinsPrices,
  getCoinGeckoCoinsWithStats,
  getCoinGeckoExchanges,
  getCoinGeckoPairs,
  getPoolInfo,
  invertedCoingeckoNetworksMapper,
} from './coinGecko';
import {
  bitQueryNetworksMapper,
  countUniqueSenders,
  getSwapsStats,
} from './bitQuery';
import { Blockchains } from './constants';
import { throttledHoldersStats } from './etherscan';
import { Point } from './types';

const TOKEN_LIMIT = Number.parseInt(process.env.TOKEN_LIMIT, 10);
const PAIRS_LIMIT = Number.parseInt(process.env.PAIRS_LIMIT, 10);

const HOLDERS_STATS_EXPIRE =
  Number.parseInt(process.env.HOLDERS_STATS_EXPIRE_SEC, 10) * 1000;

const SWAPS_STATS_EXPIRE =
  Number.parseInt(process.env.SWAPS_STATS_EXPIRE_SEC, 10) * 1000;

/* stats for last 30 days */
const SWAPS_STATS_INTERVAL = 30 * 24 * 60 * 60 * 1000;

const PAIRS_UPDATE_INTERVAL = 15 * 60 * 1000;

const POSTGRES_TX_TIMEOUT = 60 * 1000;

const topTokensInOrders = ['market_cap_desc', 'volume_desc'] as const;

const pairsAsyncLock = new AsyncLock({
  maxOccupationTime: 60 * 1000,
});

const holdersAsyncLock = new AsyncLock({
  maxOccupationTime: 10 * 1000,
});

const swapsAsyncLock = new AsyncLock({
  maxOccupationTime: 60 * 1000,
});

const getHoldersCacheKey = (tokenId: number) =>
  `token::holders::${tokenId.toString()}`;

const getSwapsCacheKey = (tokenId: number) =>
  `token::swaps::${tokenId.toString()}`;

@Injectable()
export class TokenService {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @InjectRedis(REDIS_TAG) private readonly redisClient: Redis
  ) {}

  public async onModuleInit() {
    try {
      await this.syncPlatforms();
      await this.syncTokens();
      await this.syncDexs();
      await this.syncPairs();
    } catch (e) {
      Logger.error(get(e, 'message', e));
    }
  }

  public async tokens({
    limit,
    offset,
    sortBy,
    sortOrder,
    search = '',
    chains = [],
  }: NewQueryTokensDto): Promise<{
    tokens: CmcToken[];
    tokensCount: number;
  }> {
    const tokens = await getSelectTokensQuery(
      this.prisma,
      sortBy,
      sortOrder,
      Number.parseInt(limit, 10),
      Number.parseInt(offset, 10),
      chains,
      search.replace(/[^a-zA-Z0-9]+/g, '')
    );

    return {
      tokens: tokens.map(mapDbTokenToResponse),
      tokensCount: await this.prisma.token.count(),
    };
  }

  public async token(slug: string): Promise<any> {
    const token = await this.prisma.token.findUnique({
      where: { coingecko_slug: slug },
      include: { TokenBlockchainRecords: { include: { Blockchain: true } } },
    });

    if (!token) {
      throw new HttpException({}, HttpStatus.NOT_FOUND);
    }

    return mapDbTokenToResponse(token);
  }

  public async pairs(
    id: string,
    { limit }: NewQueryTokensDto
  ): Promise<unknown> {
    const parsedId = Number.parseInt(id, 10);
    const parsedLimit = Number.parseInt(limit, 10);

    return pairsAsyncLock.acquire(id, async () => {
      const isOutdated = await this.prisma.token.count({
        where: {
          id: parsedId,
          OR: [
            {
              last_updated: {
                lt: new Date(Date.now() - PAIRS_UPDATE_INTERVAL),
              },
            },
            {
              TokenBlockchainRecords: {
                some: {
                  AND: [
                    { BaseExchangePair: { every: { price: '' } } },
                    { QuoteExchangePair: { every: { price: '' } } },
                  ],
                },
              },
            },
          ],
        },
      });

      if (isOutdated) {
        await this.syncPairs([parsedId]);
      }

      const pairs = await this.getPair(parsedId, parsedLimit);

      return {
        items: pairs.map((pair) => ({
          base: {
            id: pair.BaseTokenBlockchainRecord.Token?.id || '',
            slug: pair.BaseTokenBlockchainRecord.Token?.coingecko_slug || '',
            symbol:
              pair.BaseTokenBlockchainRecord.Token?.symbol.toUpperCase() || '',
            address: pair.BaseTokenBlockchainRecord.address,
            image: pair.BaseTokenBlockchainRecord.Token?.image,
          },
          quote: {
            id: pair.QuoteTokenBlockchainRecord.Token?.id || '',
            slug: pair.QuoteTokenBlockchainRecord.Token?.coingecko_slug || '',
            symbol:
              pair.QuoteTokenBlockchainRecord.Token?.symbol.toUpperCase() || '',
            address: pair.QuoteTokenBlockchainRecord.address,
            image: pair.QuoteTokenBlockchainRecord.Token?.image,
          },
          platform: {
            id: pair.Exchange.Blockchain.id,
            chainId: pair.Exchange.Blockchain.evm_chain_id,
            dexerTxHashFormat: pair.Exchange.Blockchain.explorer_tx_url_format,
          },
          dex: {
            id: pair.Exchange.id,
            name: pair.Exchange.name,
          },
          reverseOrder: false,
          coingeckoPoolId: pair.coingecko_pool_id,
          name: pair.pool_name,
          volume: pair.volume,
          liquidity: pair.reserve_in_usd,
          price: pair.price,
          priceChangePerc24h: pair.price_change_perc_24h,
          tradesCount: pair.trades_count,
          sellsCount: pair.sells_count,
          buysCount: pair.buys_count,
          buyersCount: pair.unique_buyers_count,
          sellersCount: pair.unique_sellers_count,
        })),
        count: pairs.length,
      };
    });
  }

  private async getPair(id: number, limit: number) {
    return this.prisma.exchangePair.findMany({
      where: {
        OR: [
          { BaseTokenBlockchainRecord: { Token: { id } } },
          { QuoteTokenBlockchainRecord: { Token: { id } } },
        ],
      },
      orderBy: { trades_count: 'desc' },
      take: limit,
      include: {
        BaseTokenBlockchainRecord: {
          include: {
            Token: true,
          },
        },
        QuoteTokenBlockchainRecord: {
          include: {
            Token: true,
          },
        },
        Exchange: {
          include: { Blockchain: true },
        },
      },
    });
  }

  private async syncTokens() {
    Logger.debug(`syncTokens start`);

    const cmcTokenList = (await getCmcTokens()).filter(
      ({ isActive }) => isActive
    );

    const cmcIdToSlugMapper = new Map(cmcTokenList.map((t) => [t.id, t.slug]));

    const availableBlockchainsSet = new Set(
      Object.keys(coingeckoNetworksMapper)
    );

    const coingGeckoTokens = await getCoinGeckoCoins();
    const coingGeckoTokensWithPlatforms = coingGeckoTokens.filter(
      ({ platforms }) =>
        platforms &&
        Object.keys(platforms).some((platform) =>
          availableBlockchainsSet.has(platform)
        )
    );

    const coingGeckoTokensMap = new Map(
      coingGeckoTokensWithPlatforms.map((token) => [token.id, token])
    );

    const [coinGeckoTopMarketCapStats, coinGeckoTopVolumeStats] =
      await Promise.all(
        topTokensInOrders.map((order) =>
          getCoinGeckoCoinsWithStats(TOKEN_LIMIT, order)
        )
      );

    const coinGeckoStats = uniqBy(
      [...coinGeckoTopMarketCapStats, ...coinGeckoTopVolumeStats],
      'id'
    );

    const coinGeckoPrices = await getCoinGeckoCoinsPrices(
      coinGeckoStats.map(({ id }) => id)
    );

    const cgToCmcIdsMapper = {} as Record<number, string | undefined>;

    const cmcStats = await getCmcStats(
      coinGeckoStats
        .map((stat) => {
          const matchedCmcToken = cmcTokenList.find((cmcToken) =>
            [cmcToken.symbol, cmcToken.slug]
              .map((k) => k.toLowerCase())
              .includes(stat.symbol.toLowerCase())
          );

          const cgHasRequiredStats =
            stat.market_cap &&
            stat.current_price &&
            stat.fully_diluted_valuation &&
            stat.circulating_supply;

          if (matchedCmcToken) {
            cgToCmcIdsMapper[stat.id] = matchedCmcToken.id;
          }

          return !cgHasRequiredStats ? matchedCmcToken?.id : undefined;
        })
        .filter(Boolean)
    );

    await this.prisma.$transaction(
      async (txClient) => {
        await txClient.token.deleteMany({});

        await Promise.all(
          coinGeckoStats.map(async (stat) => {
            const cmcTokenStats = cmcStats[cgToCmcIdsMapper[stat.id]];

            const cgHasParams =
              stat.market_cap &&
              stat.current_price &&
              stat.fully_diluted_valuation &&
              stat.circulating_supply;

            if (!cmcTokenStats && !cgHasParams) {
              return;
            }

            const { platforms } = coingGeckoTokensMap.get(stat.id) || {};

            if (!Object.keys(platforms || {}).length) {
              return;
            }

            const prices = coinGeckoPrices[stat.id];

            if (!prices) {
              throw new Error(`Prices for ${stat.symbol} not found`);
            }

            const tokenInfo = {
              symbol: stat.symbol,
              name: stat.name,
              cmc_slug: cmcIdToSlugMapper.get(cgToCmcIdsMapper[stat.id]),
              launched_date: new Date(
                cmcTokenStats?.date_added
                  ? Math.min(
                      new Date(cmcTokenStats.date_added).getTime(),
                      new Date(stat.atl_date).getTime()
                    )
                  : stat.atl_date
              ),
              image: stat.image,
              description: '',
              category: '',
              price_btc: prices.btc?.toString() || '0',
              price_eth: prices.eth?.toString() || '0',
              price_change_btc_perc_24h: prices.btc_24h_change || 0,
              price_change_eth_perc_24h: prices.eth_24h_change || 0,
              price:
                stat.current_price?.toString() ||
                cmcTokenStats?.quote.USD.price?.toString() ||
                '0',
              price_change_perc_1h:
                stat.price_change_percentage_1h_in_currency ||
                cmcTokenStats?.quote.USD.percent_change_1h,
              price_change_perc_24h:
                stat.price_change_percentage_24h_in_currency ||
                cmcTokenStats?.quote.USD.percent_change_24h,
              price_change_perc_7d:
                stat.price_change_percentage_7d_in_currency ||
                cmcTokenStats?.quote.USD.percent_change_7d,
              market_cap:
                stat.market_cap?.toString() ||
                cmcTokenStats?.quote.USD.market_cap?.toString() ||
                cmcTokenStats?.self_reported_market_cap?.toString(),
              market_cap_rank: stat.market_cap_rank || cmcTokenStats?.cmc_rank,
              market_cap_change_perc_24h: stat.market_cap_change_24h,
              fully_diluted_market_cap:
                stat.fully_diluted_valuation?.toString() ||
                cmcTokenStats?.quote.USD.fully_diluted_market_cap?.toString(),
              fully_diluted_market_cap_change_perc_24h: undefined,
              circulating_supply:
                stat.circulating_supply?.toString() ||
                cmcTokenStats?.circulating_supply?.toString(),
              total_supply:
                stat.total_supply?.toString() ||
                cmcTokenStats?.total_supply?.toString(),
              self_reported_circulating_supply:
                cmcTokenStats?.self_reported_circulating_supply?.toString(),
              volume:
                stat.total_volume?.toString() ||
                cmcTokenStats?.quote.USD.volume_24h?.toString(),
              volume_change_perc_24h:
                cmcTokenStats?.quote.USD.volume_change_24h,
            };

            await txClient.token.upsert({
              where: { coingecko_slug: stat.id },
              create: {
                ...tokenInfo,
                coingecko_slug: stat.id,
                TokenBlockchainRecords: {
                  connectOrCreate: Object.entries(platforms)
                    .filter(([k]) => availableBlockchainsSet.has(k))
                    .map(([slug, address]) => {
                      const createOpts = {
                        address,
                        blockchain_coingecko_slug: slug,
                      };

                      return {
                        where: {
                          blockchain_coingecko_slug_address: createOpts,
                        },
                        create: createOpts,
                      };
                    }),
                },
              },
              update: tokenInfo,
              select: null,
            });

            Logger.debug(`syncTokens synced ${stat.symbol}`);
          })
        );
      },
      { timeout: POSTGRES_TX_TIMEOUT }
    );

    Logger.debug(`syncTokens done`);
  }

  private async syncPlatforms(): Promise<void> {
    Logger.debug(`syncPlatforms start`);

    this.prisma.$transaction(async (prismaTxClient) => {
      await prismaTxClient.blockchain.deleteMany({
        where: {
          coingecko_slug: { notIn: Object.keys(Blockchains) },
        },
      });

      await Promise.all(
        Object.entries(Blockchains).map(async ([slug, info]) => {
          const createOrUpdate = {
            explorer_addr_url_format: info.explorerAccountAddress,
            explorer_token_url_format: info.explorerTokenAddress,
            explorer_tx_url_format: info.explorerTxHashAddress,
            evm_chain_id: info.evmChainId,
            name: info.name,
            coingecko_slug: slug,
            image: info.image,
          };

          return prismaTxClient.blockchain.upsert({
            where: { coingecko_slug: slug },
            create: createOrUpdate,
            update: createOrUpdate,
          });
        })
      );
    });

    Logger.debug(`syncPlatforms done`);
  }

  private async syncDexs(): Promise<void> {
    Logger.debug(`syncDexs start`);

    await this.prisma.$transaction(
      async (txClient) => {
        const exchangesByBlockchains = await Promise.all(
          Object.entries(coingeckoNetworksMapper).map(
            async ([blockchainSlug, netw]) => ({
              exchanges: await getCoinGeckoExchanges(netw),
              blockchainSlug,
            })
          )
        );

        await Promise.all(
          exchangesByBlockchains.map(async ({ exchanges, blockchainSlug }) => {
            const blockchain = await this.prisma.blockchain.findFirstOrThrow({
              where: { coingecko_slug: blockchainSlug },
            });

            if (!blockchain) {
              throw new Error('Blockchain matched dex not found!');
            }

            await Promise.all(
              exchanges.data.map(async (dex) =>
                txClient.exchange.upsert({
                  where: { coingecko_slug: dex.id },
                  update: {
                    coingecko_slug: dex.id,
                    name: dex.attributes.name,
                  },
                  create: {
                    coingecko_slug: dex.id,
                    name: dex.attributes.name,
                    Type: ExchangeType.DEX,
                    Blockchain: { connect: { id: blockchain.id } },
                  },
                })
              )
            );
          })
        );
      },
      { timeout: POSTGRES_TX_TIMEOUT }
    );

    Logger.debug(`syncDexs done`);
  }

  private async syncPairs(ids?: number[]) {
    Logger.debug(`syncPairs start`);

    const isoTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const tokens = await this.prisma.token.findMany({
      include: { TokenBlockchainRecords: true },
      take: PAIRS_LIMIT,
      orderBy: {
        market_cap_rank: 'asc',
      },
      where: ids?.length ? { id: { in: ids } } : undefined,
    });

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      let pairsSynced = 0;

      await this.prisma.$transaction(
        async (txClient) => {
          await Promise.all(
            token.TokenBlockchainRecords.map(async (network) => {
              try {
                const coinGeckoTerminalNetworkSlug =
                  coingeckoNetworksMapper[network.blockchain_coingecko_slug];

                if (!coinGeckoTerminalNetworkSlug) {
                  throw new Error('Network not supported');
                }

                const pairs = await getCoinGeckoPairs(
                  coinGeckoTerminalNetworkSlug,
                  network.address
                );

                const cgSupportedIds = new Map(
                  pairs.included
                    .filter(
                      ({ type, attributes }) =>
                        type === 'token' && !!attributes.coingecko_coin_id
                    )
                    .map((entity) => [entity.id, entity])
                );

                await Promise.all(
                  pairs.data
                    .filter(
                      (pair) =>
                        /* support only pools with 2 tokens */
                        [...pair.attributes.name.matchAll(/ \/ /gi)].length <=
                          1 &&
                        [
                          pair.relationships.base_token.data.id,
                          pair.relationships.quote_token.data.id,
                        ].every((id) => cgSupportedIds.has(id))
                    )
                    .slice(0, PAIRS_LIMIT)
                    .map(async (pair) => {
                      const [baseTokenBlockchainSlug, baseTokenAddress] =
                        pair.relationships.base_token.data.id.split('_');

                      const mappedBaseBlockchainSlug =
                        invertedCoingeckoNetworksMapper[
                          baseTokenBlockchainSlug
                        ];

                      const [quoteTokenBlockchainSlug, quoteTokenAddress] =
                        pair.relationships.quote_token.data.id.split('_');

                      const [uniqueBuyers, uniqueSellers] = await Promise.all(
                        [baseTokenAddress, quoteTokenAddress].map(
                          async (tokenAddr) =>
                            countUniqueSenders(
                              bitQueryNetworksMapper[
                                network.blockchain_coingecko_slug
                              ],
                              pair.attributes.address,
                              tokenAddr,
                              isoTime
                            )
                        )
                      );

                      const poolStats = await getPoolInfo(
                        coinGeckoTerminalNetworkSlug,
                        pair.attributes.address,
                        Number(
                          pair.relationships.quote_token.data.id ===
                            token.coingecko_slug
                        )
                      );

                      const poolData = {
                        volume: poolStats.volume,
                        sells_count: poolStats.sellsCount,
                        trades_count: poolStats.tradesCount,
                        buys_count: poolStats.buysCount,
                        price: poolStats.price,
                        price_change_perc_24h:
                          poolStats.priceChangePercentage24h,
                        reserve_in_usd: pair.attributes.reserve_in_usd,
                        coingecko_pool_id: pair.id,
                        pool_name: pair.attributes.name,
                        unique_buyers_count: uniqueBuyers,
                        unique_sellers_count: uniqueSellers,
                      };

                      const mappedQuoteBlockchainSlug =
                        invertedCoingeckoNetworksMapper[
                          quoteTokenBlockchainSlug
                        ];

                      await txClient.exchangePair.upsert({
                        where: {
                          base_token_blockchain_record_address_base_token_blockchain_slug_quote_token_blockchain_record_address_quote_token_blockchain_slug_exchange_coingecko_slug:
                            {
                              exchange_coingecko_slug:
                                pair.relationships.dex.data.id,
                              base_token_blockchain_record_address:
                                baseTokenAddress,
                              base_token_blockchain_slug:
                                mappedBaseBlockchainSlug,
                              quote_token_blockchain_record_address:
                                quoteTokenAddress,
                              quote_token_blockchain_slug:
                                mappedQuoteBlockchainSlug,
                            },
                        },
                        create: {
                          Exchange: {
                            connect: {
                              coingecko_slug: pair.relationships.dex.data.id,
                            },
                          },
                          BaseTokenBlockchainRecord: {
                            connectOrCreate: {
                              where: {
                                blockchain_coingecko_slug_address: {
                                  blockchain_coingecko_slug:
                                    mappedBaseBlockchainSlug,
                                  address: baseTokenAddress,
                                },
                              },
                              create: {
                                address: baseTokenAddress,
                                Blockchain: {
                                  connect: {
                                    coingecko_slug: mappedBaseBlockchainSlug,
                                  },
                                },
                              },
                            },
                          },
                          QuoteTokenBlockchainRecord: {
                            connectOrCreate: {
                              where: {
                                blockchain_coingecko_slug_address: {
                                  blockchain_coingecko_slug:
                                    mappedQuoteBlockchainSlug,
                                  address: quoteTokenAddress,
                                },
                              },
                              create: {
                                address: quoteTokenAddress,
                                Blockchain: {
                                  connect: {
                                    coingecko_slug: mappedQuoteBlockchainSlug,
                                  },
                                },
                              },
                            },
                          },
                          ...poolData,
                        },
                        update: poolData,
                      });

                      pairsSynced++;
                    })
                );
              } catch (err) {
                Logger.error(
                  `syncPairs failed to sync ${token.symbol} on network ${network.blockchain_coingecko_slug} (address: ${network.address}): ${err}`
                );
              }
            })
          );

          await this.prisma.token.update({
            where: { id: token.id },
            data: { last_updated: new Date() },
          });
        },
        { maxWait: 60000, timeout: POSTGRES_TX_TIMEOUT * 4 }
      );

      Logger.debug(`syncPairs synced ${token.symbol} (${pairsSynced} pairs)`);
    }

    Logger.debug(`syncPairs done`);
  }

  public async holders(id: string): Promise<Point[]> {
    const parsedId = Number.parseInt(id, 10);

    const cacheKey = getHoldersCacheKey(parsedId);

    return holdersAsyncLock.acquire(cacheKey, async () => {
      const cached = await this.redisClient.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const token = await this.prisma.token.findUnique({
        where: { id: parsedId },
        include: { TokenBlockchainRecords: { include: { Blockchain: true } } },
      });

      if (!token) {
        throw new HttpException({}, HttpStatus.NOT_FOUND);
      }

      const holdersByBlockchains = await Promise.all(
        token.TokenBlockchainRecords.map(async (record) =>
          throttledHoldersStats(
            record.Blockchain
              .coingecko_slug as keyof typeof coingeckoNetworksMapper,
            record.address
          )
        )
      );

      const commonHolderPoints = holdersByBlockchains.slice(1).reduce(
        (commonHolders, currHolders) =>
          commonHolders.map((point, i) => ({
            t: point.t,
            v:
              point.t === currHolders?.[i]?.t
                ? point.v + currHolders[i].v
                : point.v,
          })),
        holdersByBlockchains[0]
      );

      await this.redisClient.set(
        cacheKey,
        JSON.stringify(commonHolderPoints),
        'EX',
        HOLDERS_STATS_EXPIRE
      );

      return commonHolderPoints;
    });
  }

  public async swaps(id: string): Promise<Point[]> {
    const parsedId = Number.parseInt(id, 10);

    const cacheKey = getSwapsCacheKey(parsedId);

    return swapsAsyncLock.acquire(cacheKey, async () => {
      const cached = await this.redisClient.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const token = await this.prisma.token.findUnique({
        where: { id: parsedId },
        include: { TokenBlockchainRecords: { include: { Blockchain: true } } },
      });

      if (!token) {
        throw new HttpException({}, HttpStatus.NOT_FOUND);
      }

      const from = new Date(Date.now() - SWAPS_STATS_INTERVAL);
      const till = new Date();

      const tradesByBlockchains = await Promise.all(
        token.TokenBlockchainRecords.map(async (record) =>
          getSwapsStats(
            bitQueryNetworksMapper[record.Blockchain.coingecko_slug],
            record.address,
            from,
            till
          ).catch(() => [] as Point[])
        )
      );

      const commonTradePoints = tradesByBlockchains.slice(1).reduce(
        (commonTrades, currTrades) =>
          commonTrades.map((point, i) => ({
            t: point.t,
            v:
              point.t === currTrades?.[i]?.t
                ? point.v + currTrades[i].v
                : point.v,
          })),
        tradesByBlockchains[0]
      );

      await this.redisClient.set(
        cacheKey,
        JSON.stringify(commonTradePoints),
        'EX',
        SWAPS_STATS_EXPIRE
      );

      return commonTradePoints;
    });
  }
}
