import {IsOptional, IsString} from 'class-validator';
import {ApiPropertyOptional} from '@nestjs/swagger';

export class QueryStatsLiquidityDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  btcAddress?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  ethAddress?: string;
}