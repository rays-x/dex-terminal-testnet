import {modelOptions, prop} from '@typegoose/typegoose';
import {defaultModelOptions, defaultSchemaOptions} from '../../mongoose.config';

@modelOptions({
  ...defaultModelOptions,
  schemaOptions: {
    ...defaultSchemaOptions,
    toJSON: {
      ...defaultSchemaOptions.toJSON,
      virtuals: true,
      transform: (doc, {_id, tags, ...rest}) => ({
        id: _id,
        ...rest
      })
    }
  }
})
class TokenUrlsItem {
  @prop({required: true})
  link!: string;
}

export class TokenUrls {
  @prop({
    default: [],
    type: () => TokenUrlsItem
  })
  website!: TokenUrlsItem[];

  @prop({
    default: [],
    type: () => TokenUrlsItem
  })
  technicalDoc!: TokenUrlsItem[];

  @prop({
    default: [],
    type: () => TokenUrlsItem
  })
  explorer!: TokenUrlsItem[];

  @prop({
    default: [],
    type: () => TokenUrlsItem
  })
  sourceCode!: TokenUrlsItem[];

  @prop({
    default: [],
    type: () => TokenUrlsItem
  })
  messageBoard!: TokenUrlsItem[];

  @prop({
    default: [],
    type: () => TokenUrlsItem
  })
  chat!: TokenUrlsItem[];

  @prop({
    default: [],
    type: () => TokenUrlsItem
  })
  announcement!: TokenUrlsItem[];

  @prop({
    default: [],
    type: () => TokenUrlsItem
  })
  reddit!: TokenUrlsItem[];

  @prop({
    default: [],
    type: () => TokenUrlsItem
  })
  facebook!: TokenUrlsItem[];

  @prop({
    default: [],
    type: () => TokenUrlsItem
  })
  twitter!: TokenUrlsItem[];
}