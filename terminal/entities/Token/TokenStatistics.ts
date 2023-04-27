import {prop} from '@typegoose/typegoose';

export class TokenStatistics {
  @prop()
  price?: number;
  @prop()
  priceChangePercentage1h?: number;
  @prop()
  priceChangePercentage24h?: number;
  @prop()
  priceChangePercentage7d?: number;
  @prop()
  marketCap?: number;
  @prop()
  marketCapChangePercentage24h?: number;
  @prop()
  fullyDilutedMarketCap?: number;
  @prop()
  fullyDilutedMarketCapChangePercentage24h?: number;
  @prop()
  circulatingSupply?: number;
  @prop()
  totalSupply?: number;
}