import { Module } from '@nestjs/common';
import { CoinMarketCapScraperService } from 'services/coinMarketCapScraper';
import { CoinMarketCapScraperController } from '../controllers/CoinMarketCapScraper';
import { CovalentModule } from './Covalent';

@Module({
  imports: [CovalentModule],
  providers: [CoinMarketCapScraperService],
  exports: [],
  controllers: [CoinMarketCapScraperController],
})
export class CoinMarketCapScraperModule {}
