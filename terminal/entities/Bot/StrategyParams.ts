import {modelOptions, prop} from '@typegoose/typegoose';
import {defaultModelOptions, defaultSchemaOptions} from '../../mongoose.config';

enum StrategyParamType {
  SPOT_CLOB_CEX = 'SPOT_CLOB_CEX',
  PERP_CLOB_CEX = 'PERP_CLOB_CEX',
  string = 'string',
  decimal = 'decimal',
  float = 'float',
  bool = 'bool',
}

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
export class StrategyParams {
  id: string;
  @prop({
    required: true
  })
  slug!: string;
  @prop()
  description?: string;
  @prop({
    required: true,
    enum: StrategyParamType
  })
  type!: StrategyParamType;
  @prop()
  options?: string[];
  @prop()
  dependency?: string;
  @prop()
  default?: string;
  @prop()
  required?: boolean;
}