import {index, modelOptions, plugin, prop, Ref} from '@typegoose/typegoose';
import {_BaseEntity} from '../_BaseEntity';
import {defaultModelOptions, defaultSchemaOptions} from '../../mongoose.config';
import autopopulate from 'mongoose-autopopulate';
import TokenTagEntity from './TokenTag';
import {TokenUrls} from './TokenUrls';
import {TokenStatistics} from './TokenStatistics';
import {TokenPlatform} from './TokenPlatforms';
import {PlatformEntityDefaultPopulateSelect} from '../Platform';

class TokenTag {
  @prop({
    ref: () => TokenTagEntity
  })
  tag?: Ref<TokenTagEntity>;
}

@plugin(autopopulate)
@modelOptions({
  ...defaultModelOptions,
  schemaOptions: {
    ...defaultSchemaOptions,
    toJSON: {
      ...defaultSchemaOptions.toJSON,
      virtuals: true,
      transform: (doc, {_id, createdAt, updatedAt, tags, ...rest}) => ({
        id: _id,
        createdAt,
        updatedAt,
        tags: (({tag}) => tag),
        ...rest
      })
    },
    collection: 'token'
  }
})
@index(
  {slug: 1},
  {
    unique: true,
    sparse: true,
    background: true
  }
)
export class TokenEntity extends _BaseEntity {
  @prop({
    required: true,
    lowercase: true,
    trim: true
  })
  slug!: string;
  @prop({required: true})
  cmc!: number;
  @prop({required: true})
  cmcAdded!: Date;
  @prop({required: true})
  name!: string;
  @prop({required: true})
  symbol!: string;
  @prop()
  category?: string;
  @prop()
  description?: string;
  @prop()
  dateLaunched?: Date;
  @prop({
    default: [],
    type: () => TokenTag
  })
  tags?: TokenTag[];
  @prop({
    _id: false,
    type: () => TokenUrls
  })
  urls?: TokenUrls;
  @prop()
  volume?: number;
  @prop()
  volumeChangePercentage24h: number;
  @prop()
  cexVolume: number;
  @prop()
  dexVolume: number;
  @prop({
    _id: false,
    type: () => TokenStatistics
  })
  statistics?: TokenStatistics;
  @prop({
    type: () => TokenPlatform
  })
  platforms?: TokenPlatform[];
  @prop()
  selfReportedTags?: string[];
  @prop()
  selfReportedCirculatingSupply?: string;

  get image(): string | undefined {
    return this.cmc ? `https://s2.coinmarketcap.com/static/img/coins/64x64/${this.cmc}.png` : undefined;
  }
}

export const TokenEntityDefaultSelect = [
  'id',
  'slug',
  'cmc',
  'name',
  'symbol',
  'dateLaunched',
  'urls',
  'volume',
  'volumeChangePercentage24h',
  'statistics',
  'platforms',
  'selfReportedCirculatingSupply'
];

export const TokenEntityDefaultPopulate = [
  /*{
    path: 'platforms.platform',
    select: PlatformEntityDefaultPopulateSelect
  }*/
];
export const TokenEntityPlatformPopulate = {
  path: 'platforms.platform',
  select: PlatformEntityDefaultPopulateSelect
};
export const TokenEntityDetailPopulate = [
  TokenEntityPlatformPopulate
];

export const TokenEntityDefaultPopulateSelect = [
  'id',
  'slug',
  'cmc',
  'symbol'
];
export default TokenEntity;
