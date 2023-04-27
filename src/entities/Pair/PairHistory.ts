import { index, modelOptions, prop, Ref } from '@typegoose/typegoose';
import {
  defaultModelOptions,
  defaultSchemaOptions,
} from '../../mongoose.config';
import SimpleEntity from '../SimpleEntity';
import PairEntity from './Pair';

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
    collection: 'pairHistory',
    versionKey: false,
    timestamps: false,
  },
})
@index(
  { pair: 1 },
  {
    background: true,
  }
)
export class PairHistoryEntity extends SimpleEntity {
  @prop({
    required: true,
    ref: () => PairEntity,
  })
  pair!: Ref<PairEntity>;

  @prop({ required: true })
  date!: Date;

  @prop({ required: true })
  liquidity!: number;
}

export default PairHistoryEntity;

export const PairHistoryEntityDefaultSelect = ['id', 'liquidity', 'date'];
