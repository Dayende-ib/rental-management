-- Security hardening patch (run in Supabase SQL editor)
-- Date: 2026-02-11

BEGIN;

-- ============================================================================
-- Constraints and integrity
-- ============================================================================

-- Migrate legacy role before enforcing new role set
UPDATE profiles
SET role = 'manager'
WHERE role = 'staff';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'manager', 'tenant'));

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tenants_user_id_unique'
          AND conrelid = 'tenants'::regclass
    ) THEN
        ALTER TABLE tenants
            ADD CONSTRAINT tenants_user_id_unique UNIQUE (user_id);
    END IF;
END $$;

ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Backfill owner_id for existing data from latest contract landlord when possible
WITH inferred_owner AS (
    SELECT DISTINCT ON (c.property_id)
        c.property_id,
        c.landlord_id
    FROM contracts c
    WHERE c.landlord_id IS NOT NULL
    ORDER BY c.property_id, c.created_at DESC
)
UPDATE properties p
SET owner_id = io.landlord_id
FROM inferred_owner io
WHERE p.id = io.property_id
  AND p.owner_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_contract_month ON payments(contract_id, month);
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_contract_per_property ON contracts(property_id) WHERE status = 'active';

-- ============================================================================
-- Replace permissive RLS on core entities
-- ============================================================================

-- Properties
DROP POLICY IF EXISTS "Properties are manageable by authenticated users" ON properties;
DROP POLICY IF EXISTS "Properties are viewable by everyone" ON properties;
DROP POLICY IF EXISTS properties_backoffice_write ON properties;
DROP POLICY IF EXISTS properties_select_scoped ON properties;
DROP POLICY IF EXISTS properties_write_scoped ON properties;

-- Backoffice read:
-- - admin: all properties
-- - manager: only own properties
-- Public/mobile read remains available for available properties only.
CREATE POLICY properties_select_scoped ON properties
FOR SELECT TO anon, authenticated
USING (
    status = 'available'
    OR EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
    )
    OR EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'manager'
          AND properties.owner_id = auth.uid()
    )
);

-- Backoffice write:
-- - admin: can manage all
-- - manager: can manage only own properties
CREATE POLICY properties_write_scoped ON properties
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND (
              p.role = 'admin'
              OR (p.role = 'manager' AND properties.owner_id = auth.uid())
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND (
              p.role = 'admin'
              OR (p.role = 'manager' AND properties.owner_id = auth.uid())
          )
    )
);

-- Tenants
DROP POLICY IF EXISTS "Tenants are viewable by authenticated users" ON tenants;
DROP POLICY IF EXISTS "Tenants are manageable by authenticated users" ON tenants;
DROP POLICY IF EXISTS tenants_select_own_or_backoffice ON tenants;
DROP POLICY IF EXISTS tenants_backoffice_write ON tenants;
DROP POLICY IF EXISTS tenants_tenant_insert_own ON tenants;
DROP POLICY IF EXISTS tenants_tenant_update_own ON tenants;
CREATE POLICY tenants_select_own_or_backoffice ON tenants
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'manager')
    )
);
CREATE POLICY tenants_backoffice_write ON tenants
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'manager')
    )
);
CREATE POLICY tenants_tenant_insert_own ON tenants
FOR INSERT TO authenticated
WITH CHECK (
    user_id = auth.uid()
);
CREATE POLICY tenants_tenant_update_own ON tenants
FOR UPDATE TO authenticated
USING (
    user_id = auth.uid()
)
WITH CHECK (
    user_id = auth.uid()
);

