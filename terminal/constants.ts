import {Types} from 'mongoose';

export const USER_REQUEST_KEY = 'user';
export const REDIS_SESSION_PREFIX = 'sess:';
export const REDIS_TAG = 'ray.sx';
export const REDIS_SESSION_USER_ID_PREFIX = 'userSid:';
export const REDIS_RECOVER_PREFIX = 'recover:';
export const BCRYPT_SALT_ROUNDS = 12;
export const CMC_ID_ETH_PLATFORM = 1;
export const CMC_ID_BTC_PLATFORM = 14;
export const CMC_ID_USD_COIN = 2781;
export const CMC_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36';


export const TOKEN_CHAIN_IDS = [
  new Types.ObjectId('63a121a12afa55c2295c1255'),
  new Types.ObjectId('63a121a02afa55c2295c123d'),
  new Types.ObjectId('63a1f86f2afa55c2295d5ba0'),
  new Types.ObjectId('63a121a12afa55c2295c125b'),
  new Types.ObjectId('63a121a12afa55c2295c125a')
];