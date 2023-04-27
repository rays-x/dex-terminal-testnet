import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export default class QueryStatsPairStatisticsDto {
  @IsOptional()
  @IsArray()
  @IsString({
    each: true,
  })
  @ApiPropertyOptional({
    type: String,
    isArray: true,
  })
  btcAddress_poolContract: string[] = [];

  @IsOptional()
  @IsArray()
  @IsString({
    each: true,
  })
  @ApiPropertyOptional({
    type: String,
    isArray: true,
  })
  ethAddress_poolContract: string[] = [];
}
