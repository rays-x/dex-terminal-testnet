import {get} from 'lodash';
import Redis from 'ioredis';
import {InjectRedisClient} from 'nestjs-ioredis-tags';
import got from 'got';
import {Inject} from '@nestjs/common';
import md5 from 'md5';
import {Logger} from '../config/logger/api-logger';
import {awaiter} from '../utils';
import {Network, TransactionsResponse} from '../dto/CoinMarketCapScraper';
import {CmcPairListResponse} from '../types';
import {CMC_ID_BTC_PLATFORM, CMC_ID_ETH_PLATFORM, CMC_USER_AGENT, REDIS_TAG} from '../constants';
import {BitQueryService} from './BitQuery';
import {CovalentService} from './Covalent';
import {OptionsOfJSONResponseBody} from 'got/dist/source/types';

type UniToken = {
  chainId: number;
  name: string;
  address: string;
  decimals: number;
  symbol: string;
  logoURI: string;
  slug: string;
}

export type CmcToken = {
  id: string,
  slug: string,
  name: string,
  symbol: string,
  logoURI: string,
  liquidity: number,
  volume: number,
  volumeChangePercentage24h: number,
  circulatingSupply: number,
  marketCap: number,
  price: number,
  priceChangePercentage1h: number,
  priceChangePercentage24h: number,
  cmcId: number
}

