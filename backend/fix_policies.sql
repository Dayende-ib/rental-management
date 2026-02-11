-- ============================================================================
-- SCRIPT DE RÉPARATION DES PERMISSIONS (RLS)
-- À exécuter dans l'éditeur SQL de Supabase (Table Editor > SQL Editor)
-- ============================================================================

-- 1. Réinitialiser les politiques sur 'profiles'
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles 
FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles 
FOR UPDATE USING (auth.uid() = id);


-- 2. Réinitialiser les politiques sur 'properties'
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Properties are viewable by everyone" ON properties;
CREATE POLICY "Properties are viewable by everyone" ON properties 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Properties are manageable by authenticated users" ON properties;
CREATE POLICY "Properties are manageable by authenticated users" ON properties 
FOR ALL TO authenticated USING (auth.role() = 'authenticated');


-- 3. Réinitialiser les politiques sur 'tenants'
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants are viewable by authenticated users" ON tenants;
CREATE POLICY "Tenants are viewable by authenticated users" ON tenants 
FOR SELECT TO authenticated USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Tenants are manageable by authenticated users" ON tenants;
CREATE POLICY "Tenants are manageable by authenticated users" ON tenants 
FOR ALL TO authenticated USING (auth.role() = 'authenticated');


-- 4. Réinitialiser les politiques sur 'contracts'
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contracts are viewable by authenticated users" ON contracts;
CREATE POLICY "Contracts are viewable by authenticated users" ON contracts 
FOR SELECT TO authenticated USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Contracts are manageable by authenticated users" ON contracts;
CREATE POLICY "Contracts are manageable by authenticated users" ON contracts 
FOR ALL TO authenticated USING (auth.role() = 'authenticated');


-- 5. Réinitialiser les politiques sur 'payments'
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Payments are viewable by authenticated users" ON payments;
CREATE POLICY "Payments are viewable by authenticated users" ON payments 
FOR SELECT TO authenticated USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Payments are manageable by authenticated users" ON payments;
CREATE POLICY "Payments are manageable by authenticated users" ON payments 
FOR ALL TO authenticated USING (auth.role() = 'authenticated');


-- 6. Réinitialiser les politiques sur 'maintenance_requests'
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Maintenance requests are viewable by authenticated users" ON maintenance_requests;
CREATE POLICY "Maintenance requests are viewable by authenticated users" ON maintenance_requests 
FOR SELECT TO authenticated USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Maintenance requests are manageable by authenticated users" ON maintenance_requests;
CREATE POLICY "Maintenance requests are manageable by authenticated users" ON maintenance_requests 
FOR ALL TO authenticated USING (auth.role() = 'authenticated');


-- 7. Réinitialiser les politiques sur 'notifications'
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications 
FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications 
FOR INSERT WITH CHECK (true);


-- 8. Réinitialiser les politiques sur 'documents'
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Documents are viewable by authenticated users" ON documents;
CREATE POLICY "Documents are viewable by authenticated users" ON documents 
FOR SELECT TO authenticated USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Documents are manageable by authenticated users" ON documents;
CREATE POLICY "Documents are manageable by authenticated users" ON documents 
FOR ALL TO authenticated USING (auth.role() = 'authenticated');
