import {index, modelOptions, prop} from '@typegoose/typegoose';
import {_BaseEntity} from '../_BaseEntity';
import {defaultModelOptions, defaultSchemaOptions} from '../../mongoose.config';
import {StrategyParams} from './StrategyParams';

@modelOptions({
  ...defaultModelOptions,
  schemaOptions: {
    ...defaultSchemaOptions,
    toJSON: {
      ...defaultSchemaOptions.toJSON,
      virtuals: true,
      transform: (doc, {_id, createdAt, updatedAt, ...rest}) => ({
        id: _id,
        ...rest
      })
    },
    collection: 'botStrategy',
    versionKey: false,
    timestamps: false
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
export class StrategyEntity extends _BaseEntity {
  @prop({required: true})
  slug!: string;
  @prop({required: true})
  name!: string;
  @prop({required: false})
  description?: string;
  @prop({
    required: true,
    type: () => StrategyParams
  })
  params?: StrategyParams[];
}

export const StrategyEntityDefaultSelect = [
  'id',
  'slug',
  'name',
  'description',
  'params'
];
export default StrategyEntity;
