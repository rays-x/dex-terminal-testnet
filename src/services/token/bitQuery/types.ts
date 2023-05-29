export interface TradesResponse {
  data: {
    ethereum: {
      dexTrades: {
        date: {
          date: string;
        };
        trades: string;
        amount: number;
        contracts: string;
        currencies: string;
      }[];
    };
  };
}
