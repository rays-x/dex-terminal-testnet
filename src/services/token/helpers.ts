import got from 'got';

import { PrismaClient, Token, TokenBlockchainRecord } from 'generated/client';
import { CmcToken } from 'services/coinMarketCapScraper/types';
import { TokensSortBy, TokensSortOrder } from 'dto/coinMarketCapScraper';
import { TokenExchangeResponse } from '../../types/Token/TokenExchangeResponse';
import { MarketPairResponse } from '../../types/Token/TokenCMCPairResponse';
import { TokenCMCPlatformsResponse } from '../../types/Token/TokenCMCPlatformsResponse';
import { CMC_USER_AGENT } from '../../constants';

export async function getPlatformsData(): Promise<
  TokenCMCPlatformsResponse['data']
> {
  const {
    body: { data = [] },
  } = await got.get<TokenCMCPlatformsResponse>(
    'https://api.coinmarketcap.com/dexer/v3/dexer/platforms',
    { responseType: 'json' }
  );

  return data.filter(({ visibilityOnDexscan }) => visibilityOnDexscan);
}

export async function getDexExchangesData(): Promise<
  TokenExchangeResponse['data']['pairList']
> {
  const { body } = await got.get<TokenExchangeResponse>(
    'https://api.coinmarketcap.com/dexer/v3/platformpage/platform-dexers',
    { responseType: 'json' }
  );

  return body.data.pairList;
}

export async function getExchangePairs(
  cmcId: number,
  exchangeType: 'cex' | 'dex' = 'dex',
  start = 1,
  limit = 15
) {
  const data = await got.get<MarketPairResponse>(
    'https://api.coinmarketcap.com/data-api/v3/cryptocurrency/market-pairs/latest',
    {
      headers: {
        'user-agent': CMC_USER_AGENT,
        'accept-encoding': 'gzip, deflate, br',
      },
      responseType: 'json',
      searchParams: {
        id: cmcId,
        start,
        limit,
        category: 'spot',
        centerType: exchangeType,
        sort: 'cmc_rank_advanced',
      },
    }
  );

  return data.body.data.marketPairs;
}

export function mapDbTokenToResponse(
  dbToken: Token & {
    TokenBlockchainRecords: TokenBlockchainRecord[];
  }
): CmcToken & { platforms: unknown[]; statistics: unknown } {
  return {
    id: dbToken.id.toString(),
    slug: dbToken.coingecko_slug,
    name: dbToken.name,
    symbol: dbToken.symbol.toUpperCase(),
    logoURI: dbToken.image || '',
    liquidity: Number.parseFloat(dbToken.fully_diluted_market_cap),
    volume: Number.parseFloat(dbToken.volume),
    volumeChangePercentage24h: dbToken.volume_change_perc_24h,
    circulatingSupply:
      Number(dbToken.circulating_supply) ||
      Number(dbToken.self_reported_circulating_supply || 0),
    marketCap: Number.parseFloat(dbToken.market_cap),
    price: Number.parseFloat(dbToken.price),
    priceChangePercentage1h: dbToken.price_change_perc_1h,
    priceChangePercentage24h: dbToken.price_change_perc_24h,
    platforms:
      dbToken.TokenBlockchainRecords?.map((t) => ({
        address: t.address,
        coingecko_slug: t.blockchain_coingecko_slug,
      })) || [],
    statistics: {
      price: dbToken.price,
      priceChangePercentage1h: dbToken.price_change_perc_1h,
      priceChangePercentage24h: dbToken.price_change_perc_24h,
      priceChangePercentage7d: dbToken.price_change_perc_7d,
      volume: Number.parseFloat(dbToken.volume),
      volumeChangePercentage24h: dbToken.volume_change_perc_24h,
      circulatingSupply:
        Number(dbToken.circulating_supply) ||
        Number(dbToken.self_reported_circulating_supply || 0),
      marketCap: Number.parseFloat(dbToken.market_cap),
      totalSupply: dbToken.total_supply,
      fullyDilutedMarketCap: dbToken.fully_diluted_market_cap,
      fullyDilutedMarketCapChangePercentage24h:
        dbToken.fully_diluted_market_cap_change_perc_24h,
    },
  };
}

export async function getSelectTokensQuery(
  prismaClient: PrismaClient,
  type: TokensSortBy,
  sortOrder: TokensSortOrder,
  limit: number,
  offset: number
  // search: string
): Promise<Token[]> {
  if (type === TokensSortBy.price) {
    return prismaClient.$queryRawUnsafe<Token[]>(
      `SELECT * FROM "Token" ORDER BY cast("Token".price as double precision) ${sortOrder} LIMIT ${limit} OFFSET ${offset}`
    );
  }

  if (type === TokensSortBy.circulatingSupply) {
    return prismaClient.$queryRawUnsafe<Token[]>(
      `SELECT * FROM "Token" ORDER BY cast("Token".circulating_supply as double precision) ${sortOrder} LIMIT ${limit} OFFSET ${offset}`
    );
  }

  if (type === TokensSortBy.volume) {
    return prismaClient.$queryRawUnsafe<Token[]>(
      `SELECT * FROM "Token" ORDER BY cast("Token".volume as double precision) ${sortOrder} LIMIT ${limit} OFFSET ${offset}`
    );
  }

  if (type === TokensSortBy.symbol) {
    return prismaClient.token.findMany({
      take: limit,
      orderBy: {
        symbol: sortOrder,
      },
      skip: offset,
    });
  }

  if (type === TokensSortBy.volumeChangePercentage24h) {
    return prismaClient.token.findMany({
      take: limit,
      orderBy: {
        volume_change_perc_24h: sortOrder,
      },
      skip: offset,
    });
  }

  if (type === TokensSortBy.priceChangePercentage1h) {
    return prismaClient.token.findMany({
      take: limit,
      orderBy: {
        price_change_perc_1h: sortOrder,
      },
      skip: offset,
    });
  }

  if (type === TokensSortBy.priceChangePercentage24h) {
    return prismaClient.token.findMany({
      take: limit,
      orderBy: {
        price_change_perc_24h: sortOrder,
      },
      skip: offset,
    });
  }

  return prismaClient.$queryRawUnsafe<Token[]>(
    `SELECT * FROM "Token" ORDER BY cast("Token".market_cap as double precision) ${sortOrder} LIMIT ${limit} OFFSET ${offset}`
  );
}
