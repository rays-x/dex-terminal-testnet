import { index, modelOptions, prop, Ref } from '@typegoose/typegoose';
import BaseEntity from '../BaseEntity';
import {
  defaultModelOptions,
  defaultSchemaOptions,
} from '../../mongoose.config';
import { BotStrategy } from './BotStrategy';
import UserEntity from './User';

export enum BotStatus {
  running = 'running',
  stopped = 'stopped',
  error = 'error',
}

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
    collection: 'bot',
    versionKey: false,
  },
})
@index(
  { slug: 1 },
  {
    unique: true,
    sparse: true,
    background: true,
  }
)
export class BotEntity extends BaseEntity {
  @prop({
    required: true,
    default: BotStatus.running,
    enum: BotStatus,
  })
  status!: BotStatus;

  @prop()
  container?: string;

  @prop({
    required: true,
    ref: () => UserEntity,
  })
  user?: Ref<UserEntity>;

  @prop({
    required: true,
    _id: false,
  })
  strategy!: BotStrategy;
}

export const BotEntityDefaultSelect = [
  'id',
  'createdAt',
  'updatedAt',
  'status',
  'strategy',
];
export default BotEntity;
