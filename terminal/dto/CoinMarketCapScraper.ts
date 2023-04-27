import {IsArray, IsEnum, IsMongoId, IsNumberString, IsOptional, IsString} from 'class-validator';
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {Types} from 'mongoose';

export enum TokensSortBy {
  symbol = 'symbol',
  volume = 'volume',
  volumeChangePercentage24h = 'volumeChangePercentage24h',

  marketCap = 'marketCap',
  liquidity = 'liquidity',
  circulatingSupply = 'circulatingSupply',
  price = 'price',
  priceChangePercentage1h = 'priceChangePercentage1h',
  priceChangePercentage24h = 'priceChangePercentage24h',
}

export enum TokensSortOrder {
  asc = 'asc',
  desc = 'desc',
}

export enum Network {
  bsc = 'bsc',
  eth = 'eth',
}

export enum Chains {
  bsc = 51,
  eth = 1,
}

export class QueryTokensDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  search?: string;

  @IsOptional()
  @IsEnum(Network, {
    each: true
  })
  @ApiPropertyOptional({
    type: Network,
    isArray: true
  })
  networks: Network[] = [Network.bsc, Network.eth];

  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional()
  limit?: string = '20';

  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional()
  offset?: string = '0';

  @IsOptional()
  @IsEnum(TokensSortBy)
  @ApiPropertyOptional({
    enum: TokensSortBy
  })
  sortBy?: TokensSortBy = TokensSortBy.marketCap;

  @IsOptional()
  @IsEnum(TokensSortOrder)
  @ApiPropertyOptional({
    enum: TokensSortOrder
  })
  sortOrder?: TokensSortOrder = TokensSortOrder.desc;
}

export class NewQueryTokensDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  search?: string;

  @IsOptional()
  @IsMongoId({
    each: true
  })
  @ApiPropertyOptional({
    type: String,
    isArray: true
  })
  chains?: Types.ObjectId[] = [];

  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional()
  limit?: string = '20';

  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional()
  offset?: string = '0';

  @IsOptional()
  @IsEnum(TokensSortBy)
  @ApiPropertyOptional({
    enum: TokensSortBy
  })
  sortBy?: TokensSortBy = TokensSortBy.marketCap;

  @IsOptional()
  @IsEnum(TokensSortOrder)
  @ApiPropertyOptional({
    enum: TokensSortOrder
  })
  sortOrder?: TokensSortOrder = TokensSortOrder.desc;
}

export class TokenIdDto {
  @IsMongoId()
  @ApiProperty()
  id!: Types.ObjectId;
}

export class TokenIdStringDto {
  @IsMongoId()
  @ApiProperty()
  id!: string;
}

export class TokenSlugDto {
  @IsString()
  @ApiProperty()
  slug!: string;
}

export class TokenPaginationDto {
  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional()
  limit?: string = '0';

  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional()
  offset?: string = '0';
}

export class QueryPairsInfoDto {
  @IsString({
    each: true
  })
  @ApiProperty({
    isArray: true
  })
  pairs!: string[];
  @IsString()
  @ApiProperty()
  platform!: string;
}

export class QueryPairListDto {
  @IsOptional()
  @IsString()
  @ApiProperty()
  ethAddress?: string;
  @IsOptional()
  @IsString()
  @ApiProperty()
  btcAddress?: string;
}

export class QueryTransactionsDto {
  @IsOptional()
  @IsArray()
  @IsString({
    each: true
  })
  @ApiPropertyOptional({
    type: String,
    isArray: true
  })
  btcPairs!: string[];
  @IsOptional()
  @IsArray()
  @IsString({
    each: true
  })
  @ApiPropertyOptional({
    type: String,
    isArray: true
  })
  ethPairs!: string[];
}

interface Transaction {
  time: string;
  type: string;
  priceUsd: string;
  priceQuote: string;
  amount: string;
  totalUsd: string;
  totalQuote: string;
  txn: string;
}

interface Data {
  transactions: Transaction[];
  lastId: string;
}

interface Status {
  timestamp: Date;
  error_code: string;
  error_message: string;
  elapsed: string;
  credit_count: number;
}

export interface TransactionsResponse {
  data: Data;
  status: Status;
}
