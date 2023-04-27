export function toFixedToken(v: number | string, d = 0): number {
  return Math.trunc(Number(v) * 10 ** d) / 10 ** d;
}

export function diff(a: string | number, b: string | number, d = 1): number {
  return toFixedToken(((Number(b) - Number(a)) / Number(a)) * 100, d);
}

export function avgBuy(
  arr: {
    price: string | number;
    qty: string | number;
  }[]
): number {
  return Number(
    arr.reduce(
      (prev, next) => prev + Number(next.price) * Number(next.qty),
      0
    ) / arr.reduce((prev, next) => prev + Number(next.qty), 0)
  );
}

export function getRange(lower: number, upper: number, steps: number) {
  const increment = (upper - lower) / (steps - 1);
  return [
    lower,
    ...Array.from({ length: steps - 2 }).map(
      (_, i) => lower + increment * (i + 1)
    ),
    upper,
  ];
}
