from pathlib import Path
s=Path('src/modules/customer/application/customer-wishlist.service.ts').read_text()
r=Path('src/modules/customer/infrastructure/customer.repository.ts').read_text()
m=Path('database/migrations/0026_customer_core.sql').read_text()
cm=Path('src/modules/customer/customer.module.ts').read_text()
cat=Path('src/modules/catalog/catalog.module.ts').read_text()
port=Path('src/modules/catalog/application/ports/catalog-customer.port.ts').read_text()
adapter=Path('src/modules/catalog/infrastructure/catalog-customer.adapter.ts').read_text()
e=Path('src/modules/customer/domain/customer.events.ts').read_text()
checks={
 'wishlist service exists':'class CustomerWishlistService' in s,
 'customer actor ownership':"actor?.type!=='customer'" in s,
 'inactive customer fail closed':'assertCustomerActive' in s and "customer.status!=='active'" in s,
 'wishlist composite pk db guard':'PRIMARY KEY(customer_id,product_id)' in m,
 'repo add conflict idempotent':'ON CONFLICT(customer_id,product_id) DO NOTHING' in r,
 'repo remove customer scoped':'WHERE customer_id=${customerId}::uuid AND product_id=${productId}::uuid' in r,
 'repo list customer scoped':'FROM customer.wishlist_items WHERE customer_id=${customerId}::uuid' in r,
 'catalog validation port':'CATALOG_CUSTOMER_PORT' in s and 'productExists' in s,
 'catalog port adapter stays catalog-owned':'CatalogCustomerAdapter' in adapter and 'CatalogRepository' in adapter,
 'catalog port is exported':'CATALOG_CUSTOMER_PORT' in cat and 'exports: [CatalogQueryService,CATALOG_CUSTOMER_PORT]' in cat,
 'customer imports catalog module':'imports:[CatalogModule]' in cm,
 'no customer direct catalog sql':'catalog.products' not in s and 'catalog.products' not in r,
 'add idempotent no duplicate event':'if(!row)return {added:true' in s,
 'remove idempotent no duplicate event':'if(!removed)return {removed:true' in s,
 'add event':'customer.wishlist.item_added.v1' in s,
 'remove event':'customer.wishlist.item_removed.v1' in s,
 'audit add':'customer.wishlist.add' in s,
 'audit remove':'customer.wishlist.remove' in s,
 'wishlist aggregate event':"aggregateType:'customer_wishlist'" in e,
 'no product title copied':'title' not in s.lower(),
 'no product price copied':'price' not in s.lower(),
 'no product stock copied':'stock' not in s.lower(),
 'http deferred':'@Controller' not in s,
 'event contracts':Path('contracts/events/customer.wishlist.item_added.v1.schema.json').exists() and Path('contracts/events/customer.wishlist.item_removed.v1.schema.json').exists(),
}
for k,v in checks.items(): print(('PASS' if v else 'FAIL'),k)
assert all(checks.values()),[k for k,v in checks.items() if not v]
print(f'{sum(checks.values())}/{len(checks)} PASS')
