from pathlib import Path
import re,sys
root=Path(__file__).resolve().parents[1]
m=(root/'database/migrations/0016_after_sales_core.sql').read_text()
checks={
'returns schema':"CREATE SCHEMA IF NOT EXISTS returns" in m,
'warranty schema':"CREATE SCHEMA IF NOT EXISTS warranty" in m,
'returns policy configurable':"return_window_days" in m and "customer_pays_return_shipping" in m,
'warranty policy configurable':"warranty_days" in m,
'return header table':"CREATE TABLE IF NOT EXISTS returns.returns" in m,
'return items table':"CREATE TABLE IF NOT EXISTS returns.return_items" in m,
'warranty claims table':"CREATE TABLE IF NOT EXISTS warranty.claims" in m,
'return delivered eligibility':"RETURN_ITEM_NOT_DELIVERED" in m,
'return quantity cap':"RETURN_QUANTITY_EXCEEDS_DELIVERED" in m,
'return window configured':"RETURN_WINDOW_EXPIRED" in m,
'warranty delivered eligibility':"WARRANTY_ITEM_NOT_DELIVERED" in m,
'warranty window configured':"WARRANTY_WINDOW_EXPIRED" in m,
'customer-order lineage return':"RETURN_CUSTOMER_ORDER_MISMATCH" in m,
'customer-order lineage warranty':"WARRANTY_CUSTOMER_ORDER_MISMATCH" in m,
'return refund lineage':"RETURN_REFUND_ORDER_MISMATCH" in m,
'warranty refund lineage':"WARRANTY_REFUND_ORDER_MISMATCH" in m,
'inventory movement FK':"fk_inventory_movement_return_item" in m,
'inventory FK not-valid phase':"ON DELETE RESTRICT NOT VALID" in m,
'inventory FK validate phase':"VALIDATE CONSTRAINT fk_inventory_movement_return_item" in m,
'return transition guard':"RETURN_INVALID_STATE_TRANSITION" in m,
'warranty transition guard':"WARRANTY_INVALID_STATE_TRANSITION" in m,
'return history append-only':"returns.status_history is append-only" in m,
'warranty history append-only':"warranty.status_history is append-only" in m,
'active warranty uniqueness':"ux_warranty_active_order_item" in m,
'no incompatible migration name insert':"schema_migrations(version,name)" not in m,
'returns critical permission':"'returns.resolve'" in m,
'warranty critical permission':"'warranty.resolve'" in m,
'transaction wrapper':m.lstrip().startswith("BEGIN;") and m.rstrip().endswith("COMMIT;"),
}
for k,v in checks.items(): print(("PASS " if v else "FAIL ")+k)
print(f"{sum(checks.values())}/{len(checks)} PASS")
sys.exit(0 if all(checks.values()) else 1)
