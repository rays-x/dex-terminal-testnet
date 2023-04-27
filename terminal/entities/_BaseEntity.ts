import {Base, TimeStamps} from '@typegoose/typegoose/lib/defaultClasses';
import {Types} from 'mongoose';

export abstract class _BaseEntity extends TimeStamps implements Base {
  _id: Types.ObjectId;
  id: string;
}

export abstract class _SimpleEntity implements Base {
  _id: Types.ObjectId;
  id: string;
}
