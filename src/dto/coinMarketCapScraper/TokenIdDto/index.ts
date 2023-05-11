import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export default class TokenIdDto {
  @IsString()
  @ApiProperty()
  id!: string;
}
