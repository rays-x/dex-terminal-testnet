import got from 'got';
import pThrottle from 'p-throttle';
import { bitQueryNetworksMapper } from './constants';
import { TradesResponse } from './types';
import { Point } from '../types';

const { BITQUERY_API_KEY } = process.env;

export interface UniqueSendersResponse {
  data: {
    ethereum: {
      dexTrades?: {
        date: {
          date: string;
        };
        senders: string;
      }[];
    };
  };
}

const throttled = pThrottle({
  limit: 1,
  interval: 500,
})(
  async (
    network: string,
    poolAddress: string,
    tokenContractAddress: string,
    isoDate: string
  ) =>
    got.post<UniqueSendersResponse>('https://graphql.bitquery.io/', {
      responseType: 'json',
      headers: {
        accept: 'application/json',
        'accept-language': 'en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7',
        'content-type': 'application/json',
        'sec-ch-ua':
          '"Google Chrome";v="113", "Chromium";v="113", "Not-A.Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'x-api-key': BITQUERY_API_KEY,
      },
      body: JSON.stringify({
        query:
          'query ($network: EthereumNetwork!, $dateFormat: String!, $address: String!, $buyCurrency: String!, $date: ISO8601DateTime!) {\n  ethereum(network: $network) {\n    dexTrades(\n      options: {asc: "date.date"}\n      date: {is: $date}\n      smartContractAddress: {is: $address}\n      buyCurrency: {is: $buyCurrency}\n    ) {\n      date: date {\n        date(format: $dateFormat)\n      }\n      senders: countBigInt(uniq: senders)\n    }\n  }\n}\n',
        variables: `{\n  "network": "${network}",\n  "address": "${poolAddress}",\n  "date": "${isoDate}",\n  "dateFormat": "%Y-%m-%d",\n  "buyCurrency": "${tokenContractAddress}"\n}`,
      }),
    })
);
export async function countUniqueSenders(
  network: string,
  poolAddress: string,
  tokenContractAddress: string,
  isoDate: string
): Promise<number> {
  const response = await throttled(
    network,
    poolAddress,
    tokenContractAddress,
    isoDate
  );

  return Number.parseInt(
    response.body.data.ethereum.dexTrades?.[0]?.senders || '0',
    10
  );
}

export const getSwapsStats = pThrottle({
  limit: 1,
  interval: 600,
})(
  async (
    network: string,
    token: string,
    from: Date,
    till: Date
  ): Promise<Point[]> => {
    const { body } = await got.post<TradesResponse>(
      'https://graphql.bitquery.io/',
      {
        responseType: 'json',
        headers: {
          accept: 'application/json',
          'accept-language': 'en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7',
          'content-type': 'application/json',
          'sec-ch-ua':
            '"Google Chrome";v="113", "Chromium";v="113", "Not-A.Brand";v="24"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
          'x-api-key': BITQUERY_API_KEY,
        },
        body: JSON.stringify({
          query:
            'query ($network: EthereumNetwork!, $dateFormat: String!, $token: String!, $from: ISO8601DateTime, $till: ISO8601DateTime) {\n  ethereum(network: $network) {\n    dexTrades(\n      options: {asc: "date.date"}\n      date: {since: $from, till: $till}\n      baseCurrency: {is: $token}\n    ) {\n      date: date {\n        date(format: $dateFormat)\n      }\n      trades: countBigInt\n      amount: baseAmount\n      contracts: countBigInt(uniq: smart_contracts)\n      currencies: countBigInt(uniq: quote_currency)\n    }\n  }\n}\n',
          variables: `{\n  "network": "${network}",\n  "token": "${token}",\n  "from": "${from.toISOString()}",\n  "till": "${till.toISOString()}",\n  "dateFormat": "%Y-%m-%d"\n}`,
        }),
      }
    );

    return body.data.ethereum.dexTrades.map((data) => ({
      t: new Date(data.date.date).getTime(),
      v: Number.parseInt(data.trades, 10),
    }));
  }
);

export { bitQueryNetworksMapper };
