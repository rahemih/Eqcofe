import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const service=fs.readFileSync('src/modules/customer/application/customer-address.service.ts','utf8');
const repo=fs.readFileSync('src/modules/customer/infrastructure/customer.repository.ts','utf8');
const migration=fs.readFileSync('database/migrations/0026_customer_core.sql','utf8');

test('address ownership is always customer scoped',()=>{assert.match(repo,/WHERE id=\$\{id\}::uuid AND customer_id=\$\{customerId\}::uuid/);});
test('address uses same core shipping validation as orders',()=>{assert.match(service,/\^09\\d\{9\}\$/);assert.match(service,/\^\\d\{10\}\$/);assert.match(service,/150/);assert.match(service,/1000/);});
test('only one default address is database enforced',()=>{assert.match(migration,/uq_customer_addresses_one_default_shipping/);assert.match(service,/clearDefaultAddress/);});
test('default change is separated from normal patch',()=>{assert.match(service,/async setDefault/);assert.match(service,/ADDRESS_FIELD_FORBIDDEN/);});
test('address write paths have optimistic concurrency',()=>{assert.match(repo,/version=\$\{input.expectedVersion\}/);assert.match(repo,/version=\$\{expectedVersion\}/);});
test('deleting default does not guess another default',()=>{const d=service.slice(service.indexOf('async delete(addressId'));assert.doesNotMatch(d,/markDefaultAddress/);});
test('events do not copy raw address pii',()=>{const e=service.slice(service.indexOf("customerAddressEvent('customer.address"));assert.doesNotMatch(e,/recipient_mobile:/);assert.doesNotMatch(e,/address_line:/);});
test('inactive customer mutations fail closed',()=>{assert.match(service,/assertCustomerActive/);assert.match(service,/customer\.status!==?'active'/);});
test('http remains deferred to A9',()=>{assert.doesNotMatch(service,/@Controller/);});
