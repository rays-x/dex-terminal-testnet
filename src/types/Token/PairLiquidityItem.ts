import { Types } from 'mongoose';

export interface PairLiquidityItem {
  id: Types.ObjectId | string;
  date: Date | string;
  liquidity: number;
}
