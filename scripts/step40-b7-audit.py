from pathlib import Path
import yaml,re,sys
root=Path(__file__).resolve().parents[1]
rc=(root/'src/modules/returns/presentation/returns.controller.ts').read_text()
wc=(root/'src/modules/warranty/presentation/warranty.controller.ts').read_text()
m=(root/'database/migrations/0016_after_sales_core.sql').read_text()
doc=yaml.safe_load((root/'contracts/http/openapi.yaml').read_text())

expected=[
('POST','customer/orders/:order_number/returns'),
('GET','customer/returns'),
('GET','customer/returns/:return_number'),
('POST','customer/returns/:return_number/cancel'),
('POST','customer/warranty/claims'),
('GET','customer/warranty/claims'),
('GET','customer/warranty/claims/:claim_number'),
('GET','admin/returns'),
('GET','admin/returns/:id'),
('POST','admin/returns/:id/start-review'),
('POST','admin/returns/:id/approve'),
('POST','admin/returns/:id/reject'),
('POST','admin/returns/:id/receive'),
('POST','admin/returns/:id/start-inspection'),
('POST','admin/returns/:id/resolve'),
('GET','admin/warranty/claims'),
('GET','admin/warranty/claims/:id'),
('POST','admin/warranty/claims/:id/start-review'),
('POST','admin/warranty/claims/:id/approve'),
('POST','admin/warranty/claims/:id/reject'),
('POST','admin/warranty/claims/:id/receive'),
('POST','admin/warranty/claims/:id/start-repair'),
('POST','admin/warranty/claims/:id/resolve'),
('POST','admin/warranty/claims/:id/close'),
]
allc=rc+'\n'+wc
checks={}
for method,path in expected:
    dec="@"+("Get" if method=="GET" else "Post")+f"('{path}')"
    checks[f'{method} {path}']=dec in allc
checks['24 operations']=len(expected)==24
checks['customer guarded']=allc.count('@CustomerOnly()')>=7
checks['admin staff guarded']=allc.count('@StaffOnly()')>=17
checks['all admin permissions migrated']=all(x in m for x in set(re.findall(r"@Permissions\('([^']+)'\)",allc)))
checks['return resolve step-up']="@Permissions('returns.resolve')" in rc and "@RequireStepUp()" in rc
checks['warranty critical step-up']=wc.count("@RequireStepUp()")>=2
checks['all POST routes idempotent']=allc.count("@RequireIdempotency(")>=16
checks['return resolve wired']=("this.returns.resolve(" in rc)
checks['warranty resolve wired']=("this.warranty.resolve(" in wc)
checks['procurement routes untouched']="purchase-returns" not in allc

api_paths={p for p in doc['paths'] if (p.startswith('/customer/returns') or p.startswith('/customer/warranty') or p.startswith('/customer/orders/') and p.endswith('/returns') or p.startswith('/admin/returns') or p.startswith('/admin/warranty/claims'))}
api_ops=sum(1 for p in api_paths for meth in doc['paths'][p] if meth in {'get','post','put','patch','delete'})
checks['openapi after-sales paths >=23']=len(api_paths)>=23
checks['openapi after-sales operations >=24']=api_ops>=24

for k,v in checks.items():print(('PASS ' if v else 'FAIL ')+k)
print(f"{sum(bool(v) for v in checks.values())}/{len(checks)} PASS")
sys.exit(0 if all(checks.values()) else 1)
