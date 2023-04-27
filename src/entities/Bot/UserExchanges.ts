import Typegoose from '@typegoose/typegoose';
import {
  defaultModelOptions,
  defaultSchemaOptions,
} from '../../mongoose.config';
import ExchangeEntity from './Exchange';

const { modelOptions, prop } = Typegoose;

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
  exchange?: Typegoose.Ref<ExchangeEntity>;

  @prop({
    required: true,
  })
  params!: Object;
}
