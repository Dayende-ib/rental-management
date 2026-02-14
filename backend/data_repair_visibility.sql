-- Data repair script: landlord visibility + property status consistency
-- Run in Supabase SQL Editor (project used by `backend/.env`).

BEGIN;

-- 1) Backfill contracts.landlord_id from properties.owner_id when missing.
UPDATE contracts c
SET landlord_id = p.owner_id
FROM properties p
WHERE c.property_id = p.id
  AND c.landlord_id IS NULL
  AND p.owner_id IS NOT NULL;

-- 2) If a property has no owner_id but has contracts with landlord_id,
-- backfill owner_id from the most recent contract with a landlord_id.
WITH latest_landlord AS (
    SELECT DISTINCT ON (c.property_id)
        c.property_id,
        c.landlord_id
    FROM contracts c
    WHERE c.landlord_id IS NOT NULL
    ORDER BY c.property_id, c.updated_at DESC NULLS LAST, c.created_at DESC NULLS LAST
)
UPDATE properties p
SET owner_id = ll.landlord_id
FROM latest_landlord ll
WHERE p.id = ll.property_id
  AND p.owner_id IS NULL;

-- 3) Sync property status with active contracts.
-- If a property has an active contract, force status = rented.
UPDATE properties p
SET status = 'rented'
WHERE EXISTS (
    SELECT 1
    FROM contracts c
    WHERE c.property_id = p.id
      AND c.status = 'active'
);

-- If no active contract exists, set rented -> available
-- (keep maintenance/sold untouched).
UPDATE properties p
SET status = 'available'
WHERE p.status = 'rented'
  AND NOT EXISTS (
      SELECT 1
      FROM contracts c
      WHERE c.property_id = p.id
        AND c.status = 'active'
  );

COMMIT;

-- Diagnostics after repair (run these SELECTs to verify)
-- A) Contracts still missing landlord_id
SELECT COUNT(*) AS contracts_missing_landlord_id
FROM contracts
WHERE landlord_id IS NULL;

-- B) Active contracts that still mismatch property owner
SELECT c.id AS contract_id, c.property_id, c.landlord_id, p.owner_id
FROM contracts c
JOIN properties p ON p.id = c.property_id
WHERE c.status = 'active'
  AND c.landlord_id IS DISTINCT FROM p.owner_id;

-- C) Duplicate active contracts on same property (must be 0 with uq_active_contract_per_property)
SELECT property_id, COUNT(*) AS active_count
FROM contracts
WHERE status = 'active'
GROUP BY property_id
HAVING COUNT(*) > 1;
