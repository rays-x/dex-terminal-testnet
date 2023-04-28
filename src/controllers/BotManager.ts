import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { BotManagerService } from '../services/BotManager';

@ApiTags('bot')
@Controller('/api/rest/hm')
export class BotManagerController {
  constructor(public service: BotManagerService) {}

  @Post('user/exchange/upsert')
  @HttpCode(200)
  async exchangesUpsert(@Query('userId') address: string, @Body() body: any) {
    return this.service.userExchangeUpsert(address, body);
  }

  @Get('user/exchanges')
  @HttpCode(200)
  @ApiQuery({
    name: 'id',
    required: false,
  })
  async userExchangesList(
    @Query('userId') address: string,
    @Query('id') id?: string
  ) {
    return this.service.userExchangesList(address, id);
  }

  @Get('exchanges')
  @HttpCode(200)
  async exchangesList() {
    return this.service.exchangesList();
  }

  @Get('strategies')
  @HttpCode(200)
  async strategyFindMany() {
    return this.service.strategyFindMany();
  }

  @Get('strategy/:id')
  @HttpCode(200)
  async strategyFindOne(@Param('id') id?: string) {
    return this.service.strategyFindOne(id);
  }

  @Get('bots')
  @HttpCode(200)
  async botList(@Query('userId') address: string) {
    return this.service.botList(address);
  }

  @Post('bot/create')
  @HttpCode(200)
  async botCreate(
    @Query('userId') address: string,
    @Body() { id, params }: any
  ) {
    console.log('body', address, {
      id,
      params,
    });
    return this.service.botCreate(address, {
      id,
      params,
    });
  }

  @Delete('bot/delete/:id')
  @HttpCode(200)
  async botDelete(@Param('id') id: string) {
    return this.service.botDelete(id);
  }

  @Get('bot/:id/logs')
  @HttpCode(200)
  async botLogs(@Param('id') bot: string) {
    return this.service.botLogs(bot);
  }
}
