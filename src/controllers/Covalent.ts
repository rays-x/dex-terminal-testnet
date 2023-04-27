import { Controller, Get, HttpCode, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QueryStatsLiquidityDto } from '../dto/Covalent';
import { CovalentService } from '../services/covalent';

@ApiTags('cov')
@Controller('/api/rest/cov')
export class CovalentController {
  constructor(public service: CovalentService) {}

  @Get('stats/liquidity')
  @HttpCode(200)
  async statsLiquidity(
    @Query() { ethAddress, btcAddress }: QueryStatsLiquidityDto
  ) {
    return this.service.statsLiquidity(btcAddress, ethAddress);
  }
}
