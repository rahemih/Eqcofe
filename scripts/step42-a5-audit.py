from pathlib import Path
s=Path('src/modules/customer/application/customer-address.service.ts').read_text()
r=Path('src/modules/customer/infrastructure/customer.repository.ts').read_text()
m=Path('src/modules/customer/customer.module.ts').read_text()
e=Path('src/modules/customer/domain/customer.events.ts').read_text()
sql=Path('database/migrations/0026_customer_core.sql').read_text()
event_slice=s[s.find("customerAddressEvent('customer.address"):]
checks={
 'address service exists':'class CustomerAddressService' in s,
 'customer actor ownership':"actor?.type!=='customer'" in s,
 'checkout-compatible mobile validation':'/^09\\d{9}$/' in s,
 'postal validation':'/^\\d{10}$/' in s,
 'uuid validation':'[0-9a-f]{8}' in s,
 'update forbids default mutation':"is_default'" not in s[s.find("const allowed=new Set"):s.find("const keys=",s.find("const allowed=new Set"))],
 'default is explicit operation':'async setDefault' in s,
 'delete does not auto reassign default':'delete(addressId' in s and 'markDefaultAddress' not in s[s.find('async delete(addressId'):],
 'ownership scoped repository':'AND customer_id=${customerId}::uuid' in r,
 'optimistic update guard':'AND version=${input.expectedVersion}' in r,
 'optimistic default guard':'AND version=${expectedVersion}' in r,
 'optimistic delete guard':'AND version=${expectedVersion}' in r,
 'one default db guard':'uq_customer_addresses_one_default_shipping' in sql,
 'transactional outbox':'this.outbox.append(ex' in s,
 'audit writes':'this.audit.writeWith(ex' in s,
 'address events present':all(x in s for x in ['customer.address.created.v1','customer.address.updated.v1','customer.address.deleted.v1','customer.address.default_changed.v1']),
 'event payload avoids raw pii':'recipient_mobile:' not in event_slice and 'address_line:' not in event_slice,
 'address aggregate event':"aggregateType:'customer_address'" in e,
 'inactive customer fail closed':'assertCustomerActive' in s and "customer.status!=='active'" in s,
 'module wired':'CustomerAddressService' in m,
 'no http controller':'@Controller' not in s,
 'no pricing customer sql':'pricing.' not in s.lower(),
}
for k,v in checks.items():print(('PASS' if v else 'FAIL'),k)
assert all(checks.values()),[k for k,v in checks.items() if not v]
print(f'{sum(checks.values())}/{len(checks)} PASS')
