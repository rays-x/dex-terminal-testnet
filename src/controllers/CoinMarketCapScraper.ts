import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import express from 'express';
import { get } from 'lodash-es';
import got from 'got';
import { CoinMarketCapScraperService } from 'services/coinMarketCapScraper';
import {
  QueryPairListDto,
  QueryPairsInfoDto,
  QueryTransactionsDto,
  TransactionsResponse,
} from '../dto/coinMarketCapScraper';
import {
  CMC_ID_BTC_PLATFORM,
  CMC_ID_ETH_PLATFORM,
  CMC_USER_AGENT,
} from '../constants';
import { HttpStatusMessages } from '../messages/http';

@ApiTags('cmc')
@Controller('/api/rest/cmc')
export class CoinMarketCapScraperController {
  constructor(private readonly service: CoinMarketCapScraperService) {}

  @Post('dex/pairs-info')
  @HttpCode(200)
  async pairsInfo(@Body() { pairs, platform }: QueryPairsInfoDto) {
    try {
      const data = await this.service.pairsInfo(platform, pairs);
      return Object.fromEntries(
        Object.entries(data).filter(
          ([, value]) => 'priceUsd' in (value as Object)
        )
      );
    } catch (e) {
      console.error(get(e, 'message', e));
    }
    throw new HttpException(
      HttpStatusMessages.INTERNAL_SERVER_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  @Get('dex/pairs-list')
  @HttpCode(200)
  async pairList(@Query() { ethAddress, btcAddress }: QueryPairListDto) {
    const [ethPairs, btcPairs] = [
      ethAddress
        ? await this.service.pairsList(ethAddress, CMC_ID_ETH_PLATFORM)
        : [],
      btcAddress
        ? await this.service.pairsList(btcAddress, CMC_ID_BTC_PLATFORM)
        : [],
    ];
    return {
      ethPairs: ethPairs.slice(0, 100),
      btcPairs: btcPairs.slice(0, 100),
    };
  }

  @Post('dex/transactions')
  @HttpCode(200)
  async transactions(
    @Body() { btcPairs = [], ethPairs = [] }: QueryTransactionsDto
  ): Promise<TransactionsResponse['data']['transactions']> {
    try {
      return await this.service.transactions(btcPairs, ethPairs);
    } catch (e) {
      console.error(get(e, 'message', e));
    }
    throw new HttpException(
      HttpStatusMessages.INTERNAL_SERVER_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  @Get('proxy*')
  @HttpCode(200)
  async proxy(
    @Req() request: express.Request,
    @Query() query: string
  ): Promise<any> {
    try {
      const { body } = await got.get(
        `https://api.coinmarketcap.com${get(request, 'params.0')}`,
        {
          headers: {
            'user-agent': CMC_USER_AGENT,
            'accept-Encoding': 'gzip, deflate, br',
          },
          responseType: 'json',
          searchParams: query,
        }
      );
      return body;
    } catch (e) {
      console.error(get(e, 'message', e));
    }
    throw new HttpException(
      HttpStatusMessages.INTERNAL_SERVER_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
