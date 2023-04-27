import { modelOptions, prop, Ref } from '@typegoose/typegoose';
import {
  defaultModelOptions,
  defaultSchemaOptions,
} from '../../mongoose.config';
import PlatformEntity from '../Platform';

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
  platform?: Ref<PlatformEntity>;

  @prop({
    required: true,
  })
  address!: string;

  @prop({
    required: true,
  })
  decimals!: number;
}
