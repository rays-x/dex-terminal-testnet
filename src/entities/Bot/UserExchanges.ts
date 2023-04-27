import { modelOptions, prop, Ref } from '@typegoose/typegoose';
import {
  defaultModelOptions,
  defaultSchemaOptions,
} from '../../mongoose.config';
import ExchangeEntity from './Exchange';

@modelOptions({
  ...defaultModelOptions,
  schemaOptions: {
    ...defaultSchemaOptions,
    toJSON: {
      ...defaultSchemaOptions.toJSON,
      virtuals: true,
      transform: (doc, { _id, ...rest }) => ({
        id: _id,
        ...rest,
      }),
    },
  },
})
export class UserExchanges {
  id: string;

  @prop({
    required: true,
    ref: () => ExchangeEntity,
  })
  exchange?: Ref<ExchangeEntity>;

  @prop({
    required: true,
  })
  params!: Object;
}
