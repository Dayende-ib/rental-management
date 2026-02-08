-- Schéma complet pour l'application de gestion locative - Supabase
-- Version: 1.0
-- Date: Février 2026

-- ============================================================================
-- TABLES PRINCIPALES
-- ============================================================================

-- Profils utilisateurs
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'manager', 'staff', 'tenant')) DEFAULT 'staff',
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Biens immobiliers
CREATE TABLE IF NOT EXISTS properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    city TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'France',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    surface DECIMAL(10, 2),
    rooms INTEGER,
    bedrooms INTEGER,
    bathrooms INTEGER,
    floor INTEGER,
    has_elevator BOOLEAN DEFAULT FALSE,
    photos TEXT[] DEFAULT ARRAY[]::TEXT[],
    price DECIMAL(12, 2) NOT NULL,
    charges DECIMAL(10, 2) DEFAULT 0,
    type TEXT CHECK (type IN ('apartment', 'house', 'studio', 'duplex', 'loft')) DEFAULT 'apartment',
    status TEXT CHECK (status IN ('available', 'rented', 'maintenance', 'sold')) DEFAULT 'available',
    energy_rating TEXT CHECK (energy_rating IN ('A', 'B', 'C', 'D', 'E', 'F', 'G')),
    year_built INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure existing deployments have the price column even if the table already existed
ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS price DECIMAL(12, 2);

-- Locataires
CREATE TABLE IF NOT EXISTS tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    phone_secondary TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    date_of_birth DATE,
    nationality TEXT,
    document_type TEXT CHECK (document_type IN ('passport', 'id_card', 'residence_permit')),
    document_id TEXT,
    document_expiry DATE,
    address TEXT,
    employment_status TEXT CHECK (employment_status IN ('employed', 'self-employed', 'student', 'retired', 'unemployed')),
    employer TEXT,
    salary DECIMAL(12, 2),
    guarantor_full_name TEXT,
    guarantor_email TEXT,
    guarantor_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Contrats de location
CREATE TABLE IF NOT EXISTS contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    landlord_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    duration_months INTEGER,
    monthly_rent DECIMAL(12, 2) NOT NULL,
    deposit DECIMAL(12, 2),
    deposit_status TEXT CHECK (deposit_status IN ('paid', 'partial', 'unpaid', 'returned', 'deducted')) DEFAULT 'unpaid',
    charges DECIMAL(10, 2) DEFAULT 0,
    agency_fees DECIMAL(10, 2) DEFAULT 0,
    payment_day INTEGER CHECK (payment_day >= 1 AND payment_day <= 31) DEFAULT 5,
    grace_period_days INTEGER DEFAULT 3,
    notice_period_days INTEGER DEFAULT 30,
    renewal_terms TEXT,
    special_conditions TEXT,
    status TEXT CHECK (status IN ('draft', 'active', 'terminated', 'expired')) DEFAULT 'draft',
    termination_date DATE,
    termination_reason TEXT,
    signed_at TIMESTAMP WITH TIME ZONE,
    signed_by_tenant BOOLEAN DEFAULT FALSE,
    signed_by_landlord BOOLEAN DEFAULT FALSE,
    contract_document_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Paiements
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
    month TEXT NOT NULL, -- Format: "Janvier 2026"
    amount DECIMAL(12, 2) NOT NULL,
    amount_paid DECIMAL(12, 2) DEFAULT 0,
    due_date DATE NOT NULL,
    payment_date DATE,
    payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'direct_debit', 'check', 'cash', 'card')) DEFAULT 'bank_transfer',
    transaction_id TEXT,
    status TEXT CHECK (status IN ('pending', 'paid', 'partial', 'overdue', 'cancelled')) DEFAULT 'pending',
    proof_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    validation_status TEXT CHECK (validation_status IN ('not_submitted', 'pending', 'validated', 'rejected')) DEFAULT 'not_submitted',
    validation_notes TEXT,
    validated_by UUID REFERENCES auth.users(id),
    validated_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    late_fee DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Demandes de maintenance
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT CHECK (category IN ('plumbing', 'electrical', 'heating', 'appliance', 'furniture', 'structural', 'other')) DEFAULT 'other',
    urgency TEXT CHECK (urgency IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    status TEXT CHECK (status IN ('reported', 'pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'reported',
    estimated_cost DECIMAL(12, 2),
    actual_cost DECIMAL(12, 2),
    scheduled_date DATE,
    completion_date DATE,
    notes TEXT,
    photos TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- TABLES DE SUPPORT
-- ============================================================================

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('info', 'warning', 'error', 'success')) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    related_entity_type TEXT CHECK (related_entity_type IN ('payment', 'maintenance', 'contract', 'property', 'tenant')),
    related_entity_id UUID,
    action_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Logs d'audit
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Caractéristiques des biens
CREATE TABLE IF NOT EXISTS property_features (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
    feature_name TEXT NOT NULL,
    feature_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(property_id, feature_name)
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('property', 'tenant', 'contract', 'maintenance')),
    entity_id UUID NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('lease_agreement', 'id_document', 'proof_of_income', 'insurance', 'photo', 'other')),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Messages/Communication
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    related_entity_type TEXT CHECK (related_entity_type IN ('payment', 'maintenance', 'contract', 'property')),
    related_entity_id UUID,
    attachments TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- VUES OPTIMISÉES
-- ============================================================================

-- Vue des biens disponibles
CREATE OR REPLACE VIEW available_properties AS
SELECT 
    p.*,
    STRING_AGG(pf.feature_name || ': ' || pf.feature_value, ', ') as features
FROM properties p
LEFT JOIN property_features pf ON p.id = pf.property_id
WHERE p.status = 'available'
GROUP BY p.id;

-- Vue du dashboard administrateur
CREATE OR REPLACE VIEW admin_dashboard AS
SELECT 
    COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'available') as available_properties,
    COUNT(DISTINCT p.id) as total_properties,
    COUNT(DISTINCT t.id) as total_tenants,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active') as active_contracts,
    COUNT(DISTINCT pay.id) FILTER (WHERE pay.status = 'overdue') as overdue_payments,
    COUNT(DISTINCT mr.id) FILTER (WHERE mr.status IN ('pending', 'in_progress')) as pending_maintenance,
    SUM(pay.amount) FILTER (WHERE pay.status = 'paid' AND EXTRACT(MONTH FROM pay.payment_date) = EXTRACT(MONTH FROM NOW())) as monthly_revenue,
    AVG(p.price) FILTER (WHERE p.status = 'available') as avg_rent_price
