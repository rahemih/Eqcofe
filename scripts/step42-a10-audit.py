from pathlib import Path
paths={
'oport':Path('src/modules/orders/application/ports/order-customer-read.port.ts'),
'osvc':Path('src/modules/orders/application/ports/order-customer-read.service.ts'),
'rport':Path('src/modules/returns/application/ports/return-customer-read.port.ts'),
'rsvc':Path('src/modules/returns/application/ports/return-customer-read.service.ts'),
'wport':Path('src/modules/warranty/application/ports/warranty-customer-read.port.ts'),
'wsvc':Path('src/modules/warranty/application/ports/warranty-customer-read.service.ts'),
'om':Path('src/modules/orders/orders.module.ts'),'rm':Path('src/modules/returns/returns.module.ts'),'wm':Path('src/modules/warranty/warranty.module.ts'),
'oc':Path('src/modules/orders/presentation/orders.controller.ts'),'rc':Path('src/modules/returns/presentation/returns.controller.ts'),'wc':Path('src/modules/warranty/presentation/warranty.controller.ts'),
'cm':Path('src/modules/customer/customer.module.ts')}
t={k:v.read_text() for k,v in paths.items()}
customer='\n'.join(p.read_text() for p in Path('src/modules/customer').rglob('*.ts')).lower()
checks={
'order port exists':'ORDER_CUSTOMER_READ_PORT' in t['oport'],
'return port exists':'RETURN_CUSTOMER_READ_PORT' in t['rport'],
'warranty port exists':'WARRANTY_CUSTOMER_READ_PORT' in t['wport'],
'order adapter owner service':'OrderService' in t['osvc'] and 'listCustomer' in t['osvc'],
'return adapter owner service':'ReturnsService' in t['rsvc'] and 'listCustomer' in t['rsvc'],
'warranty adapter owner service':'WarrantyService' in t['wsvc'] and 'listCustomer' in t['wsvc'],
'orders exports read port':'ORDER_CUSTOMER_READ_PORT' in t['om'] and 'exports:' in t['om'],
'returns exports read port':'RETURN_CUSTOMER_READ_PORT' in t['rm'] and 'exports:' in t['rm'],
'warranty exports read port':'WARRANTY_CUSTOMER_READ_PORT' in t['wm'] and 'exports:' in t['wm'],
'order reads via port':'customerRead.list' in t['oc'] and 'customerRead.get' in t['oc'] and 'customerRead.timeline' in t['oc'] and 'customerRead.invoice' in t['oc'],
'return reads via port':'customerRead.list' in t['rc'] and 'customerRead.get' in t['rc'] and 'customerRead.timeline' in t['rc'],
'warranty reads via port':'customerRead.list' in t['wc'] and 'customerRead.get' in t['wc'] and 'customerRead.timeline' in t['wc'],
'order mutation remains owner':'svc.cancelCustomer' in t['oc'],
'return mutation remains owner':'returns.createCustomer' in t['rc'] and 'returns.cancelCustomer' in t['rc'],
'warranty mutation remains owner':'warranty.createCustomer' in t['wc'],
'customer no orders sql':'orders.orders' not in customer,
'customer no returns sql':'returns.' not in customer,
'customer no warranty sql':'warranty.' not in customer,
'customer no module imports':'../orders' not in customer and '../returns' not in customer and '../warranty' not in customer,
'no a10 migration':not Path('database/migrations/0028_customer_read_models.sql').exists(),
'customer only read routes':'@CustomerOnly()' in t['oc'] and '@CustomerOnly()' in t['rc'] and '@CustomerOnly()' in t['wc'],
'no public read routes':'@Public() @Get(\'customer/' not in t['oc'] and '@Public()\n  @Get(\'customer/' not in t['rc'] and '@Public()\n  @Get(\'customer/' not in t['wc'],
'no customer read duplication':'OrderCustomerReadService' not in customer and 'ReturnCustomerReadService' not in customer and 'WarrantyCustomerReadService' not in customer,
}
for k,v in checks.items():print(('PASS' if v else 'FAIL'),k)
assert all(checks.values()),[k for k,v in checks.items() if not v]
print(f'{sum(checks.values())}/{len(checks)} PASS')
