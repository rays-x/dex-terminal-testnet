import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional } from 'class-validator';

export default class TokenPaginationDto {
  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional()
  limit?: string = '0';

  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional()
  offset?: string = '0';
}
