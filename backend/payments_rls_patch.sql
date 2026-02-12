-- Incremental payments RLS patch (safe to re-run)
-- Date: 2026-02-11

BEGIN;

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
    AND due_date < date_trunc('month', now()) + interval '2 month'
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

COMMIT;
