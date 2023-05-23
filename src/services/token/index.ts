import { get, invert } from 'lodash-es';
import Redis from 'ioredis';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { proxyRequest } from 'helpers/proxyRequest';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { ExchangeType } from 'generated/client';
import { PrismaService } from '../prisma';
import { awaiter } from '../../utils';
import { CMC_USER_AGENT, REDIS_TAG } from '../../constants';
import { TokenCMCTokenInfoResponse } from '../../types/Token/TokenCMCTokenInfoResponse';

import { Logger } from '../../config/logger/api-logger';
import { NewQueryTokensDto } from '../../dto/coinMarketCapScraper';
import { CmcToken } from '../coinMarketCapScraper/types';
import { getSelectTokensQuery, mapDbTokenToResponse } from './helpers';
import {
  getCoinGeckoCoins,
  getCoinGeckoCoinsWithStats,
  getCoinGeckoExchanges,
  getCoinGeckoPairs,
} from './coinGecko';

const DEFAULT_AWAIT_TIME: number = 0.65 * 1000;

const TOKEN_LIMIT = 1000;

const POSTGRES_TX_TIMEOUT = 60 * 1000;

const coingeckoNetworksMapper = {
  ethereum: 'eth',
  'binance-smart-chain': 'bsc',
};

const invertedCoingeckoNetworksMapper = invert(coingeckoNetworksMapper);

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

    const pairs = await this.prisma.exchangePair.findMany({
      where: {
        OR: [
          { BaseTokenBlockchainRecord: { Token: { id: parsedId } } },
          { QuoteTokenBlockchainRecord: { Token: { id: parsedId } } },
        ],
      },
      orderBy: { reserve_in_usd: 'desc' },
      take: Number.parseInt(limit, 10),
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
        liquidity: pair.reserve_in_usd,
        dex: {
          id: pair.Exchange.id,
          name: pair.Exchange.name,
        },
        reverseOrder: false,
        coingeckoPoolId: pair.coingecko_pool_id,
        name: pair.pool_name,
      })),
      count: pairs.length,
    };
  }

  private async getTokenData(slug: string): Promise<TokenCMCTokenInfoResponse> {
    await awaiter(DEFAULT_AWAIT_TIME);

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

  private async syncTokens() {
    Logger.debug(`syncTokens start`);

    await this.prisma.$transaction(
      async (txClient) => {
        const coingGeckoTokens = await getCoinGeckoCoins();
        const coingGeckoTokensMap = new Map(
          coingGeckoTokens.map((token) => [token.id.toLowerCase(), token])
        );

        const coinGeckoStats = await getCoinGeckoCoinsWithStats(TOKEN_LIMIT);

        await txClient.token.deleteMany({
          where: {
            coingecko_slug: {
              notIn: coinGeckoStats.map(({ id }) => id),
            },
          },
        });

        const availableBlockchainsSet = new Set(
          Object.keys(coingeckoNetworksMapper)
        );

        await Promise.all(
          coinGeckoStats.map(async (stat) => {
            const { platforms } =
              coingGeckoTokensMap.get(stat.id.toLowerCase()) || {};

            if (!platforms || !Object.keys(platforms).length) {
              return;
            }

            const tokenInfo = {
              symbol: stat.symbol,
              name: stat.name,
              launched_date: stat.atl_date,
              image: stat.image,
              description: '',
              category: '',
              price: stat.current_price?.toString() || '0',
              price_change_perc_1h: stat.price_change_percentage_1h_in_currency,
              price_change_perc_24h: stat.price_change_24h,
              price_change_perc_7d: stat.price_change_percentage_7d_in_currency,
              market_cap: stat.market_cap?.toString(),
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

  private async syncPairs() {
    Logger.debug(`syncPairs start`);

    const tokens = await this.prisma.token.findMany({
      include: { TokenBlockchainRecords: true },
    });

    await this.prisma.exchangePair.deleteMany({});

    for (let i = 0; i < 20; i++) {
      const token = tokens[i];

      let pairsSynced = 0;

      await this.prisma.$transaction(
        async (txClient) => {
          if (!token.TokenBlockchainRecords.length) {
            return;
          }

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
                      const poolData = {
                        volume: '0',
                        price: '0',
                        price_change_24h: 0,
                        reserve_in_usd: pair.attributes.reserve_in_usd,
                        coingecko_pool_id: pair.id,
                        pool_name: pair.attributes.name,
                      };

                      const [baseTokenBlockchainSlug, baseTokenAddress] =
                        pair.relationships.base_token.data.id.split('_');

                      const mappedBaseBlockchainSlug =
                        invertedCoingeckoNetworksMapper[
                          baseTokenBlockchainSlug
                        ];

                      const [quoteTokenBlockchainSlug, quoteTokenAddress] =
                        pair.relationships.quote_token.data.id.split('_');

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
        },
        { maxWait: 60000, timeout: 15000 }
      );

      Logger.debug(`syncPairs synced ${token.symbol} (${pairsSynced} pairs)`);
    }

    Logger.debug(`syncPairs done`);
  }
}
