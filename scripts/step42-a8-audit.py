from pathlib import Path
port=Path('src/modules/customer/application/ports/customer-commerce.port.ts').read_text()
adapter=Path('src/modules/customer/infrastructure/customer-commerce.adapter.ts').read_text()
cm=Path('src/modules/customer/customer.module.ts').read_text()
cart=Path('src/modules/cart/application/cart.service.ts').read_text()
cartm=Path('src/modules/cart/cart.module.ts').read_text()
pricing=Path('src/modules/pricing/application/pricing-query.service.ts').read_text()
engine=Path('src/modules/pricing/domain/pricing-engine.ts').read_text()
checks={
 'customer commerce port exists':'CUSTOMER_COMMERCE_PORT' in port and 'getCustomerType' in port,
 'port has only retail wholesale type':"'retail'|'wholesale'" in port,
 'adapter implements customer port':'implements CustomerCommercePort' in adapter,
 'guest is retail in customer boundary':"if(!customerId)return 'retail'" in adapter,
 'customer type loaded by customer repo':'profileById(customerId)' in adapter,
 'inactive customer fail closed':'CUSTOMER_COMMERCE_UNAVAILABLE' in adapter and "customer.status!=='active'" in adapter,
 'authoritative wholesale only from persisted type':"customer.customer_type==='wholesale'?'wholesale':'retail'" in adapter,
 'customer module binds public token':'provide:CUSTOMER_COMMERCE_PORT' in cm,
 'customer module exports public token':'CUSTOMER_COMMERCE_PORT' in cm and 'exports:[' in cm,
 'cart imports customer module':'CustomerModule' in cartm and 'imports:[PricingModule,InventoryModule,TaxModule,CustomerModule]' in cartm,
 'cart injects customer commerce port':'@Inject(CUSTOMER_COMMERCE_PORT)' in cart,
 'quote resolves type once from cart owner':'customerCommerce.getCustomerType(c.customer_id?String(c.customer_id):null)' in cart,
 'pricing quote receives resolved type':'quantity,customerType}' in cart,
 'hardcoded retail quote removed':"customerType:'retail'" not in cart,
 'quote response exposes type snapshot':'customer_type:customerType' in cart,
 'pricing result carries type':'customer_type:customerType' in pricing,
 'pricing engine filters targeted rules':'r.customerType==null||r.customerType===customerType' in engine,
 'pricing has no customer sql':'customer.customers' not in pricing and 'customer.' not in pricing,
 'cart has no customer sql':'customer.customers' not in cart and 'FROM customer.' not in cart and 'JOIN customer.' not in cart,
 'port has no pricing dependency':'pricing' not in port.lower() and 'cart' not in port.lower(),
 'customer adapter has no pricing dependency':'pricing' not in adapter.lower() and 'cart' not in adapter.lower(),
 'guest rule remains explicit in A2 direction':"if(!customerId)return 'retail'" in adapter,
 'no wallet introduced':'wallet' not in (port+adapter+cart).lower(),
 'toman pricing untouched':'base_price_toman' in pricing and 'current_toman' in pricing,
 'http deferred for customer port':'@Controller' not in adapter and '@Controller' not in port,
}
for k,v in checks.items(): print(('PASS' if v else 'FAIL'),k)
assert all(checks.values()),[k for k,v in checks.items() if not v]
print(f'{sum(checks.values())}/{len(checks)} PASS')
