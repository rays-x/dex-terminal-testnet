import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export default class QueryPairsInfoDto {
  @IsString({
    each: true,
  })
  @ApiProperty({
    isArray: true,
  })
  pairs!: string[];

  @IsString()
  @ApiProperty()
  platform!: string;
}
