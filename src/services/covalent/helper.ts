import { get, set } from 'lodash';
import got from 'got';
import { CovalentStatsLiquidityQuery } from '../../types/Covalent/CovalentStatsTransfersQuery';

export async function getStatsLiquidity({
  chain,
  dex,
  token,
}: {
  chain: '1' | '56';
  dex: 'uniswap_v2' | 'pancakeswap_v2';
  token: string;
}): Promise<{ [date: string]: number }> {
  let page = 0;

  const summaryChart: { [date: string]: number } = {};

  while (true) {
    try {
      const {
        data: {
          items: liquiditySources,
          pagination: { has_more: hasMore },
        },
      } = await got.get<CovalentStatsLiquidityQuery>(
        `https://api.covalenthq.com/v1/${chain}/xy=k/${dex}/tokens/address/${token}/`,
        {
          searchParams: {
            'quote-currency': 'USD',
            format: 'JSON',
            'page-number': page,
            'page-size': 500,
            key: 'ckey_65c7c5729a7141889c2cdea0556',
          },
          resolveBodyOnly: true,
          responseType: 'json',
        }
      );

      const tokenLiquidityCharts = liquiditySources.map(
        (ls) => ls.liquidity_timeseries_30d
      );

      tokenLiquidityCharts.forEach((tokenLiquidityChart) => {
        tokenLiquidityChart.forEach((l) => {
          const date = String(l.dt).split('T').shift();
          set(
            summaryChart,
            date,
            l.liquidity_quote + get(summaryChart, date, 0)
          );
        });
      });

      if (!hasMore) {
        break;
      } else {
        page++;
      }
    } catch (e) {
      console.error(get(e, 'message', e));
      break;
    }
  }

  return summaryChart;
}
