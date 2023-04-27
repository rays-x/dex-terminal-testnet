import Typegoose from '@typegoose/typegoose';
import BaseEntity from '../BaseEntity';
import {
  defaultModelOptions,
  defaultSchemaOptions,
} from '../../mongoose.config';

const { modelOptions, prop } = Typegoose;

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
    collection: 'tokenTag',
    versionKey: false,
  },
})
export class TokenTagEntity extends BaseEntity {
  @prop({ required: true })
  slug!: string;

  @prop({ required: true })
  name!: string;

  @prop({ required: true })
  category!: string;
}

export const TokenTagEntityDefaultSelect = ['id', 'slug', 'name', 'category'];
export default TokenTagEntity;
