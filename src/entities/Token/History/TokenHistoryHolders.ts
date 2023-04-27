import Typegoose from '@typegoose/typegoose';

const { prop } = Typegoose;

export class TokenHistoryHolders {
  @prop()
  count?: number;
}
