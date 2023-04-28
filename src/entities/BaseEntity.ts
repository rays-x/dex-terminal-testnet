import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { Types } from 'mongoose';

export default abstract class BaseEntity extends TimeStamps implements Base {
  _id: Types.ObjectId;

  id: string;
}
