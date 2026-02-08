-- Migration: align schema to latest app expectations
-- Safe to run multiple times (uses IF EXISTS / IF NOT EXISTS where possible).
-- Run in Supabase SQL Editor (service role).

BEGIN;

-- 1) properties: add new columns
ALTER TABLE IF EXISTS properties
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS surface DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS rooms INTEGER,
  ADD COLUMN IF NOT EXISTS photos TEXT[];

-- 2) payments: add proof_url and align CHECK constraints
ALTER TABLE IF EXISTS payments
  ADD COLUMN IF NOT EXISTS proof_url TEXT;

DO $$
DECLARE c RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    -- drop old payment_method checks
    FOR c IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.payments'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%payment_method%'
    LOOP
      EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT %I', c.conname);
    END LOOP;

    -- drop old status checks
    FOR c IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.payments'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%status%'
    LOOP
      EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT %I', c.conname);
    END LOOP;

    -- add new checks if missing
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.payments'::regclass
        AND conname = 'payments_payment_method_check'
    ) THEN
      EXECUTE 'ALTER TABLE public.payments
               ADD CONSTRAINT payments_payment_method_check
               CHECK (payment_method IN (''bank_transfer'',''cash'',''card''))';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.payments'::regclass
        AND conname = 'payments_status_check'
    ) THEN
      EXECUTE 'ALTER TABLE public.payments
               ADD CONSTRAINT payments_status_check
               CHECK (status IN (''paid'',''pending'',''overdue''))';
    END IF;
  END IF;
END $$;

-- 3) maintenance -> maintenance_requests (rename if needed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'maintenance'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'maintenance_requests'
  ) THEN
    EXECUTE 'ALTER TABLE public.maintenance RENAME TO maintenance_requests';
  END IF;
END $$;

-- Ensure table exists if neither existed
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    cost DECIMAL(12, 2),
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    request_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add/align maintenance_requests columns and constraints
ALTER TABLE IF EXISTS maintenance_requests
  ADD COLUMN IF NOT EXISTS request_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

DO $$
DECLARE c RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_requests') THEN
    -- drop old status checks
    FOR c IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.maintenance_requests'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%status%'
    LOOP
      EXECUTE format('ALTER TABLE public.maintenance_requests DROP CONSTRAINT %I', c.conname);
    END LOOP;

    -- drop old priority checks
    FOR c IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.maintenance_requests'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%priority%'
    LOOP
      EXECUTE format('ALTER TABLE public.maintenance_requests DROP CONSTRAINT %I', c.conname);
    END LOOP;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.maintenance_requests'::regclass
        AND conname = 'maintenance_requests_status_check'
    ) THEN
      EXECUTE 'ALTER TABLE public.maintenance_requests
               ADD CONSTRAINT maintenance_requests_status_check
               CHECK (status IN (''pending'',''in_progress'',''completed'',''cancelled''))';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.maintenance_requests'::regclass
        AND conname = 'maintenance_requests_priority_check'
    ) THEN
      EXECUTE 'ALTER TABLE public.maintenance_requests
               ADD CONSTRAINT maintenance_requests_priority_check
               CHECK (priority IN (''low'',''medium'',''high'',''urgent''))';
    END IF;
  END IF;
END $$;

-- 4) available properties view
CREATE OR REPLACE VIEW available_properties AS
SELECT * FROM properties WHERE status = 'available';

-- 5) RLS for maintenance_requests (if not enabled already)
ALTER TABLE IF EXISTS maintenance_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'maintenance_requests'
        AND policyname = 'Maintenance is manageable by authenticated users'
  ) THEN
      EXECUTE 'CREATE POLICY "Maintenance is manageable by authenticated users"
               ON public.maintenance_requests FOR ALL
               TO authenticated USING (auth.role() = ''authenticated'')';
  END IF;
END $$;

COMMIT;

-- 6) Storage (run in Supabase SQL Editor with service role)
-- Create bucket if missing
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Public read property photos'
    ) THEN
        EXECUTE 'CREATE POLICY "Public read property photos" ON storage.objects
                 FOR SELECT USING (bucket_id = ''property-photos'')';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Authenticated upload property photos'
    ) THEN
        EXECUTE 'CREATE POLICY "Authenticated upload property photos" ON storage.objects
                 FOR INSERT TO authenticated WITH CHECK (bucket_id = ''property-photos'')';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Authenticated delete property photos'
    ) THEN
        EXECUTE 'CREATE POLICY "Authenticated delete property photos" ON storage.objects
                 FOR DELETE TO authenticated USING (bucket_id = ''property-photos'')';
    END IF;
END $$;