-- Contracts
DROP POLICY IF EXISTS "Contracts are viewable by authenticated users" ON contracts;
DROP POLICY IF EXISTS "Contracts are manageable by authenticated users" ON contracts;
DROP POLICY IF EXISTS contracts_select_own_or_backoffice ON contracts;
DROP POLICY IF EXISTS contracts_backoffice_full ON contracts;
DROP POLICY IF EXISTS contracts_tenant_insert_draft ON contracts;
DROP POLICY IF EXISTS contracts_tenant_update_own ON contracts;
CREATE POLICY contracts_select_own_or_backoffice ON contracts
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM tenants t
        WHERE t.id = contracts.tenant_id
          AND t.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'manager')
    )
);
CREATE POLICY contracts_backoffice_full ON contracts
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'manager')
    )
);
CREATE POLICY contracts_tenant_insert_draft ON contracts
FOR INSERT TO authenticated
WITH CHECK (
    status = 'draft'
    AND EXISTS (
        SELECT 1
        FROM tenants t
        WHERE t.id = contracts.tenant_id
          AND t.user_id = auth.uid()
    )
);
CREATE POLICY contracts_tenant_update_own ON contracts
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM tenants t
        WHERE t.id = contracts.tenant_id
          AND t.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM tenants t
        WHERE t.id = contracts.tenant_id
          AND t.user_id = auth.uid()
    )
);

-- Payments
DROP POLICY IF EXISTS "Payments are viewable by authenticated users" ON payments;
DROP POLICY IF EXISTS "Payments are manageable by authenticated users" ON payments;
DROP POLICY IF EXISTS payments_select_own_or_backoffice ON payments;
DROP POLICY IF EXISTS payments_backoffice_full ON payments;
DROP POLICY IF EXISTS payments_tenant_insert_own ON payments;
DROP POLICY IF EXISTS payments_tenant_update_own ON payments;
CREATE POLICY payments_select_own_or_backoffice ON payments
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM contracts c
        JOIN tenants t ON t.id = c.tenant_id
        WHERE c.id = payments.contract_id
          AND t.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'manager')
    )
);
CREATE POLICY payments_backoffice_full ON payments
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'manager')
    )
);
CREATE POLICY payments_tenant_insert_own ON payments
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM contracts c
        JOIN tenants t ON t.id = c.tenant_id
        WHERE c.id = payments.contract_id
          AND t.user_id = auth.uid()
    )
    AND due_date >= date_trunc('month', now()) + interval '1 month'
);
CREATE POLICY payments_tenant_update_own ON payments
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM contracts c
        JOIN tenants t ON t.id = c.tenant_id
        WHERE c.id = payments.contract_id
          AND t.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM contracts c
        JOIN tenants t ON t.id = c.tenant_id
        WHERE c.id = payments.contract_id
          AND t.user_id = auth.uid()
    )
);

-- Maintenance
DROP POLICY IF EXISTS "Maintenance requests are viewable by authenticated users" ON maintenance_requests;
DROP POLICY IF EXISTS "Maintenance requests are manageable by authenticated users" ON maintenance_requests;
DROP POLICY IF EXISTS maintenance_select_own_or_backoffice ON maintenance_requests;
DROP POLICY IF EXISTS maintenance_backoffice_full ON maintenance_requests;
DROP POLICY IF EXISTS maintenance_tenant_insert_own ON maintenance_requests;
DROP POLICY IF EXISTS maintenance_tenant_update_own ON maintenance_requests;
CREATE POLICY maintenance_select_own_or_backoffice ON maintenance_requests
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM tenants t
        WHERE t.id = maintenance_requests.tenant_id
          AND t.user_id = auth.uid()
    )
    OR reported_by = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'manager')
    )
);
CREATE POLICY maintenance_backoffice_full ON maintenance_requests
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'manager')
    )
);
CREATE POLICY maintenance_tenant_insert_own ON maintenance_requests
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM tenants t
        WHERE t.id = maintenance_requests.tenant_id
          AND t.user_id = auth.uid()
    )
    AND reported_by = auth.uid()
);
CREATE POLICY maintenance_tenant_update_own ON maintenance_requests
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM tenants t
        WHERE t.id = maintenance_requests.tenant_id
          AND t.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM tenants t
        WHERE t.id = maintenance_requests.tenant_id
          AND t.user_id = auth.uid()
    )
);

COMMIT;


