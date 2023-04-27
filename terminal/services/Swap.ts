import Redis from 'ioredis';
import {InjectRedisClient} from 'nestjs-ioredis-tags';
import {REDIS_TAG, TOKEN_CHAIN_IDS} from '../constants';
import TokenEntity, {TokenEntityDefaultPopulate} from '../entities/Token/Token';
import {ReturnModelType} from '@typegoose/typegoose';
import {InjectModel} from 'nestjs-typegoose';
import {TokensSortBy, TokensSortOrder} from '../dto/CoinMarketCapScraper';
import {SwapTokensQueryDto} from '../dto/Token';

const DEFAULT_AWAIT_TIME: number = 0.65 * 1000;

export class SwapService {

  awaitTime: number = DEFAULT_AWAIT_TIME;
  sharedFilter = {
    slug: {
      $exists: true
    },
    $or: [
      {
        volume: {$exists: true, $ne: 0}
      },
      {
        volumeChangePercentage24h: {$exists: true, $ne: 0}
      },
      {
        'statistics.priceChangePercentage1h': {$exists: true, $ne: 0}
      },
      {
        'statistics.priceChangePercentage24h': {$exists: true, $ne: 0}
      },
      {
        'statistics.marketCap': {$exists: true, $ne: 0}
      },
      {
        'statistics.marketCapChangePercentage24h': {$exists: true, $ne: 0}
      }
    ],
    volume: {$exists: true, $ne: 0},
    platforms: {
      $elemMatch: {
        platform: {
          $in: TOKEN_CHAIN_IDS
        }
      },
      $exists: true, $type: 'array', $ne: []
    }
  };

  constructor(
    @InjectRedisClient(REDIS_TAG) private readonly redisClient: Redis,
    @InjectModel(TokenEntity) private readonly repoToken: ReturnModelType<typeof TokenEntity>
  ) {
  }

  public async tokens({
                        chain,
                        search: _search,
                        limit,
                        offset,
                        sortBy,
                        sortOrder,
                        exclude
                      }: SwapTokensQueryDto): Promise<{
    tokens: any[],
    tokensCount: number
  }> {
    const search = _search?.toLowerCase();
    const filterShared = {
      ...this.sharedFilter,
      platforms: {
        ...this.sharedFilter.platforms,
        $elemMatch: {
          platform: chain
        }
      }
    };
    if(exclude) {
      filterShared['_id'] = {
        $ne: exclude
      };
    }
    const filter = search ? {
      $and: [
        {
          $or: [
            {
              name: {
                $regex: new RegExp(search, 'i')
              }
            },
            {
              symbol: {
                $regex: new RegExp(search, 'i')
              }
            },
            {
              platforms: {
                $elemMatch: {
                  address: {
                    $regex: new RegExp(search, 'i')
                  }
                }
              }
            }
          ]
        },
        {
          ...filterShared
        }
      ]
    } : filterShared;
    const [tokens, tokensCount] = await Promise.all([this.repoToken.find(filter).populate(TokenEntityDefaultPopulate)
    .skip(Number(offset))
    .limit(Number(limit || Infinity))
    .sort((() => {
      return `${sortOrder === TokensSortOrder.desc ? '-' : ''}${(() => {
        switch(sortBy) {
          case TokensSortBy.symbol: {
            return 'symbol';
          }
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
        }
      })()}`;
    })())
    .select([
      'name',
      'symbol',
      'cmc',
      'platforms'
    ]),
      this.repoToken.count(filter)
    ]);
    return {
      tokens: tokens.map((data) => {
        const platform = data.platforms.find(({platform}) => String(platform) === chain);
        return {
          id: data.id,
          name: data.name,
          symbol: data.symbol,
          logoURI: `https://s2.coinmarketcap.com/static/img/coins/64x64/${data.cmc}.png`,
          address: platform?.address,
          decimals: platform?.decimals
        };
      }),
      tokensCount
    };
  }
}
