import { Controller, Get, HttpCode, Param, Query } from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import {
  NewQueryTokensDto,
  TokenIdDto,
  TokenIdStringDto,
  TokenPaginationDto,
  TokenSlugDto,
} from '../dto/coinMarketCapScraper';
import { TokenService } from '../services/token';

@ApiTags('token')
@Controller('/api/rest')
export class TokenController {
  constructor(public service: TokenService) {}

  @Get('tokens')
  @HttpCode(200)
  async tokens(@Query() { chains: _chains, ...args }: NewQueryTokensDto) {
    const chains = typeof _chains === 'string' ? [_chains] : _chains;
    const { tokens, tokensCount } = await this.service.tokens({
      chains,
      ...args,
    });
    return {
      tokens,
      tokensCount,
    };
  }

  @Get('token/:slug')
  @HttpCode(200)
  @ApiParam({
    name: 'slug',
    type: String,
  })
  async token(@Param() { slug }: TokenSlugDto) {
    return this.service.token(slug);
  }

  @Get('token/:id/volume')
  @HttpCode(200)
  @ApiParam({
    name: 'id',
    type: String,
  })
  async volume(@Param() { id }: TokenIdDto, @Query() args: TokenPaginationDto) {
    return this.service.volume(id, args);
  }

  @Get('token/:id/liquidity')
  @HttpCode(200)
  @ApiParam({
    name: 'id',
    type: String,
  })
  async liquidity(
    @Param() { id }: TokenIdDto,
    @Query() args: TokenPaginationDto
  ) {
    return this.service.liquidity(id, args);
  }

  @Get('token/:id/transfers')
  @HttpCode(200)
  @ApiParam({
    name: 'id',
    type: String,
  })
  async transfers(
    @Param() { id }: TokenIdDto,
    @Query() args: TokenPaginationDto
  ) {
    return this.service.transfers(id, args);
  }

  @Get('token/:id/swaps')
  @HttpCode(200)
  @ApiParam({
    name: 'id',
    type: String,
  })
  async swaps(@Param() { id }: TokenIdDto, @Query() args: TokenPaginationDto) {
    return this.service.swaps(id, args);
  }

  @Get('token/:id/holders')
  @HttpCode(200)
  @ApiParam({
    name: 'id',
    type: String,
  })
  async holders(
    @Param() { id }: TokenIdDto,
    @Query() args: TokenPaginationDto
  ) {
    return this.service.holders(id, args);
  }

  @Get('token/:id/traders')
  @HttpCode(200)
  @ApiParam({
    name: 'id',
    type: String,
  })
  async traders(
    @Param() { id }: TokenIdDto,
    @Query() args: TokenPaginationDto
  ) {
    return this.service.traders(id, args);
  }

  @Get('token/:id/pairs')
  @HttpCode(200)
  @ApiParam({
    name: 'id',
    type: String,
  })
  async pairs(@Param() { id }: TokenIdDto, @Query() args: TokenPaginationDto) {
    return this.service.pairs(id, args);
  }

  @Get('token/:id/transactions')
  @HttpCode(200)
  @ApiParam({
    name: 'id',
    type: String,
  })
  async transactions(
    @Param() { id }: TokenIdStringDto,
    @Query() args: TokenPaginationDto
  ) {
    return this.service.transactions(id, args);
  }
}
