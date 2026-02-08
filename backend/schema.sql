-- Real Estate Management System Schema

-- Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'manager', 'staff')) DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Properties Table
CREATE TABLE IF NOT EXISTS properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    city TEXT,
    postal_code TEXT,
    surface DECIMAL(10, 2),
    rooms INTEGER,
    photos TEXT[],
    price DECIMAL(12, 2) NOT NULL,
    type TEXT CHECK (type IN ('apartment', 'house', 'studio')) DEFAULT 'apartment',
    status TEXT CHECK (status IN ('available', 'rented', 'maintenance')) DEFAULT 'available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Available Properties View
CREATE OR REPLACE VIEW available_properties AS
SELECT * FROM properties WHERE status = 'available';

-- Storage bucket for property photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for property photos
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

-- Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    emergency_contact TEXT,
    document_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Contracts Table
CREATE TABLE IF NOT EXISTS contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    monthly_rent DECIMAL(12, 2) NOT NULL,
    deposit DECIMAL(12, 2),
    status TEXT CHECK (status IN ('active', 'terminated', 'expired')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'cash', 'card')) DEFAULT 'bank_transfer',
    status TEXT CHECK (status IN ('paid', 'pending', 'overdue')) DEFAULT 'pending',
    proof_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Maintenance Requests Table
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

-- RLS Policies Configuration

-- Enable RLS for all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Properties Policies
CREATE POLICY "Properties are viewable by everyone" ON properties FOR SELECT USING (true);
-- CORRECTION: Utilisation de FOR ALL au lieu de ALL
CREATE POLICY "Properties are manageable by authenticated users" ON properties FOR ALL TO authenticated USING (auth.role() = 'authenticated');

-- Tenants Policies
CREATE POLICY "Tenants are manageable by authenticated users" ON tenants FOR ALL TO authenticated USING (auth.role() = 'authenticated');

-- Contracts Policies
CREATE POLICY "Contracts are manageable by authenticated users" ON contracts FOR ALL TO authenticated USING (auth.role() = 'authenticated');

-- Payments Policies
CREATE POLICY "Payments are manageable by authenticated users" ON payments FOR ALL TO authenticated USING (auth.role() = 'authenticated');

-- Maintenance Policies
CREATE POLICY "Maintenance is manageable by authenticated users" ON maintenance_requests FOR ALL TO authenticated USING (auth.role() = 'authenticated');
