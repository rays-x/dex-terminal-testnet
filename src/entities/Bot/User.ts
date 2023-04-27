import Typegoose from '@typegoose/typegoose';
import BaseEntity from '../BaseEntity';
import {
  defaultModelOptions,
  defaultSchemaOptions,
} from '../../mongoose.config';
import { UserExchanges } from './UserExchanges';

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
        ...rest,
      }),
    },
    collection: 'botUser',
    versionKey: false,
  },
})
@index(
  { address: 1 },
  {
    unique: true,
    sparse: true,
    background: true,
  }
)
export class UserEntity extends BaseEntity {
  @prop({
    required: true,
    lowercase: true,
  })
  address!: string;

  @prop({
    required: true,
    default: [],
    type: () => UserExchanges,
  })
  exchanges?: UserExchanges[];
}

export const UserEntityDefaultSelect = ['id', 'address', 'exchanges'];
export default UserEntity;
