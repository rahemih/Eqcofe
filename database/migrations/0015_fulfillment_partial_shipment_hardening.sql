BEGIN;

CREATE OR REPLACE FUNCTION fulfillment.assert_shipment(p_shipment uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE sh fulfillment.shipments%ROWTYPE; bad integer; item_count integer;
        aid uuid; picked integer; progress_shipped integer; alloc_qty integer; invstatus text;
        reserved_qty integer; physical_qty integer;
BEGIN
  SELECT * INTO sh FROM fulfillment.shipments WHERE id=p_shipment;
  IF NOT FOUND THEN RETURN; END IF;
  PERFORM fulfillment.assert_order_eligible(sh.order_id);

  IF sh.carrier_provider_id IS NOT NULL THEN
    IF sh.provider_key IS NULL OR NOT EXISTS(
      SELECT 1 FROM fulfillment.carrier_providers cp
      WHERE cp.id=sh.carrier_provider_id AND cp.is_active=true AND cp.provider_key=sh.provider_key
    ) THEN RAISE EXCEPTION 'FULFILLMENT_CARRIER_PROVIDER_INVALID'; END IF;
  ELSIF sh.provider_key IS NOT NULL THEN
    RAISE EXCEPTION 'FULFILLMENT_PROVIDER_SNAPSHOT_WITHOUT_CARRIER';
  END IF;

  SELECT count(*) INTO item_count FROM fulfillment.shipment_items WHERE shipment_id=sh.id;
  IF item_count=0 THEN RAISE EXCEPTION 'FULFILLMENT_SHIPMENT_ITEMS_REQUIRED'; END IF;

  SELECT COUNT(*) INTO bad
  FROM fulfillment.shipment_items si
  JOIN fulfillment.allocation_progress fp ON fp.allocation_id=si.allocation_id
  JOIN inventory.allocations a ON a.id=si.allocation_id
  JOIN orders.order_items oi ON oi.id=si.order_item_id
  WHERE si.shipment_id=sh.id
    AND (fp.order_id<>sh.order_id OR fp.order_item_id<>si.order_item_id OR oi.order_id<>sh.order_id
      OR a.warehouse_id<>sh.warehouse_id OR a.order_item_id<>si.order_item_id);
  IF bad>0 THEN RAISE EXCEPTION 'FULFILLMENT_SHIPMENT_LINEAGE_MISMATCH'; END IF;

  FOR aid,picked,progress_shipped,alloc_qty,invstatus IN
    SELECT DISTINCT fp.allocation_id,fp.picked_quantity,fp.shipped_quantity,a.quantity,a.status
    FROM fulfillment.allocation_progress fp
    JOIN inventory.allocations a ON a.id=fp.allocation_id
    WHERE EXISTS(
      SELECT 1 FROM fulfillment.shipment_items si
      WHERE si.shipment_id=sh.id AND si.allocation_id=fp.allocation_id
    )
  LOOP
    SELECT COALESCE(sum(si.quantity),0)::int INTO reserved_qty
    FROM fulfillment.shipment_items si
    JOIN fulfillment.shipments s ON s.id=si.shipment_id
    WHERE si.allocation_id=aid AND s.status<>'cancelled';

    SELECT COALESCE(sum(si.quantity),0)::int INTO physical_qty
    FROM fulfillment.shipment_items si
    JOIN fulfillment.shipments s ON s.id=si.shipment_id
    WHERE si.allocation_id=aid
      AND s.status IN ('handed_over','in_transit','delivered','delivery_failed','returned');

    IF reserved_qty>picked THEN RAISE EXCEPTION 'FULFILLMENT_SHIPMENT_EXCEEDS_PICKED'; END IF;
    IF progress_shipped<>physical_qty THEN RAISE EXCEPTION 'FULFILLMENT_SHIPPED_PROGRESS_MISMATCH'; END IF;
    IF progress_shipped>picked OR progress_shipped>alloc_qty THEN RAISE EXCEPTION 'FULFILLMENT_SHIPPED_EXCEEDS_PICKED'; END IF;
    IF progress_shipped=alloc_qty AND invstatus<>'shipped' THEN RAISE EXCEPTION 'FULFILLMENT_FULL_SHIPMENT_REQUIRES_SHIPPED_INVENTORY'; END IF;
    IF progress_shipped<alloc_qty AND invstatus='shipped' THEN RAISE EXCEPTION 'FULFILLMENT_PARTIAL_SHIPMENT_CANNOT_CLOSE_ALLOCATION'; END IF;
  END LOOP;
END $$;


COMMIT;
