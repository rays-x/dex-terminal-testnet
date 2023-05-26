-- CreateEnum
CREATE TYPE "ExchangeType" AS ENUM ('DEX', 'CEX');

-- CreateTable
CREATE TABLE "Token" (
    "id" SERIAL NOT NULL,
    "coingecko_slug" TEXT NOT NULL,
    "cmc_slug" TEXT,
    "image" TEXT,
    "launched_date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "price_change_perc_1h" DOUBLE PRECISION,
    "price_change_perc_24h" DOUBLE PRECISION,
    "price_change_perc_7d" DOUBLE PRECISION,
    "price_btc" TEXT NOT NULL,
    "price_eth" TEXT NOT NULL,
    "price_change_btc_perc_24h" DOUBLE PRECISION NOT NULL,
    "price_change_eth_perc_24h" DOUBLE PRECISION NOT NULL,
    "market_cap" TEXT,
    "market_cap_rank" INTEGER,
    "market_cap_change_perc_24h" DOUBLE PRECISION,
    "fully_diluted_market_cap" TEXT,
    "fully_diluted_market_cap_change_perc_24h" DOUBLE PRECISION,
    "self_reported_circulating_supply" TEXT,
    "circulating_supply" TEXT,
    "total_supply" TEXT,
    "volume" TEXT,
    "volume_change_perc_24h" DOUBLE PRECISION,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blockchain" (
    "id" SERIAL NOT NULL,
    "coingecko_slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "evm_chain_id" INTEGER,
    "explorer_tx_url_format" TEXT,
    "explorer_addr_url_format" TEXT,
    "explorer_token_url_format" TEXT,

    CONSTRAINT "Blockchain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenBlockchainRecord" (
    "address" TEXT NOT NULL,
    "token_id" INTEGER,
    "blockchain_coingecko_slug" TEXT NOT NULL,

    CONSTRAINT "TokenBlockchainRecord_pkey" PRIMARY KEY ("blockchain_coingecko_slug","address")
);

-- CreateTable
CREATE TABLE "ExchangePair" (
    "pool_name" TEXT NOT NULL,
    "coingecko_pool_id" TEXT NOT NULL,
    "volume" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "price_change_perc_24h" DOUBLE PRECISION NOT NULL,
    "sells_count" INTEGER NOT NULL,
    "buys_count" INTEGER NOT NULL,
    "trades_count" INTEGER NOT NULL,
    "unique_buyers_count" INTEGER NOT NULL,
    "unique_sellers_count" INTEGER NOT NULL,
    "reserve_in_usd" TEXT NOT NULL,
    "exchange_coingecko_slug" TEXT NOT NULL,
    "base_token_blockchain_record_address" TEXT NOT NULL,
    "quote_token_blockchain_record_address" TEXT NOT NULL,
    "base_token_blockchain_slug" TEXT NOT NULL,
    "quote_token_blockchain_slug" TEXT NOT NULL,

    CONSTRAINT "ExchangePair_pkey" PRIMARY KEY ("base_token_blockchain_record_address","base_token_blockchain_slug","quote_token_blockchain_record_address","quote_token_blockchain_slug","exchange_coingecko_slug")
);

-- CreateTable
CREATE TABLE "Exchange" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "coingecko_slug" TEXT NOT NULL,
    "blockchain_id" INTEGER NOT NULL,
    "Type" "ExchangeType" NOT NULL,

    CONSTRAINT "Exchange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Token_coingecko_slug_key" ON "Token"("coingecko_slug");

-- CreateIndex
CREATE INDEX "Token_coingecko_slug_idx" ON "Token"("coingecko_slug");

-- CreateIndex
CREATE INDEX "Token_symbol_idx" ON "Token"("symbol");

-- CreateIndex
CREATE INDEX "Token_market_cap_rank_idx" ON "Token"("market_cap_rank");

-- CreateIndex
CREATE UNIQUE INDEX "Blockchain_coingecko_slug_key" ON "Blockchain"("coingecko_slug");

-- CreateIndex
CREATE INDEX "Blockchain_coingecko_slug_idx" ON "Blockchain"("coingecko_slug");

-- CreateIndex
CREATE INDEX "TokenBlockchainRecord_address_idx" ON "TokenBlockchainRecord"("address");

-- CreateIndex
CREATE INDEX "ExchangePair_exchange_coingecko_slug_idx" ON "ExchangePair"("exchange_coingecko_slug");

-- CreateIndex
CREATE INDEX "ExchangePair_reserve_in_usd_idx" ON "ExchangePair"("reserve_in_usd");

-- CreateIndex
CREATE UNIQUE INDEX "Exchange_coingecko_slug_key" ON "Exchange"("coingecko_slug");

-- CreateIndex
CREATE INDEX "Exchange_coingecko_slug_idx" ON "Exchange"("coingecko_slug");

-- AddForeignKey
ALTER TABLE "TokenBlockchainRecord" ADD CONSTRAINT "TokenBlockchainRecord_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "Token"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenBlockchainRecord" ADD CONSTRAINT "TokenBlockchainRecord_blockchain_coingecko_slug_fkey" FOREIGN KEY ("blockchain_coingecko_slug") REFERENCES "Blockchain"("coingecko_slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangePair" ADD CONSTRAINT "ExchangePair_base_token_blockchain_slug_base_token_blockch_fkey" FOREIGN KEY ("base_token_blockchain_slug", "base_token_blockchain_record_address") REFERENCES "TokenBlockchainRecord"("blockchain_coingecko_slug", "address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangePair" ADD CONSTRAINT "ExchangePair_quote_token_blockchain_slug_quote_token_block_fkey" FOREIGN KEY ("quote_token_blockchain_slug", "quote_token_blockchain_record_address") REFERENCES "TokenBlockchainRecord"("blockchain_coingecko_slug", "address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangePair" ADD CONSTRAINT "ExchangePair_exchange_coingecko_slug_fkey" FOREIGN KEY ("exchange_coingecko_slug") REFERENCES "Exchange"("coingecko_slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_blockchain_id_fkey" FOREIGN KEY ("blockchain_id") REFERENCES "Blockchain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
