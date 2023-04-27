import {modelOptions, prop, Ref} from '@typegoose/typegoose';
import {defaultModelOptions, defaultSchemaOptions} from '../../mongoose.config';
import StrategyEntity from './Strategy';

@modelOptions({
  ...defaultModelOptions,
  schemaOptions: {
    ...defaultSchemaOptions,
    toJSON: {
      ...defaultSchemaOptions.toJSON,
      virtuals: true,
      transform: (doc, {_id, ...rest}) => ({
        id: _id,
        ...rest
      })
    }
  }
})
export class BotStrategy {
  @prop({
    required: true,
    ref: () => StrategyEntity
  })
  id?: Ref<StrategyEntity>;
  @prop({
    required: true
  })
  params!: {};
}