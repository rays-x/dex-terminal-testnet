import Typegoose from '@typegoose/typegoose';
import {
  defaultModelOptions,
  defaultSchemaOptions,
} from '../../mongoose.config';
import PlatformEntity from '../Platform';

const { modelOptions, prop } = Typegoose;

@modelOptions({
  ...defaultModelOptions,
  schemaOptions: {
    ...defaultSchemaOptions,
    toJSON: {
      ...defaultSchemaOptions.toJSON,
      virtuals: true,
      transform: (
        doc,
        { _id, tags, platform: { cmc, ...platform }, ...rest }
      ) => ({
        id: _id,
        ...rest,
        platform,
      }),
    },
  },
})
export class TokenPlatform {
  id: string;

  @prop({
    required: true,
    ref: () => PlatformEntity,
  })
  platform?: Typegoose.Ref<PlatformEntity>;

  @prop({
    required: true,
  })
  address!: string;

  @prop({
    required: true,
  })
  decimals!: number;
}
