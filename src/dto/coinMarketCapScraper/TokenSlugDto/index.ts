import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export default class TokenSlugDto {
  @IsString()
  @ApiProperty()
  slug!: string;
}
