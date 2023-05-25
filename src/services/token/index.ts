import { get, invert } from 'lodash-es';
import Redis from 'ioredis';
import AsyncLock from 'async-lock';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { ExchangeType } from 'generated/client';
import { PrismaService } from '../prisma';
import { REDIS_TAG } from '../../constants';

import { Logger } from '../../config/logger/api-logger';
import { NewQueryTokensDto } from '../../dto/coinMarketCapScraper';
import { CmcToken } from '../coinMarketCapScraper/types';
import { getSelectTokensQuery, mapDbTokenToResponse } from './helpers';
import {
  getCoinGeckoCoins,
  getCoinGeckoCoinsPrices,
  getCoinGeckoCoinsWithStats,
  getCoinGeckoExchanges,
  getCoinGeckoPairs,
  getPoolInfo,
} from './coinGecko';
import { countUniqueSenders } from './bitQuery';

const TOKEN_LIMIT = 200;
const PAIRS_LIMIT = 10;

const POSTGRES_TX_TIMEOUT = 60 * 1000;

const coingeckoNetworksMapper = {
  ethereum: 'eth',
  'binance-smart-chain': 'bsc',
};

const bitQueryNetworksMapper = {
  'binance-smart-chain': 'bsc',
  ethereum: 'ethereum',
};

const invertedCoingeckoNetworksMapper = invert(coingeckoNetworksMapper);

const asyncLock = new AsyncLock({
  maxOccupationTime: 60 * 1000,
});

@Injectable()
export class TokenService {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @InjectRedis(REDIS_TAG) private readonly redisClient: Redis
  ) {}

  public async onModuleInit() {
    try {
      // await this.syncPlatforms();
      // await this.syncTokens();
      // await this.syncDexs();
      // await this.syncPairs();
    } catch (e) {
      Logger.error(get(e, 'message', e));
    }
  }

  public async tokens({
    limit,
    offset,
    sortBy,
    sortOrder,
  }: NewQueryTokensDto): Promise<{
    tokens: CmcToken[];
    tokensCount: number;
  }> {
    const tokens = await getSelectTokensQuery(
      this.prisma,
      sortBy,
      sortOrder,
      Number.parseInt(limit, 10),
      Number.parseInt(offset, 10)
    );

    return {
      tokens: tokens.map(mapDbTokenToResponse),
      tokensCount: tokens.length,
    };
  }

  public async token(slug: string): Promise<any> {
    const token = await this.prisma.token.findUnique({
      where: { coingecko_slug: slug },
      include: { TokenBlockchainRecords: true },
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

    return asyncLock.acquire(id, async () => {
      const isOutdated = await this.prisma.token.count({
        where: {
          id: parsedId,
          last_updated: { lt: new Date(Date.now() - 5 * 60 * 1000) },
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
            image: '',
          },
          quote: {
            id: pair.QuoteTokenBlockchainRecord.Token?.id || '',
            slug: pair.QuoteTokenBlockchainRecord.Token?.coingecko_slug || '',
            symbol:
              pair.QuoteTokenBlockchainRecord.Token?.symbol.toUpperCase() || '',
            address: pair.QuoteTokenBlockchainRecord.address,
            image: '',
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
      orderBy: { reserve_in_usd: 'desc' },
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

    const coinGeckoStats = await getCoinGeckoCoinsWithStats(TOKEN_LIMIT);

    const coinGeckoPrices = await getCoinGeckoCoinsPrices(
      coinGeckoStats.map(({ id }) => id)
    );

    await this.prisma.$transaction(
      async (txClient) => {
        await txClient.token.deleteMany({});

        await Promise.all(
          coinGeckoStats
            .filter(
              ({ current_price, market_cap }) =>
                current_price > 0 && +market_cap > 0
            )
            .map(async (stat) => {
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
                launched_date: stat.atl_date,
                image: stat.image,
                description: '',
                category: '',
                price_btc: prices.btc?.toString() || '0',
                price_eth: prices.eth?.toString() || '0',
                price_change_btc_perc_24h: prices.btc_24h_change || 0,
                price_change_eth_perc_24h: prices.eth_24h_change || 0,
                price: stat.current_price?.toString() || '0',
                price_change_perc_1h:
                  stat.price_change_percentage_1h_in_currency,
                price_change_perc_24h: stat.price_change_24h,
                price_change_perc_7d:
                  stat.price_change_percentage_7d_in_currency,
                market_cap: stat.market_cap?.toString() || '0',
                market_cap_rank: stat.market_cap_rank,
                market_cap_change_perc_24h: stat.market_cap_change_24h,
                fully_diluted_market_cap:
                  stat.fully_diluted_valuation?.toString(),
                fully_diluted_market_cap_change_perc_24h: 0,
                circulating_supply: stat.circulating_supply?.toString(),
                total_supply: stat.total_supply?.toString(),
                self_reported_circulating_supply: '0',
                volume: stat.total_volume?.toString(),
                volume_change_perc_24h: 0,
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
          coingecko_slug: { notIn: Object.keys(coingeckoNetworksMapper) },
        },
      });

      await Promise.all(
        Object.entries(coingeckoNetworksMapper).map(async ([k, v]) =>
          prismaTxClient.blockchain.upsert({
            where: { coingecko_slug: k },
            create: {
              explorer_addr_url_format: '',
              explorer_token_url_format: '',
              explorer_tx_url_format: '',
              evm_chain_id: 1,
              name: v,
              coingecko_slug: k,
            },
            update: {},
          })
        )
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

    await this.prisma.exchangePair.deleteMany({});

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
                  throw new Error('Not network not supported');
                }

                const pairs = await getCoinGeckoPairs(
                  coinGeckoTerminalNetworkSlug,
                  network.address
                );

                await Promise.all(
                  pairs.data
                    .filter(
                      (pair) =>
                        /* support only pools with 2 tokens */
                        [...pair.attributes.name.matchAll(/ \/ /gi)].length <= 1
                    )
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
}
