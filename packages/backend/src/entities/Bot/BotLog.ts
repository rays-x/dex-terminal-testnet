import {modelOptions, prop, Ref} from '@typegoose/typegoose';
import {_BaseEntity} from '../_BaseEntity';
import {defaultModelOptions, defaultSchemaOptions} from '../../mongoose.config';
import BotEntity from './Bot';

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
      transform: (doc, {_id, createdAt, updatedAt, ...rest}) => ({
        id: _id,
        createdAt,
        ...rest
      })
    },
    collection: 'botLog',
    versionKey: false
  }
})
export class BotLogEntity extends _BaseEntity {
  @prop({
    required: true,
    ref: () => BotEntity
  })
  bot?: Ref<BotEntity>;
  @prop({
    required: true,
    enum: BotLogType
  })
  type!: BotLogType;
  @prop({required: true})
  message?: string;
}

export const BotLogEntityDefaultSelect = [
  'id',
  'createdAt',
  'type',
  'message'
];
export default BotLogEntity;