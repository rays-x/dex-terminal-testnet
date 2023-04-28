import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsObject } from 'class-validator';
import { Types } from 'mongoose';

export default class TokenIdDto {
  @IsObject()
  @IsMongoId()
  @ApiProperty()
  id!: Types.ObjectId;
}
