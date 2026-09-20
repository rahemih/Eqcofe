import test from 'node:test';
import assert from 'node:assert/strict';
import { MoneyToman } from '../src/shared/kernel/money-toman.ts';

test('V1 Acceptance LOW R2: MoneyToman accepts the exact safe-integer ceiling', () => {
  const max = MoneyToman.from(Number.MAX_SAFE_INTEGER);
  const sameFromString = MoneyToman.from(String(Number.MAX_SAFE_INTEGER));

  assert.equal(max.toBigInt(), BigInt(Number.MAX_SAFE_INTEGER));
  assert.equal(max.toJSON(), Number.MAX_SAFE_INTEGER);
  assert.equal(max.compare(sameFromString), 0);
});

test('V1 Acceptance LOW R2: MoneyToman fails closed on unsafe numeric inputs', () => {
  assert.throws(
    () => MoneyToman.from(Number.MAX_SAFE_INTEGER + 1),
    /safe integer/,
  );
  assert.throws(
    () => MoneyToman.from(1.5),
    /safe integer/,
  );
  assert.throws(
    () => MoneyToman.from(-1),
    /cannot be negative/,
  );
});

test('V1 Acceptance LOW R2: addition cannot overflow the safe-integer ceiling', () => {
  const max = MoneyToman.from(Number.MAX_SAFE_INTEGER);

  assert.throws(
    () => max.add(MoneyToman.from(1)),
    /exceeds JavaScript safe integer range/,
  );
});

test('V1 Acceptance LOW R2: multiplication cannot overflow the safe-integer ceiling', () => {
  const justOverHalf = MoneyToman.from((Number.MAX_SAFE_INTEGER >> 1) + 1);

  assert.throws(
    () => justOverHalf.multiplyByInteger(2),
    /exceeds JavaScript safe integer range/,
  );
});

test('V1 Acceptance LOW R2: subtraction cannot cross below zero', () => {
  const one = MoneyToman.from(1);
  const two = MoneyToman.from(2);

  assert.throws(
    () => one.subtract(two),
    /result cannot be negative/,
  );
  assert.equal(two.subtract(one).toJSON(), 1);
});
