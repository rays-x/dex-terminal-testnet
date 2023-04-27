interface Datum {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  strTime: Date;
}

interface Status {
  timestamp: Date;
  error_code: string;
  error_message: string;
  elapsed: string;
  credit_count: number;
}

export interface TokenCMCPairCandlesResponse {
  data: Datum[];
  status: Status;
}
