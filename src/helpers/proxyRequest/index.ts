import got from 'got';
import { OptionsOfJSONResponseBody } from 'got/dist/source/types';
import { Logger } from '../../config/logger/api-logger';

export async function proxyRequest<T>(
  {
    url = undefined,
    pathname = undefined,
    searchParams = undefined,
    ...rest
  }: OptionsOfJSONResponseBody,
  forcedUrl: string = ''
) {
  try {
    return await got.get<T>(forcedUrl, {
      url,
      pathname,
      searchParams,
      ...rest,
      resolveBodyOnly: true,
    });
  } catch (e) {
    Logger.debug(
      `mirror request ${e?.message || e} ${JSON.stringify({
        url: forcedUrl || url,
        pathname,
        searchParams,
      })}`
    );
    /* const uri = `${_url || url}${pathname || ''}${qs.stringify(searchParams || {}, {
      addQueryPrefix: true
    })}`;
    const encodeUri = encodeURIComponent(uri);
    return got.get<T>(`https://translate.yandex.ru/translate?url=${encodeUri}`, {
      ...rest,
      followRedirect: true,
      resolveBodyOnly: true
    }); */
    const { host } = new URL(forcedUrl || url.toString());
    const hostReplaced = `${host.replace(/\./g, '-')}.translate.goog`;

    return got.get<T>(forcedUrl && forcedUrl.replace(host, hostReplaced), {
      url: url && forcedUrl.replace(host, hostReplaced),
      pathname,
      searchParams,
      ...rest,
      resolveBodyOnly: true,
    });
  }
}

export async function req<T>(
  url: string,
  params?: OptionsOfJSONResponseBody
): Promise<T> {
  try {
    const { body } = await got.get<T>(url, params);

    return body;
  } catch (e) {
    Logger.debug(`mirror request ${e?.message || e} ${JSON.stringify(params)}`);

    throw e;
  }
}
