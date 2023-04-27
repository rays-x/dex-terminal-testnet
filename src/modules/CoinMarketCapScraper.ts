import { Module } from '@nestjs/common';
import { CoinMarketCapScraperService } from '../services/coinMarketCapScraper';
import { CoinMarketCapScraperController } from '../controllers/CoinMarketCapScraper';
import { BitQueryModule } from './BitQuery';
import { CovalentModule } from './Covalent';

@Module({
  imports: [BitQueryModule, CovalentModule],
  providers: [CoinMarketCapScraperService],
  exports: [],
  controllers: [CoinMarketCapScraperController],
})
export class CoinMarketCapScraperModule {}
