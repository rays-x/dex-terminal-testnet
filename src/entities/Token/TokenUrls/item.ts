import { prop } from '@typegoose/typegoose';

export default class TokenUrlsItem {
  @prop({ required: true })
  link!: string;
}
