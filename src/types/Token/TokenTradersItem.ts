import { Types } from 'mongoose';

export interface TokenTradersItem {
  id: Types.ObjectId | string;
  date: Date | string;
  tradeAmount?: number;
  userCount?: number;
  swapsCount?: number;
}
