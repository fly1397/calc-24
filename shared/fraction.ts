import type { Fraction, Operator } from "./types";

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
};

export const makeFraction = (n: number, d = 1): Fraction => {
  if (d === 0) {
    throw new Error("Division by zero");
  }
  const sign = d < 0 ? -1 : 1;
  const g = gcd(n, d);
  return { n: (n / g) * sign, d: Math.abs(d / g) };
};

export const add = (a: Fraction, b: Fraction): Fraction => makeFraction(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Fraction, b: Fraction): Fraction => makeFraction(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Fraction, b: Fraction): Fraction => makeFraction(a.n * b.n, a.d * b.d);
export const div = (a: Fraction, b: Fraction): Fraction => makeFraction(a.n * b.d, a.d * b.n);

export const operate = (a: Fraction, b: Fraction, op: Operator): Fraction | null => {
  try {
    if (op === "+") return add(a, b);
    if (op === "-") return sub(a, b);
    if (op === "*") return mul(a, b);
    if (op === "/") return b.n === 0 ? null : div(a, b);
    return null;
  } catch {
    return null;
  }
};

export const equalsFraction = (a: Fraction, b: Fraction): boolean => a.n === b.n && a.d === b.d;

export const fractionToNumber = (value: Fraction): number => value.n / value.d;

export const formatFraction = (value: Fraction): string => {
  if (value.d === 1) return String(value.n);
  return `${value.n}/${value.d}`;
};
