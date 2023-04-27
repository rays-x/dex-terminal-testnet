import Typegoose from '@typegoose/typegoose';
import { defaultModelOptions, defaultSchemaOptions } from '../mongoose.config';
import PlatformEntity from './Platform';

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
    collection: 'dex',
    versionKey: false,
  },
})
@index(
  {
    cmc: 1,
  },
  {
    unique: true,
    background: true,
  }
)
export class DexEntity {
  @prop({ required: true })
  cmc!: number;

  @prop({ required: true })
  name!: string;

  @prop({
    required: false,
    ref: () => PlatformEntity,
  })
  platform?: Typegoose.Ref<PlatformEntity>;
}

export const DexEntityDefaultSelect = ['id', 'name'];
export const DexEntityDefaultPopulateSelect = ['id', 'cmc', 'name'];

export default DexEntity;
