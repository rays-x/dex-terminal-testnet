import { IsNumberString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export default class TokenIdNumberDto {
  @IsNumberString()
  @ApiProperty()
  id!: string;
}
