import {Module} from '@nestjs/common';
import {CoinMarketCapScraperService} from '../services/CoinMarketCapScraper';
import {CoinMarketCapScraperController} from '../controllers/CoinMarketCapScraper';
import {BitQueryService} from '../services/BitQuery';
import {BitQueryModule} from './BitQuery';

@Module({
  imports: [BitQueryModule],
  providers: [CoinMarketCapScraperService],
  exports: [],
  controllers: [CoinMarketCapScraperController]
})
export class CoinMarketCapScraperModule {
}
