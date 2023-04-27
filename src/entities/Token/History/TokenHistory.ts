import { index, modelOptions, prop, Ref } from '@typegoose/typegoose';
import {
  defaultModelOptions,
  defaultSchemaOptions,
} from '../../../mongoose.config';
import SimpleEntity from '../../SimpleEntity';
import TokenEntity from '../Token';
import { TokenHistoryTransfers } from './TokenHistoryTransfers';
import { TokenHistorySwaps } from './TokenHistorySwaps';
import { TokenHistoryHolders } from './TokenHistoryHolders';
import { TokenHistoryTraders } from './TokenHistoryTraders';

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
    collection: 'tokenHistory',
    versionKey: false,
    timestamps: false,
  },
})
@index(
  { token: 1 },
  {
    background: true,
  }
)
export class TokenHistoryEntity extends SimpleEntity {
  @prop({
    required: true,
    ref: () => TokenEntity,
  })
  token!: Ref<TokenEntity>;

  @prop({ required: true })
  volume!: number;

  @prop({ required: true })
  marketCap!: number;

  @prop({ required: true })
  price!: number;

  @prop({ required: true })
  date!: Date;

  @prop({
    _id: false,
    type: () => TokenHistoryTransfers,
  })
  transfers?: TokenHistoryTransfers;

  @prop({
    _id: false,
    type: () => TokenHistorySwaps,
  })
  swaps?: TokenHistorySwaps;

  @prop({
    _id: false,
    type: () => TokenHistoryHolders,
  })
  holders?: TokenHistoryHolders;

  @prop({
    _id: false,
    type: () => TokenHistoryTraders,
  })
  traders?: TokenHistoryTraders[];
}

export default TokenHistoryEntity;

export const TokenHistoryEntityDefaultSelect = [
  '_id',
  'volume',
  'marketCap',
  'price',
  'date',
];

export const TokenHistoryEntityTransfersSelect = ['_id', 'date', 'transfers'];

export const TokenHistoryEntitySwapsSelect = ['_id', 'date', 'swaps'];

export const TokenHistoryEntityHoldersSelect = ['_id', 'date', 'holders'];

export const TokenHistoryEntityTradersSelect = ['_id', 'date', 'traders'];
