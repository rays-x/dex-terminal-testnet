import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export default class QueryPairListDto {
  @IsOptional()
  @IsString()
  @ApiProperty()
  ethAddress?: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  btcAddress?: string;
}
