import Typegoose from '@typegoose/typegoose';
import {
  defaultModelOptions,
  defaultSchemaOptions,
} from '../../mongoose.config';
import StrategyEntity from './Strategy';

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
export class BotStrategy {
  @prop({
    required: true,
    ref: () => StrategyEntity,
  })
  id?: Typegoose.Ref<StrategyEntity>;

  @prop({
    required: true,
  })
  params!: {};
}
