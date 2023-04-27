import {Types} from 'mongoose';

export interface TokenHoldersItem {
  id: Types.ObjectId | string;
  date: Date | string;
  count?: number;
}