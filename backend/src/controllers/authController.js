const supabase = require('../config/supabase');

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
 *           enum: [admin, manager, staff]
 */

const register = async (req, res, next) => {
    try {
        const { email, password, full_name, role } = req.body;
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }
        if (!password || String(password).length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        if (!full_name || String(full_name).trim().length < 3) {
            return res.status(400).json({ error: 'Full name is required' });
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
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: authData.user.id,
                        full_name,
                        role: role || 'staff',
                    }
                ]);

            if (profileError) throw profileError;
        }

        res.status(201).json({
            message: 'User registered successfully',
            user: authData.user,
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
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', req.user.id)
            .single();

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update(req.body)
            .eq('id', req.user.id)
            .select();

        if (error) throw error;
        res.status(200).json(data[0]);
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
