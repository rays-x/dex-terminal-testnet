export interface TokenTransactionsItem {
  time: string;
  type: string;
  priceUsd: string;
  priceQuote: string;
  amount: string;
  totalUsd: string;
  totalQuote: string;
  txn: string;
}

export interface TokenTransactionsResponse {
  [k: string]: TokenTransactionsItem[];
}