import {
  IsEnum,
  IsMongoId,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { TokensSortBy, TokensSortOrder } from './coinMarketCapScraper';

export class SwapTokensQueryDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  search?: string;

  @IsOptional()
  @IsMongoId()
  @ApiPropertyOptional({
    type: String,
  })
  exclude!: Types.ObjectId | string;

  @IsMongoId()
  @ApiProperty({
    type: String,
  })
  chain!: Types.ObjectId | string;

  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional()
  limit?: string = '0';

  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional()
  offset?: string = '0';

  @IsOptional()
  @IsEnum(TokensSortBy)
  @ApiPropertyOptional({
    enum: TokensSortBy,
  })
  sortBy?: TokensSortBy = TokensSortBy.marketCap;

  @IsOptional()
  @IsEnum(TokensSortOrder)
  @ApiPropertyOptional({
    enum: TokensSortOrder,
  })
  sortOrder?: TokensSortOrder = TokensSortOrder.desc;
}
