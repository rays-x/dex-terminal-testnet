import { Base } from '@typegoose/typegoose/lib/defaultClasses';
import { Types } from 'mongoose';

export default abstract class SimpleEntity implements Base {
  _id: Types.ObjectId;

  id: string;
}
