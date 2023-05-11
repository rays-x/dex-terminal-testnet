import { get } from 'lodash-es';
import Redis from 'ioredis';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { proxyRequest } from 'helpers/proxyRequest';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import {
  getCmcStats,
  getCmcTokens,
} from 'services/coinMarketCapScraper/helpers';
import { ExchangeType, Token } from 'generated/client';
import pThrottle from 'p-throttle';
import { PrismaService } from '../prisma';
import { awaiter } from '../../utils';
import { CMC_USER_AGENT, REDIS_TAG } from '../../constants';
import { TokenCMCTokenInfoResponse } from '../../types/Token/TokenCMCTokenInfoResponse';

import { Logger } from '../../config/logger/api-logger';
import { NewQueryTokensDto } from '../../dto/coinMarketCapScraper';
import { CmcToken } from '../coinMarketCapScraper/types';
import { HttpStatusMessages } from '../../messages/http';
import {
  getDexExchangesData,
  getExchangePairs,
  getPlatformsData,
  mapDbTokenToResponse,
} from './helpers';

const DEFAULT_AWAIT_TIME: number = 0.65 * 1000;

const TOKEN_LIMIT = 5000;

const POSTGRES_TX_TIMEOUT = 60 * 1000;

const throttle = pThrottle({
  limit: 1,
  interval: 2000,
});

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
    chains,
    search,
    limit,
    offset,
    sortBy,
    sortOrder,
  }: NewQueryTokensDto): Promise<{
    tokens: CmcToken[];
    tokensCount: number;
  }> {
    const tokens = await this.prisma.token.findMany({
      take: Number.parseInt(limit, 10),
    });

    return {
      tokens: tokens.map(mapDbTokenToResponse),
      tokensCount: tokens.length,
    };
  }

  public async token(slug: string): Promise<any> {
    const token = await this.prisma.token.findUnique({
      where: { cmc_slug: slug },
    });

    if (!token) {
      throw new HttpException(
        HttpStatusMessages.NOT_FOUND,
        HttpStatus.NOT_FOUND
      );
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
        OR: [{ BaseToken: { id: parsedId } }, { QuoteToken: { id: parsedId } }],
      },
      orderBy: { volume: 'desc' },
      take: Number.parseInt(limit, 10),
      include: {
        BaseToken: {
          include: {
            TokenBlockchainRecords: true,
          },
        },
        QuoteToken: true,
        Exchange: {
          include: { Blockchain: { include: { ParentToken: true } } },
        },
      },
    });

    return {
      items: pairs.map((pair) => ({
        base: {
          id: pair.BaseToken.id,
          slug: pair.BaseToken.cmc_slug,
          cmc: pair.BaseToken.cmc_id,
          symbol: pair.BaseToken.symbol,
          address: pair.BaseToken.TokenBlockchainRecords[0]?.address || '',
          image: '',
        },
        quote: {
          id: pair.QuoteToken.id,
          slug: pair.QuoteToken.cmc_slug,
          cmc: pair.QuoteToken.cmc_id,
          symbol: pair.QuoteToken.symbol,
          image: '',
        },
        platform: {
          id: pair.Exchange.Blockchain.id,
          chainId: pair.Exchange.Blockchain.evm_chain_id,
          cmc: pair.Exchange.Blockchain.cmc_id,
          dexerTxHashFormat: pair.Exchange.Blockchain.explorer_tx_url_format,
        },
        liquidity: 0,
        dex: {
          id: pair.Exchange.id,
          name: pair.Exchange.name,
          cmc: pair.Exchange.cmc_id,
        },
        address: '',
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
        const tokens = await getCmcTokens();

        const limitedTokens = tokens
          .filter(([, info]) => info.isActive)
          .sort(([, l], [, r]) => l.rank - r.rank)
          .slice(0, TOKEN_LIMIT);

        const cmcTokenIds = limitedTokens.map(([id]) =>
          Number.parseInt(id, 10)
        );

        await txClient.token.deleteMany({
          where: {
            cmc_id: {
              notIn: cmcTokenIds,
            },
            OwnedBlockchain: null,
          },
        });

        const stats = await getCmcStats(cmcTokenIds);
        const platformsCmc = await getPlatformsData();
        const platformsCmcMap = new Map(
          platformsCmc.map((t) => [t.cryptoId, t])
        );

        await Promise.all(
          limitedTokens.map(async ([id, info]) => {
            const parsedId = Number.parseInt(id, 10);

            const stat = stats[id];

            const parentBlockchain =
              stat.platform && platformsCmcMap.get(stat.platform.id);

            const tokenInfo = {
              symbol: info.symbol,
              name: info.name,
              cmc_added_date: stat.date_added,
              launched_date: stat.date_added,
              description: '',
              category: '',
              price: stat.quote.USD.price.toString(),
              price_change_perc_1h: stat.quote.USD.percent_change_1h,
              price_change_perc_24h: stat.quote.USD.percent_change_24h,
              price_change_perc_7d: stat.quote.USD.percent_change_7d,
              market_cap: stat.quote.USD.market_cap?.toString(),
              market_cap_change_perc_24h: 0,
              fully_diluted_market_cap:
                stat.quote.USD.fully_diluted_market_cap?.toString(),
              fully_diluted_market_cap_change_perc_24h: 0,
              circulating_supply: stat.circulating_supply?.toString(),
              total_supply: stat.total_supply?.toString(),
              self_reported_circulating_supply:
                stat.self_reported_circulating_supply?.toString(),
              volume: stat.quote.USD.volume_24h?.toString(),
              volume_change_perc_24h: stat.quote.USD.volume_change_24h,
              TokenBlockchainRecords: parentBlockchain
                ? {
                    connectOrCreate: {
                      where: {
                        blockchain_cmc_id_address: {
                          address: stat.platform.token_address,
                          blockchain_cmc_id: parentBlockchain.id,
                        },
                      },
                      create: {
                        address: stat.platform.token_address,
                        Blockchain: {
                          connect: {
                            parent_token_cmc_id: stat.platform.id,
                          },
                        },
                      },
                    },
                  }
                : undefined,
            };

            return txClient.token.upsert({
              where: { cmc_id: parsedId },
              create: {
                ...tokenInfo,
                cmc_id: parsedId,
                cmc_slug: info.slug,
              },
              update: tokenInfo,
              select: null,
            });
          })
        );
      },
      { timeout: POSTGRES_TX_TIMEOUT }
    );

    Logger.debug(`syncTokens done`);
  }

  private async syncPlatforms(): Promise<void> {
    Logger.debug(`syncPlatforms start`);

    await this.prisma.$transaction(
      async (txClient) => {
        const platformsCmc = await getPlatformsData();
        const platformsCmcMap = new Map(
          platformsCmc.map((t) => [t.cryptoId, t])
        );

        const tokens = await getCmcTokens();

        const parentTokens = tokens.filter(([id]) =>
          platformsCmcMap.has(Number.parseInt(id, 10))
        );

        const cmcTokenIds = parentTokens.map(([id]) => Number.parseInt(id, 10));

        await txClient.token.deleteMany({
          where: {
            OwnedBlockchain: {
              id: {
                gt: 0,
              },
            },
            cmc_id: {
              notIn: cmcTokenIds,
            },
          },
        });

        const stats = await getCmcStats(cmcTokenIds);

        await Promise.all(
          parentTokens.map(async ([id, info]) => {
            const parsedId = Number.parseInt(id, 10);

            const stat = stats[id];

            const blockchain = platformsCmcMap.get(parsedId);

            const tokenInfo = {
              symbol: info.symbol,
              name: info.name,
              cmc_added_date: stat.date_added,
              launched_date: stat.date_added,
              description: '',
              category: '',
              price: stat.quote.USD.price.toString(),
              price_change_perc_1h: stat.quote.USD.percent_change_1h,
              price_change_perc_24h: stat.quote.USD.percent_change_24h,
              price_change_perc_7d: stat.quote.USD.percent_change_7d,
              market_cap: stat.quote.USD.market_cap?.toString(),
              market_cap_change_perc_24h: 0,
              fully_diluted_market_cap:
                stat.quote.USD.fully_diluted_market_cap?.toString(),
              fully_diluted_market_cap_change_perc_24h: 0,
              circulating_supply: stat.circulating_supply?.toString(),
              total_supply: stat.total_supply?.toString(),
              self_reported_circulating_supply:
                stat.self_reported_circulating_supply?.toString(),
              volume: stat.quote.USD.volume_24h?.toString(),
              volume_change_perc_24h: stat.quote.USD.volume_change_24h,
              OwnedBlockchain: blockchain
                ? {
                    connectOrCreate: {
                      create: {
                        cmc_id: blockchain.id,
                        evm_chain_id: blockchain.chanId,
                        name: blockchain.dexerPlatformName,
                        explorer_addr_url_format: blockchain.addressExplorerUrl,
                        explorer_token_url_format: blockchain.explorerUrlFormat,
                        explorer_tx_url_format: blockchain.dexerTxhashFormat,
                      },
                      where: {
                        cmc_id: blockchain.id,
                      },
                    },
                  }
                : undefined,
            };

            return txClient.token.upsert({
              where: { cmc_id: parsedId },
              create: {
                ...tokenInfo,
                cmc_id: parsedId,
                cmc_slug: info.slug,
              },
              update: tokenInfo,
              select: null,
            });
          })
        );
      },
      { timeout: POSTGRES_TX_TIMEOUT }
    );

    Logger.debug(`syncPlatforms done`);
  }

  private async syncDexs(): Promise<void> {
    Logger.debug(`syncDexs start`);

    await this.prisma.$transaction(
      async (txClient) => {
        const supportedBlockchains = await txClient.blockchain.findMany({
          select: { cmc_id: true },
        });

        const supportedBlockchainsSet = new Set(
          supportedBlockchains.map((bc) => bc.cmc_id)
        );

        const exchanges = await getDexExchangesData();

        await Promise.all(
          exchanges
            .filter((exchange) =>
              supportedBlockchainsSet.has(exchange.platformId)
            )
            .map(async (exchange) => {
              const data = {
                name: exchange.dexerName,
                txs_24h: Number.parseInt(exchange.txns24h, 10),
                liquidity_score: exchange.liquidityScore
                  ? Number.parseFloat(exchange.liquidityScore)
                  : undefined,
                exchange_score: exchange.exchangeScore
                  ? Number.parseFloat(exchange.exchangeScore)
                  : undefined,
                volume_1h: exchange.volume1h,
                volume_24h: exchange.volume24h,
                Type: ExchangeType.DEX,
              };

              return txClient.exchange.upsert({
                where: { cmc_id: exchange.dexerId },
                update: data,
                create: {
                  ...data,
                  cmc_id: exchange.dexerId,
                  Blockchain: { connect: { cmc_id: exchange.platformId } },
                },
              });
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
      select: { cmc_id: true, symbol: true },
    });

    const throttled = throttle(async (token: Token) => {
      await this.prisma.$transaction(async (txClient) => {
        const exchangePairs = await getExchangePairs(token.cmc_id);

        await Promise.all(
          exchangePairs.map(async (pair) => {
            const supportedExchange = await this.prisma.exchange.findFirst({
              where: { cmc_id: pair.exchangeId },
              select: null,
            });

            const supportedTokens = await Promise.all(
              [pair.baseCurrencyId, pair.quoteCurrencyId].map(async (id) =>
                this.prisma.token.findFirst({
                  where: { cmc_id: id },
                  select: null,
                })
              )
            );

            if (!supportedExchange || !supportedTokens.every(Boolean)) {
              return null;
            }

            const data = {
              volume: pair.volumeUsd.toString(),
              price: pair.price.toString(),
              category: pair.category,
            };

            return txClient.exchangePair.upsert({
              where: {
                base_token_cmc_id_quote_token_cmc_id_exchange_cmc_id: {
                  base_token_cmc_id: pair.baseCurrencyId,
                  quote_token_cmc_id: pair.quoteCurrencyId,
                  exchange_cmc_id: pair.exchangeId,
                },
              },
              update: data,
              create: {
                ...data,
                BaseToken: {
                  connect: { cmc_id: pair.baseCurrencyId },
                },
                QuoteToken: {
                  connect: { cmc_id: pair.quoteCurrencyId },
                },
                Exchange: {
                  connect: { cmc_id: pair.exchangeId },
                },
              },
            });
          })
        );
      });

      Logger.debug(`syncPairs synced ${token.symbol}`);
    });

    await Promise.all(tokens.slice(0, 100).map(throttled));

    Logger.debug(`syncPairs done`);
  }
}
