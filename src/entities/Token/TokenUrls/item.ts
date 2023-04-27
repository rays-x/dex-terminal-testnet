import Typegoose from '@typegoose/typegoose';

const { prop } = Typegoose;

export default class TokenUrlsItem {
  @prop({ required: true })
  link!: string;
}
