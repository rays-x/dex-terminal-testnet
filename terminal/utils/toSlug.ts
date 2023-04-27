import slugify from 'slugify';
import {v4 as uuid} from 'uuid';

const toSlug = (str: string) => slugify(str || uuid(), {
  replacement: '_',
  lower: true,
  strict: true
});
export default toSlug;
