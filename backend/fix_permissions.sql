-- ============================================================================
-- SCRIPT DE RÉPARATION DES DROITS D'ACCÈS (GRANTS)
-- ============================================================================
-- Ce script donne explicitement les droits d'accès aux rôles 'anon' et 'authenticated'
-- Cela est nécessaire en plus des politiques RLS (Row Level Security).

-- 1. Accès au schéma 'public'
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Accès à TOUTES les tables actuelles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- 3. Accès aux tables spécifiques (pour être sûr)
GRANT ALL ON TABLE profiles TO anon, authenticated;
GRANT ALL ON TABLE properties TO anon, authenticated;
GRANT ALL ON TABLE tenants TO anon, authenticated;
GRANT ALL ON TABLE contracts TO anon, authenticated;
GRANT ALL ON TABLE payments TO anon, authenticated;
GRANT ALL ON TABLE maintenance_requests TO anon, authenticated;
GRANT ALL ON TABLE notifications TO anon, authenticated;
GRANT ALL ON TABLE documents TO anon, authenticated;

-- 4. Accès au stockage (Storage)
GRANT ALL ON SCHEMA storage TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated;

-- Note : RLS continuera de filtrer qui peut voir/modifier quoi, 
-- mais ces commandes GRANT permettent au moins d'essayer d'accéder aux tables.