const DEFAULT_AWAIT_TIME: number = 0.65 * 1000;

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export class CoinMarketCapScraperService {

  awaiterPairsList: {
    [k: string]: boolean
  } = {};
  awaitTime: number = DEFAULT_AWAIT_TIME;
  _uniTokens: {
    [k: string]: {
      address: string
      slug: string
    }
  } = {};
  _panTokens: {
    [k: string]: {
      address: string
      slug: string
    }
  } = {};

  constructor(
    @InjectRedisClient(REDIS_TAG) private readonly redisClient: Redis,
    @Inject(BitQueryService) private readonly bitQueryService: BitQueryService,
    @Inject(CovalentService) private readonly covalentService: CovalentService
  ) {
  }

  async tokens(networks: Network[] = [Network.bsc, Network.eth]): Promise<CmcToken[]> {
    const tokens = networks.reduce((tokens, network) => {
      switch(network) {
        case Network.bsc: {
          return [...tokens, ...Object.values(this._panTokens)];
        }
        case Network.eth: {
          return [...tokens, ...Object.values(this._uniTokens)];
        }
      }
    }, []);
    return (await Promise.all(tokens.map(async token => {
      const data = JSON.parse(await this.redisClient.get(`cmc:ait:${token.slug}`) || 'null');
      if(!data) {
        return null;
      }
      if(data.status !== 'active') {
        return;
      }
      return {
        id: data.id,
        slug: token.slug,
        name: data.name,
        symbol: data.symbol,
        logoURI: `https://s2.coinmarketcap.com/static/img/coins/64x64/${data.id}.png`,
        liquidity: data.statistics.fullyDilutedMarketCap,
        volume: data.volume,
        volumeChangePercentage24h: data.volumeChangePercentage24h,
        circulatingSupply: Number(data.statistics.circulatingSupply) || Number(data.selfReportedCirculatingSupply || 0),
        marketCap: data.statistics.marketCap,
        price: data.statistics.price,
        priceChangePercentage1h: data.statistics.priceChangePercentage1h,
        priceChangePercentage24h: data.statistics.priceChangePercentage24h,
        cmcId: data.id
      };
    }))).reduce((prev, item) => {
      if(!item || prev.findIndex(({cmcId}) => item?.cmcId === cmcId) > -1) {
        return prev;
      }
      return [...prev, item];
    }, []);
  }

  async pairsInfo(platform: string, pairs: string[]): Promise<{
    [k: string]: unknown
  }> {
    const cacheKey = `cmc:pairInfo:${platform}:${md5(pairs.join(','))}`;
    const cache = JSON.parse(await this.redisClient.get(cacheKey) || 'null');
    const result = {};
    if(cache) {
      return cache;
    }
    await Promise.all(pairs.map(async (pair) => {
      const body = await this.proxyRequest(`https://api.coinmarketcap.com/dexer/v3/dexer/pair-info`, {
        headers: {
          'user-agent': CMC_USER_AGENT,
          'accept-encoding': 'gzip, deflate, br'
        },
        searchParams: {
          base: 0,
          t: new Date().getTime(),
          'dexer-platform-name': platform,
          address: pair
        },
        responseType: 'json'
      });
      const data = get(body, 'data');
      if(data) {
        result[data['address']] = data;
      }
    }));
    if(pairs.length === Object.keys(result).length) {
      await this.redisClient.set(cacheKey, JSON.stringify(result), 'PX', 30 * 24 * 60 * 60 * 1000);
    }
    return result;
  }

  async pairsList(address: string, platform: number): Promise<any> {
    const cacheKey = `cmc:pairList:${platform}:${md5(address)}`;
    if(cacheKey in this.awaiterPairsList) {
      return [];
    }
    const cache = JSON.parse(await this.redisClient.get(cacheKey) || 'null');
    if(cache) {
      return cache;
    }
    if(!(cacheKey in this.awaiterPairsList)) {
      this.awaiterPairsList[cacheKey] = true;
    }
    try {
      const getData = async (params, prev: CmcPairListResponse['data']): Promise<CmcPairListResponse['data']> => {
        const {data} = await this.proxyRequest<CmcPairListResponse>(`https://api.coinmarketcap.com/dexer/v3/dexer/pair-list`, {
          headers: {
            'user-agent': CMC_USER_AGENT,
            'accept-encoding': 'gzip, deflate, br'
          },
          searchParams: params,
          responseType: 'json'
        });
        return !data?.length
          ? prev
          : await getData({
            ...params,
            start: params.start + 100
          }, [...prev, ...data]);
      };
      const data = await getData({
        'base-address': address,
        start: 1,
        limit: 100,
        'platform-id': platform
      }, []);
      const result = data?.filter((item => item.platform.id === platform)).sort((a, b) => {
        return Number(b.volume24h) - Number(a.volume24h);
      });
      if(data) {
        await this.redisClient.set(cacheKey, JSON.stringify(result), 'PX', 30 * 24 * 60 * 60 * 1000);
      }
      if(cacheKey in this.awaiterPairsList) {
        delete this.awaiterPairsList[cacheKey];
      }
      return result;
    } catch(e) {
      if(cacheKey in this.awaiterPairsList) {
        delete this.awaiterPairsList[cacheKey];
      }
    }
    return [];
  }

  async transactions(btcPairs: string[], ethPairs: string[]): Promise<TransactionsResponse['data']['transactions']> {
    const pairs: {
      [k: string]: TransactionsResponse['data']['transactions']
    } = Object.fromEntries(await Promise.all([
      ...btcPairs.map(pairId => [CMC_ID_BTC_PLATFORM, pairId]),
      ...ethPairs.map(pairId => [CMC_ID_ETH_PLATFORM, pairId])
    ].map(async ([key, params]) => {
      const [pairId, reversOrder, from] = String(params).split('_');
      const {
        data: {transactions}
      } = await this.proxyRequest<TransactionsResponse>(undefined, {
        headers: {
          'user-agent': CMC_USER_AGENT,
          'accept-encoding': 'gzip, deflate, br'
        },
        url: 'https://api.coinmarketcap.com',
        pathname: `/kline/v3/k-line/transactions/${key}/${pairId}`,
        searchParams: from ? {
          'reverse-order': reversOrder === 'true',
          from
        } : {
          'reverse-order': reversOrder === 'true'
        },
        responseType: 'json'
      });
      return [
        pairId,
        transactions.map(_ => ({
          pairId,
          exchange: key === CMC_ID_BTC_PLATFORM ? 'pancakeswap' : 'uniswap',
          ..._
        }))
      ];
    })));
    const pairsIds = Object.keys(pairs);
    const lastTime = pairsIds.reduce((prev, pairId) => {
      const transactions = pairs[pairId];
      const lastElementTime = Number(get(transactions.at(-1), 'time'));
      if(isNaN(prev)) {
        return lastElementTime;
      }
      return lastElementTime < prev ? lastElementTime : prev;
    }, NaN);
    if(isNaN(lastTime)) {
      return [];
    }
    return Object.values(pairs).reduce((prev, transactions) => {
      const filtered = transactions.filter(transaction => Number(transaction.time) >= lastTime);
      return [...prev, ...filtered];
    }, []).sort((a, b) => Number(b.time) - Number(a.time));
  }

  private async proxyRequest<T>(_url: string = undefined, {
    url = undefined,
    pathname = undefined,
    searchParams = undefined,
    ...rest
  }: OptionsOfJSONResponseBody) {
    try {
      console.log(_url, {
        url,
        pathname,
        searchParams,
        ...rest,
        resolveBodyOnly: true
      });
      return await got.get<T>(_url, {
        url,
        pathname,
        searchParams,
        ...rest,
        resolveBodyOnly: true
      });
    } catch(e) {
      Logger.debug(`mirror request ${get(e, 'message', e)} ${{
        url: _url || url,
        pathname,
        searchParams
      }}`);
      /*const uri = `${_url || url}${pathname || ''}${qs.stringify(searchParams || {}, {
        addQueryPrefix: true
      })}`;
      const encodeUri = encodeURIComponent(uri);
      return got.get<T>(`https://translate.yandex.ru/translate?url=${encodeUri}`, {
        ...rest,
        followRedirect: true,
        resolveBodyOnly: true
      });*/
      const {host} = new URL(_url || url);
      const hostReplaced = `${host.replace(/\./g, '-')}.translate.goog`;
      if(_url) {
        _url = _url.replace(host, hostReplaced);
      }
      if(url) {
        url = _url.replace(host, hostReplaced);
      }
      return got.get<T>(_url, {
        url,
        pathname,
        searchParams,
        ...rest,
        resolveBodyOnly: true
      });
    }
  }

  private async getUniTokens(): Promise<typeof this._uniTokens> {
    const cacheKey = 'cmc:getUniswapTokens';
    const cache = JSON.parse(await this.redisClient.get(cacheKey) || 'null');
    if(cache) {
      this._uniTokens = cache;
      return cache;
    }
    Logger.debug(`waiting for: ${cacheKey}...`);
    const {fields, values} = await this.proxyRequest<{
      fields: string[],
      values: any[][],
    }>('https://s3.coinmarketcap.com/generated/core/crypto/cryptos.json', {
      responseType: 'json'
    });
    const slugIndex = fields.indexOf('slug');
    const addressIndex = fields.indexOf('address');
    const slugs: {
      [k: string]: string[]
    } = Object.fromEntries(
      values
      .filter(_ => _[addressIndex].length)
      .map((item) => [
        item[slugIndex],
        item[addressIndex].map(_ => _.toLowerCase())
      ])
    );
    const {tokens} = await this.proxyRequest <{
      tokens: Omit<UniToken, 'slug'>[]
    }>('https://api.coinmarketcap.com/data-api/v3/uniswap/all.json', {
      responseType: 'json'
    });
    this._uniTokens = Object.fromEntries(tokens.reduce((prev, {address = ''}) => {
      let slug = Object.entries(slugs).find(([, addresses]) => {
        return addresses.find(_ => _.includes(address.toLowerCase()));
      })?.shift();
      switch(slug) {
        case 'weth': {
          slug = 'ethereum';
          break;
        }
      }
      return slug ? [
        ...prev,
        [
          slug,
          {
            address,
            slug
          }
        ]
      ] : prev;
    }, []));
    await this.redisClient.set(cacheKey, JSON.stringify(this._uniTokens), 'PX', 24 * 60 * 60 * 1000);
    return this._uniTokens;
  }

  private async getPanTokens(): Promise<typeof this._panTokens> {
    const cacheKey = 'cmc:getPancakeswapTokens';
    const cache = JSON.parse(await this.redisClient.get(cacheKey) || 'null');
    if(cache) {
      this._panTokens = cache;
      return cache;
    }
    Logger.debug(`waiting for: ${cacheKey}...`);
    const {fields, values} = await this.proxyRequest<{
      fields: string[],
      values: any[][],
    }>('https://s3.coinmarketcap.com/generated/core/crypto/cryptos.json', {
      responseType: 'json'
    });
    const slugIndex = fields.indexOf('slug');
    const addressIndex = fields.indexOf('address');
    const slugs: [string, string[]][] =
      values
      .filter(_ => _[addressIndex].length)
      .map((item) => [
        item[slugIndex],
        item[addressIndex].map(_ => _.toLowerCase()).join(',')
      ]);
    const body = await got.get('https://api.covalenthq.com/v1/56/xy=k/pancakeswap_v2/tokens/', {
      searchParams: {
        key: 'ckey_65c7c5729a7141889c2cdea0556',
        'page-size': 50000
      },
      resolveBodyOnly: true
    });
    const items = body.match(/"0x.{40}",/gm)?.map(_ => _.substring(1, 42).toLowerCase());
    this._panTokens = Object.fromEntries(items.reduce((prev, address) => {
      const slug = get(slugs.find(([, addresses]) => {
        return addresses.includes(address);
      }), 0);
      return slug ? [
        ...prev,
        [
          slug,
          {
            address,
            slug
          }
        ]
      ] : prev;
    }, []));
    await this.redisClient.set(cacheKey, JSON.stringify(this._panTokens), 'PX', 24 * 60 * 60 * 1000);
    return this._panTokens;
  }

  private async getTokenData(slug: string) {
    await awaiter(this.awaitTime);
    const body = await this.proxyRequest<string>(`https://coinmarketcap.com/currencies/${slug}/`, {
      headers: {
        'user-agent': CMC_USER_AGENT,
        'accept-encoding': 'gzip, deflate, br'
      }
    });
    const regex = body.match(/<script id="__NEXT_DATA__" type="application\/json">(?<jsonData>.+)<\/script>/m);
    const data = JSON.parse(get(regex, 'groups.jsonData', 'null') || 'null');
    return get(data, 'props.pageProps.info');
  }
}
