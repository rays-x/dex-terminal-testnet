import {Types} from 'mongoose';

export interface TokenSwapsItem {
  id: Types.ObjectId | string;
  date: Date | string;
  countTxs?: number;
  tradeAmountUsd?: number;
}