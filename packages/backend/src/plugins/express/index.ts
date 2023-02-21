import {Express, Router} from 'express';
import payload from 'payload';
import cors from 'cors';
import session, {SessionData} from 'express-session';
import connectRedis from 'connect-redis';
import Redis from 'ioredis';
import {TaggableCache as RedisTaggable} from 'cache-tags';
import cookieParser from 'cookie-parser';
import {get} from 'lodash';
import {REDIS_SESSION_PREFIX} from '../../constants';
import {parse} from 'cookie';

const RedisStore = connectRedis(session);
const RedisTaggableClient: Redis = new RedisTaggable({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379
});
const RedisSessionStore = new RedisStore({
  client: RedisTaggableClient,
  prefix: REDIS_SESSION_PREFIX
});
RedisSessionStore.set = function (sid: string, sess: SessionData, cb: (err) => void) {
  const $this = this;
  let args = [$this.prefix + sid];
  let value;
  // console.log('session',sess)
  try {
    value = $this.serializer.stringify(sess);
  } catch (er) {
    return cb(er);
  }
  args.push(value);
  args.push('EX', $this._getTTL(sess));
  const userId = get(sess, 'user.id');
  if (userId) {
    $this.client.tags([userId]).set(args, cb);
  } else {
    $this.client.set(args, cb);
  }
};
const expressPlugins = (express: Express) => {
  express.disable('x-powered-by');
  express.set('trust proxy', true);
  express.set('trust proxy', true);
  express.use(cors({
    origin: true,//[`${process.env.SERVER_URL}`, `${process.env.FRONTEND_URL}`, `${process.env.FRONTEND_MM_URL}`],
    allowedHeaders: [
      'Origin',
      'Keep-Alive',
      'User-Agent',
      'If-Modified-Since',
      'Cache-Control',
      'Content-Type',
      'X-Requested-With',
      'Accept',
      'Content-Encoding',
      'Cookie',
      'Set-Cookie',
      'Tus-Resumable',
      'Upload-Length',
      'Upload-Metadata',
      'Upload-Offset',
    ],
    preflightContinue: true,
    credentials: true
  }));
  express.use(cookieParser());
  express.use((req, res, next) => {
    if ('OPTIONS' === req.method) {
      return res.sendStatus(204);
    }
    if ('authorization' in req.headers && !get(req, `cookies.${process.env.SESSIONS_KEY}`)) {
      const authorization = get(req, 'headers.authorization', '').replace(/^Bearer\s/, '')
      if (!authorization) {
        return next();
      }
      const cookies = parse(get(req, 'headers.cookie', ''))
      cookies[`${process.env.SESSIONS_KEY}`] = authorization
      req.headers['cookie'] = Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join('; ')
    }
    return next();
  });
  express.use((req, res, next) => {
    let domain = process.env.SERVER_COOKIE_HOST || process.env.SERVER_HOST;
    /*let webDomain = undefined;
    try {
      webDomain = new URL(req.headers.origin || req.headers.referer).hostname;
    } catch(e) {
    }
    switch(webDomain) {
      case 'app.soulmate.tech': {
        domain = '.soulmate.tech';
        break;
      }
    }*/
    const expressSession = session({
      name: process.env.SESSIONS_KEY,
      store: RedisSessionStore,
      secret: process.env.COOKIE_SECRET,
      resave: true,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        maxAge: 6 * 30 * 24 * 60 * 60 * 1000,
        domain,
        // secure: true
        sameSite: 'lax'
      }
    });
    expressSession(req, res, next);
  });
  /*payloadInit(payload, {
    secret: process.env.PAYLOAD_SECRET,
    mongoURL: process.env.MONGO_CONNECTION_STRING,
    mongoOptions: {
      // useFindAndModify:false
    },
    express,
    local: true,
    onInit: (app) => {
      app.logger.info('Payload Initialized');
    }
  });*/
};
export default expressPlugins;