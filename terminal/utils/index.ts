import {PhoneNumberFormat, PhoneNumberUtil} from 'google-libphonenumber';
import {isEmail} from 'class-validator';

export function promiseMap<T = any, R = any>(inputValues, mapper: (_: T, index?: number) => PromiseLike<R | void> = async () => {
}) {
  const reducer = (acc$, inputValue, index) => acc$.then((acc) => mapper(inputValue, index).then((result) => acc.push(result) && acc));
  return inputValues.reduce(reducer, Promise.resolve([]));
}

export function awaiter(ms) {
  return new Promise(res => setTimeout(res, ms));
}

export function getPhone(str?: string | unknown): string | null {
  let phone: string | null = null;
  if(typeof str !== 'string' || !str) {
    return phone;
  }
  let phoneDigits = String(str).trim().replace(/\D/g, '');
  if(RegExp('^89\\d{9}', 'g').test(phoneDigits)) {
    phoneDigits = `7${phoneDigits.substr(1)}`;
  }
  if(RegExp('^9\\d{8}', 'g').test(phoneDigits)) {
    phoneDigits = `7${phoneDigits}`;
  }
  try {
    const glp = PhoneNumberUtil.getInstance();
    const number = glp.parse(`+${phoneDigits}`);
    if(glp.isPossibleNumber(number)) {
      phone = glp.format(number, PhoneNumberFormat.E164);
    }
  } catch(e) {
    return null;
  }
  return phone ? phone.trim().toLowerCase() : phone;
}

export function getEmail(email?: string | unknown): string | null {
  if(typeof email !== 'string' || !email || !isEmail(email)) {
    return null;
  }
  return email.trim().toLowerCase();
}
