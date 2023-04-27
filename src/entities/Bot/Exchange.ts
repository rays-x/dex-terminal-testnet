import { index, modelOptions, prop } from '@typegoose/typegoose';
import BaseEntity from '../BaseEntity';
import {
  defaultModelOptions,
  defaultSchemaOptions,
} from '../../mongoose.config';
import { ExchangeParams } from './ExchangeParams';

enum ExchangeType {
  SPOT_CLOB_CEX = 'SPOT_CLOB_CEX',
  PERP_CLOB_CEX = 'PERP_CLOB_CEX',
}

@modelOptions({
  ...defaultModelOptions,
  schemaOptions: {
    ...defaultSchemaOptions,
    toJSON: {
      ...defaultSchemaOptions.toJSON,
      virtuals: true,
      transform: (doc, { _id, createdAt, updatedAt, ...rest }) => ({
        id: _id,
        ...rest,
      }),
    },
    collection: 'botExchange',
    versionKey: false,
    timestamps: false,
  },
})
@index(
  { slug: 1 },
  {
    unique: true,
    sparse: true,
    background: true,
  }
)
export class ExchangeEntity extends BaseEntity {
  @prop({ required: true })
  slug!: string;

  @prop({ required: true })
  name!: string;

  @prop({
    required: true,
    enum: ExchangeType,
  })
  type!: ExchangeType;

  @prop({
    required: true,
    type: () => ExchangeParams,
  })
  params?: ExchangeParams[];
}

export const ExchangeEntityDefaultSelect = [
  'id',
  'slug',
  'type',
  'name',
  'params',
];
export default ExchangeEntity;
