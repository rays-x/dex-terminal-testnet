import { Ref, prop } from '@typegoose/typegoose';
import TokenTagEntity from '../TokenTag';

export default class TokenTag {
  @prop({
    ref: () => TokenTagEntity,
  })
  tag?: Ref<TokenTagEntity>;
}
