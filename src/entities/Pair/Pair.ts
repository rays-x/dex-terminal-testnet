import Typegoose from '@typegoose/typegoose';
import BaseEntity from '../BaseEntity';
import {
  defaultModelOptions,
  defaultSchemaOptions,
} from '../../mongoose.config';
import DexEntity, { DexEntityDefaultPopulateSelect } from '../Dex';
import TokenEntity, { TokenEntityDefaultPopulateSelect } from '../Token/Token';
import PlatformEntity, {
  PlatformEntityDefaultPopulateSelect,
} from '../Platform';

const { index, modelOptions, prop } = Typegoose;

@modelOptions({
  ...defaultModelOptions,
  schemaOptions: {
    ...defaultSchemaOptions,
    toJSON: {
      ...defaultSchemaOptions.toJSON,
      virtuals: true,
      transform: (doc, { _id, createdAt, updatedAt, ...rest }) => ({
        id: _id,
        createdAt,
        updatedAt,
        ...rest,
      }),
    },
    collection: 'pair',
    versionKey: false,
  },
})
@index(
  {
    base: 1,
  },
  {
    background: true,
  }
)
@index(
  {
    quote: 1,
  },
  {
    background: true,
  }
)
@index(
  {
    cmc: 1,
  },
  {
    unique: true,
    background: true,
  }
)
export class PairEntity extends BaseEntity {
  @prop({ required: true })
  cmc!: string;

  @prop({
    required: true,
    ref: () => TokenEntity,
  })
  base!: Typegoose.Ref<TokenEntity>;

  @prop({
    required: true,
    ref: () => TokenEntity,
  })
  quote!: Typegoose.Ref<TokenEntity>;

  @prop({
    required: true,
    ref: () => DexEntity,
  })
  dex!: Typegoose.Ref<DexEntity>;

  @prop({
    required: true,
    ref: () => PlatformEntity,
  })
  platform!: Typegoose.Ref<PlatformEntity>;

  @prop({ required: true })
  address!: string;

  @prop()
  liquidity?: string;

  @prop()
  volume24h?: string;
}

export const PairEntityDefaultSelect = [
  'id',
  'cmc',
  'address',
  'base',
  'quote',
  'dex',
  'platform',
  'liquidity',
  'volume24h',
];
export const PairEntityBasePopulate = {
  path: 'base',
  select: TokenEntityDefaultPopulateSelect,
};
export const PairEntityQuotePopulate = {
  path: 'quote',
  select: TokenEntityDefaultPopulateSelect,
};
export const PairEntityDexPopulate = {
  path: 'dex',
  select: DexEntityDefaultPopulateSelect,
};
export const PairEntityPlatformPopulate = {
  path: 'platform',
  select: PlatformEntityDefaultPopulateSelect,
};

export const PairEntityDefaultPopulate = [
  PairEntityBasePopulate,
  PairEntityQuotePopulate,
  PairEntityDexPopulate,
  PairEntityPlatformPopulate,
];
export default PairEntity;