FROM properties p
LEFT JOIN contracts c ON p.id = c.property_id
LEFT JOIN tenants t ON c.tenant_id = t.id
LEFT JOIN payments pay ON c.id = pay.contract_id
LEFT JOIN maintenance_requests mr ON p.id = mr.property_id;

-- Vue des détails des contrats
CREATE OR REPLACE VIEW contract_details AS
SELECT 
    c.*,
    p.title as property_title,
    p.address as property_address,
    t.full_name as tenant_name,
    t.email as tenant_email,
    t.phone as tenant_phone,
    u.full_name as landlord_name
FROM contracts c
JOIN properties p ON c.property_id = p.id
JOIN tenants t ON c.tenant_id = t.id
LEFT JOIN profiles u ON c.landlord_id = u.id;

-- Vue des paiements avec détails
CREATE OR REPLACE VIEW payment_details AS
SELECT 
    pay.*,
    c.monthly_rent,
    p.title as property_title,
    t.full_name as tenant_name,
    t.email as tenant_email
FROM payments pay
JOIN contracts c ON pay.contract_id = c.id
JOIN properties p ON c.property_id = p.id
JOIN tenants t ON c.tenant_id = t.id;

-- ============================================================================
-- INDEXES POUR OPTIMISER LES PERFORMANCES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_contracts_property_id ON contracts(property_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_property_id ON maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_assigned_to ON maintenance_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);

-- ============================================================================
-- POLITIQUES RLS (ROW LEVEL SECURITY)
-- ============================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Politiques pour les profils
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Politiques pour les biens
CREATE POLICY "Properties are viewable by everyone" ON properties FOR SELECT USING (true);
CREATE POLICY "Properties are manageable by authenticated users" ON properties FOR ALL TO authenticated USING (auth.role() = 'authenticated');

-- Politiques pour les locataires
CREATE POLICY "Tenants are viewable by authenticated users" ON tenants FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "Tenants are manageable by authenticated users" ON tenants FOR ALL TO authenticated USING (auth.role() = 'authenticated');

-- Politiques pour les contrats
CREATE POLICY "Contracts are viewable by authenticated users" ON contracts FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "Contracts are manageable by authenticated users" ON contracts FOR ALL TO authenticated USING (auth.role() = 'authenticated');

-- Politiques pour les paiements
CREATE POLICY "Payments are viewable by authenticated users" ON payments FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "Payments are manageable by authenticated users" ON payments FOR ALL TO authenticated USING (auth.role() = 'authenticated');

