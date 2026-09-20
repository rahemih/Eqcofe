import test from 'node:test';
import assert from 'node:assert/strict';

test('Test 5A broken verification fixture intentionally fails', () => {
  assert.fail('TEST_5A_INTENTIONAL_VERIFICATION_FAILURE');
});
