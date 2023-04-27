import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export default class QueryStatsTransferDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  btcAddress?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  ethAddress?: string;
}
