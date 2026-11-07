/*
 * Exact fractions of a sen. A share of a share of a share is not a whole number,
 * and floats would drift, so the engine keeps exact fractions until the final
 * rounding step. Internal to this package: money leaves it as whole sen.
 */
export type Rational = { readonly n: bigint; readonly d: bigint };

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b;
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
}

export function ratio(n: bigint, d: bigint = 1n): Rational {
  if (d === 0n) throw new RangeError("Division by zero");
  const sign = d < 0n ? -1n : 1n;
  const divisor = gcd(n, d < 0n ? -d : d) || 1n;
  return { n: (sign * n) / divisor, d: (sign * d) / divisor };
}

export const ZERO = ratio(0n);

export const add = (a: Rational, b: Rational) =>
  ratio(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Rational, b: Rational) =>
  ratio(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Rational, b: Rational) => ratio(a.n * b.n, a.d * b.d);
export const div = (a: Rational, b: Rational) => ratio(a.n * b.d, a.d * b.n);
export const sum = (values: readonly Rational[]) => values.reduce(add, ZERO);
export const compare = (a: Rational, b: Rational) => {
  const difference = a.n * b.d - b.n * a.d;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
};

/** Rounds towards negative infinity, including for negative values. */
export function floor(value: Rational): bigint {
  const quotient = value.n / value.d;
  return value.n % value.d !== 0n && value.n < 0n ? quotient - 1n : quotient;
}

export const fraction = (value: Rational) => sub(value, ratio(floor(value)));
