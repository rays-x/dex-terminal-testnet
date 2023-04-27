import { IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export default class TokenIdStringDto {
  @IsMongoId()
  @ApiProperty()
  id!: string;
}
