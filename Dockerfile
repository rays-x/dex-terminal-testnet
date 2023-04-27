FROM node:19-alpine

WORKDIR /usr/src/app

COPY package.json ./

RUN set -ex; \
    apk add git g++ gcc libgcc libstdc++ linux-headers make python3; \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true yarn install --no-cache --frozen-lockfile; \
    yarn cache clean;

COPY . .
ARG BUILD_ENV
COPY ".env.$BUILD_ENV" ./.env

RUN set -ex; \
    yarn build; \
    rm -rf src;

VOLUME /usr/src/app/media

CMD [ "yarn", "serve" ]
