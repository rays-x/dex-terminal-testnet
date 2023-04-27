import {Types} from 'mongoose';

export interface TokenPairItem {
  id: Types.ObjectId | string;
  base: any;
  quote: any;
  dex: any;
  platform: any;
}
