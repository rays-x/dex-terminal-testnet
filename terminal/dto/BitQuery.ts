import {IsArray, IsOptional, IsString} from 'class-validator';
import {ApiPropertyOptional} from '@nestjs/swagger';

export class QueryStatsTransferDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  btcAddress?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  ethAddress?: string;
}

export class QueryStatsPairStatisticsDto {
  @IsOptional()
  @IsArray()
  @IsString({
    each: true
  })
  @ApiPropertyOptional({
    type: String,
    isArray: true
  })
  btcAddress_poolContract: string[] = [];

  @IsOptional()
  @IsArray()
  @IsString({
    each: true
  })
  @ApiPropertyOptional({
    type: String,
    isArray: true
  })
  ethAddress_poolContract: string[] = [];
}