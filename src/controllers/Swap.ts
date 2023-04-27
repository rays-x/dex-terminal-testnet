import { Controller, Get, HttpCode, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SwapTokensQueryDto } from '../dto/Token';
import { SwapService } from '../services/Swap';

@ApiTags('swap')
@Controller('/api/rest/swap')
export class SwapController {
  constructor(public service: SwapService) {}

  @Get('tokens')
  @HttpCode(200)
  async swap(@Query() args: SwapTokensQueryDto) {
    const { tokens, tokensCount } = await this.service.tokens(args);
    return {
      tokens,
      tokensCount,
    };
  }
}
