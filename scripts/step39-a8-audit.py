from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parents[1]
order=(root/'src/modules/orders/application/order.service.ts').read_text()
fulfillment=(root/'src/modules/fulfillment/application/fulfillment.service.ts').read_text()
shipment=(root/'src/modules/fulfillment/application/shipment.service.ts').read_text()
emitted=set(re.findall(r"fulfillmentEvent\('([^']+)'",fulfillment+shipment))
checks={}
checks['order projection joins fulfillment']="LEFT JOIN fulfillment.fulfillments" in order
checks['order projection no constant unfulfilled']="fulfillment_status:'unfulfilled'" not in order
checks['order projection defaults safely']="fulfillment_status:String(o.fulfillment_status??'unfulfilled')" in order
checks['timeline includes fulfillment']="FROM fulfillment.fulfillments" in order
checks['timeline includes shipments']="FROM fulfillment.shipments" in order
schemas={}
for event in emitted:
    p=root/'contracts/events'/f'{event}.schema.json'
    checks[f'schema exists {event}']=p.exists()
    if p.exists():
        try:
            data=json.loads(p.read_text())
            schemas[event]=data
            checks[f'schema object {event}']=data.get('type')=='object'
            checks[f'schema closed {event}']=data.get('additionalProperties') is False
            checks[f'schema required {event}']=isinstance(data.get('required'),list) and len(data['required'])>0
        except Exception:
            checks[f'schema parses {event}']=False
checks['all emitted events schema-covered']=all((root/'contracts/events'/f'{e}.schema.json').exists() for e in emitted)
for k,v in checks.items(): print(('PASS ' if v else 'FAIL ')+k)
print(f"{sum(bool(x) for x in checks.values())}/{len(checks)} PASS")
sys.exit(0 if all(checks.values()) else 1)
