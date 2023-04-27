import {Types} from 'mongoose';

export interface TokenVolumeItem {
  id: Types.ObjectId;
  volume: number;
  marketCap: number;
  price: number;
  date: Date;
}