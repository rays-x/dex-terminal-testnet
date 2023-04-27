import Typegoose from '@typegoose/typegoose';
import TokenTagEntity from '../TokenTag';

const { prop } = Typegoose;

export default class TokenTag {
  @prop({
    ref: () => TokenTagEntity,
  })
  tag?: Typegoose.Ref<TokenTagEntity>;
}