-- Politiques pour la maintenance
CREATE POLICY "Maintenance requests are viewable by authenticated users" ON maintenance_requests FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "Maintenance requests are manageable by authenticated users" ON maintenance_requests FOR ALL TO authenticated USING (auth.role() = 'authenticated');

-- Politiques pour les notifications
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT WITH CHECK (true);

-- Politiques pour les logs d'audit
CREATE POLICY "Only admins can view audit logs" ON audit_logs FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- Politiques pour les caractéristiques
CREATE POLICY "Property features are viewable by everyone" ON property_features FOR SELECT USING (true);
CREATE POLICY "Property features are manageable by authenticated users" ON property_features FOR ALL TO authenticated USING (auth.role() = 'authenticated');

-- Politiques pour les documents
CREATE POLICY "Documents are viewable by authenticated users" ON documents FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "Documents are manageable by authenticated users" ON documents FOR ALL TO authenticated USING (auth.role() = 'authenticated');

-- Politiques pour les messages
CREATE POLICY "Users can view their messages" ON messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "Users can send messages" ON messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Recipients can update message status" ON messages FOR UPDATE TO authenticated USING (recipient_id = auth.uid());

-- ============================================================================
-- FONCTIONS UTILES
-- ============================================================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour les timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_requests_updated_at BEFORE UPDATE ON maintenance_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour générer les paiements mensuels
CREATE OR REPLACE FUNCTION generate_monthly_payments()
RETURNS void AS $$
DECLARE
    contract_record RECORD;
    payment_exists BOOLEAN;
    due_date DATE;
    month_name TEXT;
BEGIN
    FOR contract_record IN 
        SELECT c.*, p.title as property_title
        FROM contracts c
        JOIN properties p ON c.property_id = p.id
        WHERE c.status = 'active' 
        AND (c.end_date IS NULL OR c.end_date >= CURRENT_DATE)
    LOOP
        -- Calculer la date d'échéance (jour du paiement du contrat)
        due_date := MAKE_DATE(
            EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
            EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
            LEAST(contract_record.payment_day, 28)
        );
        
        -- Si la date d'échéance est déjà passée, passer au mois suivant
        IF due_date < CURRENT_DATE THEN
            due_date := due_date + INTERVAL '1 month';
        END IF;
        
        -- Format du mois
        month_name := TO_CHAR(due_date, 'Month YYYY');
        
        -- Vérifier si le paiement existe déjà
        SELECT EXISTS(
            SELECT 1 FROM payments 
            WHERE contract_id = contract_record.id 
            AND month = month_name
        ) INTO payment_exists;
        
        -- Créer le paiement si nécessaire
        IF NOT payment_exists THEN
            INSERT INTO payments (
                contract_id,
                month,
                amount,
                due_date,
                status
            ) VALUES (
                contract_record.id,
                month_name,
                contract_record.monthly_rent + COALESCE(contract_record.charges, 0),
                due_date,
                'pending'
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONFIGURATION STORAGE
-- ============================================================================

-- Bucket pour les photos de propriétés
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour les documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Politiques de stockage
DO $$
BEGIN
    -- Photos publiques
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read property photos'
    ) THEN
        CREATE POLICY "Public read property photos" ON storage.objects
        FOR SELECT USING (bucket_id = 'property-photos');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated upload property photos'
    ) THEN
        CREATE POLICY "Authenticated upload property photos" ON storage.objects
        FOR INSERT TO authenticated WITH CHECK (bucket_id = 'property-photos');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated delete property photos'
    ) THEN
        CREATE POLICY "Authenticated delete property photos" ON storage.objects
        FOR DELETE TO authenticated USING (bucket_id = 'property-photos');
    END IF;

    -- Documents privés
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated manage documents'
    ) THEN
        CREATE POLICY "Authenticated manage documents" ON storage.objects
        FOR ALL TO authenticated USING (bucket_id = 'documents');
    END IF;
END $$;

-- ============================================================================
-- DONNÉES INITIALES (OPTIONNEL)
-- ============================================================================

-- Insertion de données de test (décommenter si nécessaire)
/*
INSERT INTO properties (title, description, address, city, postal_code, surface, rooms, price, type) VALUES
('Appartement 3 pièces', 'Bel appartement lumineux au centre ville', '123 Rue de la Paix', 'Paris', '75001', 75.5, 3, 1200, 'apartment'),
('Maison individuelle', 'Maison avec jardin et garage', '45 Avenue des Chênes', 'Lyon', '69001', 120, 5, 1800, 'house');
*/

COMMIT;
