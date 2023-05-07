export function promiseMap<T = any, R = any>(
  inputValues,
  mapper: (_: T, index?: number) => PromiseLike<R | void> = async () => {}
) {
  const reducer = (acc$, inputValue, index) =>
    acc$.then((acc) =>
      mapper(inputValue, index).then((result) => acc.push(result) && acc)
    );

  return inputValues.reduce(reducer, Promise.resolve([]));
}

export function awaiter(ms: number): Promise<void> {
  return new Promise((cb) => {
    setTimeout(cb, ms);
  });
}
