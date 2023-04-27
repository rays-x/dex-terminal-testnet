import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Network, TokensSortBy, TokensSortOrder } from '../constants';

export default class QueryTokensDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  search?: string;

  @IsOptional()
  @IsEnum(Network, {
    each: true,
  })
  @ApiPropertyOptional({
    type: Network,
    isArray: true,
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
