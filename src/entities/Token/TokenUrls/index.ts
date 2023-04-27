import { modelOptions, prop } from '@typegoose/typegoose';

import {
  defaultModelOptions,
  defaultSchemaOptions,
} from '../../../mongoose.config';

import TokenUrlsItem from './item';

@modelOptions({
  ...defaultModelOptions,
  schemaOptions: {
    ...defaultSchemaOptions,
    toJSON: {
      ...defaultSchemaOptions.toJSON,
      virtuals: true,
      transform: (doc, { _id, tags, ...rest }) => ({
        id: _id,
        ...rest,
      }),
    },
  },
})
export class TokenUrls {
  @prop({
    default: [],
    type: () => TokenUrlsItem,
  })
  website!: TokenUrlsItem[];

  @prop({
    default: [],
    type: () => TokenUrlsItem,
  })
  technicalDoc!: TokenUrlsItem[];

  @prop({
    default: [],
    type: () => TokenUrlsItem,
  })
  explorer!: TokenUrlsItem[];

  @prop({
    default: [],
    type: () => TokenUrlsItem,
  })
  sourceCode!: TokenUrlsItem[];

  @prop({
    default: [],
    type: () => TokenUrlsItem,
  })
  messageBoard!: TokenUrlsItem[];

  @prop({
    default: [],
    type: () => TokenUrlsItem,
  })
  chat!: TokenUrlsItem[];

  @prop({
    default: [],
    type: () => TokenUrlsItem,
  })
  announcement!: TokenUrlsItem[];

  @prop({
    default: [],
    type: () => TokenUrlsItem,
  })
  reddit!: TokenUrlsItem[];

  @prop({
    default: [],
    type: () => TokenUrlsItem,
  })
  facebook!: TokenUrlsItem[];

  @prop({
    default: [],
    type: () => TokenUrlsItem,
  })
  twitter!: TokenUrlsItem[];
}
