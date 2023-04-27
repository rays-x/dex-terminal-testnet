interface Transaction {
  time: string;
  type: string;
  priceUsd: string;
  priceQuote: string;
  amount: string;
  totalUsd: string;
  totalQuote: string;
  txn: string;
}

interface Data {
  transactions: Transaction[];
  lastId: string;
}

interface Status {
  timestamp: Date;
  error_code: string;
  error_message: string;
  elapsed: string;
  credit_count: number;
}

export interface TransactionsResponse {
  data: Data;
  status: Status;
}
