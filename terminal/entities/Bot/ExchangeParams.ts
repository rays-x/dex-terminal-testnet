import {modelOptions, prop} from '@typegoose/typegoose';
import {defaultModelOptions, defaultSchemaOptions} from '../../mongoose.config';

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
    },
    timestamps: false
  }
})
export class ExchangeParams {
  id: string;
  @prop({
    required: true
  })
  slug!: string;
  @prop({
    required: true
  })
  name!: string;
}