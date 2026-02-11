const supabase = require('../config/supabase');
const createUserClient = require('../config/supabaseUser');

/**
 * @swagger
 * components:
 *   schemas:
 *     Profile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         full_name:
 *           type: string
 *         role:
 *           type: string
 *           enum: [admin, manager, tenant]
 */

const register = async (req, res, next) => {
    try {
        const { email, password, full_name, role } = req.body;
        const normalizedEmail = normalizeEmail(email);
        const normalizedFullName = String(full_name || '').trim();
        const normalizedRole = String(role || 'tenant').trim().toLowerCase();

        if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }
        if (!password || String(password).length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        if (!normalizedFullName || normalizedFullName.length < 3) {
            return res.status(400).json({ error: 'Full name is required' });
        }
        // Public self-signup can only create tenant or manager accounts.
        // Admin creation must stay restricted to privileged backend flow.
        if (!['tenant', 'manager'].includes(normalizedRole)) {
            return res.status(400).json({ error: 'Invalid role for public registration' });
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: String(password),
        });

        if (authError) {
            authError.status = authError.status || 400;
            throw authError;
        }

        if (authData.user) {
            // Utiliser le client authentifié pour créer le profil respectant la RLS
            const sessionToken = authData.session?.access_token;
            const userClient = sessionToken ? createUserClient(sessionToken) : supabase;

            const { error: profileError } = await userClient
                .from('profiles')
                .insert([
                    {
                        id: authData.user.id,
                        full_name: normalizedFullName,
                        role: normalizedRole,
                    }
                ]);

            if (profileError) throw profileError;

            // Keep tenant profile row in sync for mobile-only tenant flow.
            if (normalizedRole === 'tenant') {
                // If this fails (RLS/conflict), mobile has fallback to profiles.
                await userClient
                    .from('tenants')
                    .insert([
                        {
                            user_id: authData.user.id,
                            email: normalizedEmail,
                            full_name: normalizedFullName,
                        }
                    ]);
            }
        }

        res.status(201).json({
            message: 'User registered successfully',
            user: authData.user,
            session: authData.session,
        });
    } catch (err) {
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }
        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }
        const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: String(password),
        });

        if (error) {
            error.status = error.status || 401;
            throw error;
        }
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const logout = async (req, res, next) => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
};

const getProfile = async (req, res, next) => {
    try {
        const userClient = createUserClient(req.token);
        const { data, error } = await userClient
            .from('profiles')
            .select('*')
            .eq('id', req.user.id)
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Profile not found' });
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const userClient = createUserClient(req.token);
        const payload = sanitizeProfileUpdate(req.body);
        const { data, error } = await userClient
            .from('profiles')
            .update(payload)
            .eq('id', req.user.id)
            .select();

        if (error) throw error;
        res.status(200).json(data[0]);
    } catch (err) {
        next(err);
    }
};

const refreshSession = async (req, res, next) => {
    try {
        const { refresh_token } = req.body;
        if (!refresh_token) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }

        const { data, error } = await supabase.auth.refreshSession({ refresh_token });

        if (error) {
            error.status = 401;
            throw error;
        }

        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    register,
    login,
    logout,
    getProfile,
    updateProfile,
    refreshSession,
};

function normalizeEmail(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '');
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitizeProfileUpdate(input) {
    const safe = {};
    const allowed = ['full_name', 'phone', 'avatar_url', 'preferred_language', 'theme'];

    for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(input || {}, key)) {
            safe[key] = input[key];
        }
    }

    return safe;
}

