import test from 'node:test';
import assert from 'node:assert/strict';
import { VariantAggregate } from '../src/modules/catalog/domain/variant.aggregate';
import { DomainError } from '../src/shared/errors/domain-error';

const variant = () => VariantAggregate.create({
  id: '00000000-0000-4000-8000-000000000031',
  productId: '00000000-0000-4000-8000-000000000032',
  sku: 'MEDIUM-PILOT-1',
  salesEnabled: true,
});

test('Pilot MEDIUM: inactivating a sales-enabled variant disables sales and reports the resulting state', () => {
  const subject = variant();
  subject.pullEvents();

  subject.update({ status: 'inactive' });

  const snapshot = subject.snapshot();
  assert.equal(snapshot.status, 'inactive');
  assert.equal(snapshot.salesEnabled, false);
  assert.equal(snapshot.version, 2);

  const events = subject.pullEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0]?.eventType, 'catalog.variant.updated.v1');
  assert.equal(events[0]?.aggregateVersion, 2);
  assert.equal(events[0]?.payload.sales_enabled, false);
});

test('Pilot MEDIUM: explicit sales enablement with an inactive resulting status fails atomically', () => {
  const subject = variant();
  subject.pullEvents();
  const before = subject.snapshot();

  assert.throws(
    () => subject.update({ status: 'inactive', salesEnabled: true }),
    (error: unknown) => error instanceof DomainError && error.code === 'VARIANT_INACTIVE',
  );

  assert.deepEqual(subject.snapshot(), before);
  assert.deepEqual(subject.pullEvents(), []);
});

test('Pilot MEDIUM: inactive variants stay sales-disabled until explicitly re-enabled after reactivation', () => {
  const subject = variant();
  subject.pullEvents();

  subject.update({ status: 'inactive' });
  subject.pullEvents();
  assert.equal(subject.snapshot().salesEnabled, false);

  assert.throws(
    () => subject.update({ salesEnabled: true }),
    (error: unknown) => error instanceof DomainError && error.code === 'VARIANT_INACTIVE',
  );
  assert.equal(subject.snapshot().status, 'inactive');
  assert.equal(subject.snapshot().salesEnabled, false);

  subject.update({ status: 'active' });
  assert.equal(subject.snapshot().status, 'active');
  assert.equal(subject.snapshot().salesEnabled, false);

  subject.update({ salesEnabled: true });
  assert.equal(subject.snapshot().salesEnabled, true);
});
