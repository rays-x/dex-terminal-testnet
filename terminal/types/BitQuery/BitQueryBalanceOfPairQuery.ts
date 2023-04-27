interface Currency {
  address: string;
  symbol: string;
}

interface Balance {
  value: number;
  currency: Currency;
}

interface Liquidity {
  address: string;
  balances: Balance[];
}

interface Pair {
  liquidity: Liquidity[];
}

interface Data {
  pair: Pair;
}


export interface BitQueryBalanceOfPairQuery {
  data: Data;
}
