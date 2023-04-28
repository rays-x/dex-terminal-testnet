import Typegoose from '@typegoose/typegoose';
import BaseEntity from '../BaseEntity';
import {
  defaultModelOptions,
  defaultSchemaOptions,
} from '../../mongoose.config';
import BotEntity from './Bot';

const { modelOptions, prop } = Typegoose;

export enum BotLogType {
  log = 'log',
  notify = 'notify',
  event = 'event',
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
        ...rest,
      }),
    },
    collection: 'botLog',
    versionKey: false,
  },
})
export class BotLogEntity extends BaseEntity {
  @prop({
    required: true,
    ref: () => BotEntity,
  })
  bot?: Typegoose.Ref<BotEntity>;

  @prop({
    required: true,
    enum: BotLogType,
  })
  type!: BotLogType;

  @prop({ required: true })
  message?: string;
}

export const BotLogEntityDefaultSelect = ['id', 'createdAt', 'type', 'message'];
export default BotLogEntity;
