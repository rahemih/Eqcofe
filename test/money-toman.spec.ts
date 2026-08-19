import test from 'node:test';
import assert from 'node:assert/strict';
import { MoneyToman } from '../src/shared/kernel/money-toman';

test('MoneyToman preserves integer toman arithmetic', () => {
  const a = MoneyToman.from(12_500_000);
  const b = MoneyToman.from(500_000);
  assert.equal(a.add(b).toString(), '13000000');
  assert.equal(a.subtract(b).toString(), '12000000');
});

test('MoneyToman rejects negative values', () => {
  assert.throws(() => MoneyToman.from(-1), RangeError);
});
