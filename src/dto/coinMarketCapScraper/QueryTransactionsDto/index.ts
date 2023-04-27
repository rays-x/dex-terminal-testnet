import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export default class QueryTransactionsDto {
  @IsOptional()
  @IsArray()
  @IsString({
    each: true,
  })
  @ApiPropertyOptional({
    type: String,
    isArray: true,
  })
  btcPairs!: string[];

  @IsOptional()
  @IsArray()
  @IsString({
    each: true,
  })
  @ApiPropertyOptional({
    type: String,
    isArray: true,
  })
  ethPairs!: string[];
}
