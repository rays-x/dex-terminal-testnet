export const USER_REQUEST_KEY = 'user';
export const REDIS_SESSION_PREFIX = 'sess:';
export const REDIS_TAG = 'ray.sx';
export const REDIS_SESSION_USER_ID_PREFIX = 'userSid:';
export const REDIS_RECOVER_PREFIX = 'recover:';
export const BCRYPT_SALT_ROUNDS = 12;
export const CMC_ID_ETH_PLATFORM = 1;
export const CMC_ID_BTC_PLATFORM = 14;
export const CMC_ID_USD_COIN = 2781;
export const CMC_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36';

export const PORT = Number.parseInt(process.env.PORT, 10) || 2050;
