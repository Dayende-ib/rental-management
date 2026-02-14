const supabase = require('../config/supabase');
const supabaseAdmin = require('../config/supabaseAdmin');

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
        const normalizedRole = normalizeRole(role);

        if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }
        if (!password || String(password).length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        if (!normalizedFullName || normalizedFullName.length < 3) {
            return res.status(400).json({ error: 'Full name is required' });
        }
        // Backend1-style behavior: no public role restriction here.

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: String(password),
        });

        if (authError) {
            const authMessage = String(authError.message || '').toLowerCase();
            const alreadyRegistered =
                authMessage.includes('already registered') ||
                authMessage.includes('already exists') ||
                authMessage.includes('user already');

            if (alreadyRegistered) {
                const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                    email: normalizedEmail,
                    password: String(password),
                });
                if (!loginError && loginData?.session) {
                    if (loginData?.user?.id) {
                        const { error: ensureProfileError } = await supabaseAdmin
                            .from('profiles')
                            .upsert([
                                {
                                    id: loginData.user.id,
                                    full_name: normalizedFullName,
                                    role: normalizedRole,
                                }
                            ], { onConflict: 'id' });
                        if (ensureProfileError) throw ensureProfileError;

                        if (normalizedRole === 'tenant') {
                            await supabaseAdmin
                                .from('tenants')
                                .upsert([
                                    {
                                        user_id: loginData.user.id,
                                        email: normalizedEmail,
                                        full_name: normalizedFullName,
                                    }
                                ], { onConflict: 'user_id' });
                        }
                    }
                    return res.status(200).json({
                        message: 'User already registered. Logged in successfully.',
                        user: loginData.user,
                        session: loginData.session,
                    });
                }
                authError.status = 409;
                authError.message = 'User already registered. Please login or use another email.';
                throw authError;
            }
            authError.status = authError.status || 400;
            throw authError;
        }

        if (authData.user) {
            // Utiliser le client authentifié pour créer le profil respectant la RLS
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .upsert([
                    {
                        id: authData.user.id,
                        full_name: normalizedFullName,
                        role: normalizedRole,
                    }
                ], { onConflict: 'id' });

            if (profileError) throw profileError;

            // Keep tenant profile row in sync for mobile-only tenant flow.
            if (normalizedRole === 'tenant') {
                // If this fails (RLS/conflict), mobile has fallback to profiles.
                await supabaseAdmin
                    .from('tenants')
                    .upsert([
                        {
                            user_id: authData.user.id,
                            email: normalizedEmail,
                            full_name: normalizedFullName,
                        }
                    ], { onConflict: 'user_id' });
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
        const { data, error } = await supabaseAdmin
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
        const payload = sanitizeProfileUpdate(req.body);
        const { data, error } = await supabaseAdmin
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

function normalizeRole(value) {
    const raw = String(value || 'tenant').trim().toLowerCase();
    if (['admin', 'administrateur'].includes(raw)) return 'admin';
    if (['manager', 'gestionnaire', 'bailleur'].includes(raw)) return 'manager';
    if (['tenant', 'locataire'].includes(raw)) return 'tenant';
    return raw;
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

