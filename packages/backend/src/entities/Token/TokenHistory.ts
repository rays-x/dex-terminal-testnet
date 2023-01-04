import {index,modelOptions, prop, Ref} from '@typegoose/typegoose';
import {defaultModelOptions, defaultSchemaOptions} from '../../mongoose.config';
import {_SimpleEntity} from '../_BaseEntity';
import TokenEntity from './Token';


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
    collection: 'tokenHistory',
    versionKey: false,
    timestamps: false,
  }
})
@index(
  {token: 1},
  {
    background: true
  }
)
export class TokenHistoryEntity extends _SimpleEntity {
  @prop({
    required: true,
    ref: () => TokenEntity
  })
  token!: Ref<TokenEntity>;
  @prop({required: true})
  volume!: number;
  @prop({required: true})
  marketCap!: number;
  @prop({required: true})
  price!: number;
  @prop({required: true})
  date!: Date;
}

export default TokenHistoryEntity;

export const TokenHistoryEntityDefaultSelect = [
  'id',
  'volume',
  'marketCap',
  'price',
  'date'
];
