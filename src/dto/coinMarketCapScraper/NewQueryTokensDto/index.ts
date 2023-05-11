import {
  IsEnum,
  IsMongoId,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import { TokensSortBy, TokensSortOrder } from '../constants';

export default class NewQueryTokensDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  search?: string;

  @IsOptional()
  @IsMongoId({
    each: true,
  })
  @ApiPropertyOptional({
    type: String,
    isArray: true,
  })
  @Type(() => string)
  chains?: string[] = [];

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
