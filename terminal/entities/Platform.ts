import {index, modelOptions, prop} from '@typegoose/typegoose';
import {defaultModelOptions, defaultSchemaOptions} from '../mongoose.config';
import {_BaseEntity} from './_BaseEntity';

@modelOptions({
  ...defaultModelOptions,
  schemaOptions: {
    ...defaultSchemaOptions,
    toJSON: {
      ...defaultSchemaOptions.toJSON,
      virtuals: true,
      transform: (doc, {_id, createdAt, updatedAt, ...rest}) => ({
        id: _id,
        createdAt,
        updatedAt,
        ...rest
      })
    },
    collection: 'platform',
    versionKey: false
  }
})
@index(
  {cmc: 1},
  {
    unique: true,
    background: true
  }
)
@index(
  {cmcCrypto: 1},
  {
    unique: true,
    background: true,
    sparse: true
  }
)
export class PlatformEntity extends _BaseEntity {
  @prop({required: true})
  cmc!: number;
  @prop({required: true})
  cmcCrypto!: number;
  @prop({required: false})
  cmcDexerName?: string;
  @prop({required: true})
  name!: string;
  @prop({required: false})
  chainId?: number;
  @prop({required: false})
  explorerUrlFormat?: string;
  @prop({required: false})
  dexerTxHashFormat?: string;
  @prop({required: false})
  bqSlug?: string;
}

export const PlatformEntityDefaultSelect = [
  'id',
  'name'
];
export const PlatformEntityDefaultPopulateSelect = [
  'id',
  // 'name',
  'cmc',
  'cmcCrypto',
  'chainId'
];

export default PlatformEntity;
