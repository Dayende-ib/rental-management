const supabaseAdmin = require('../config/supabaseAdmin');
const createUserClient = require('../config/supabaseUser');

const listUsers = async (req, res, next) => {
    try {
        const userClient = createUserClient(req.token);
        const { data, error } = await userClient
            .from('profiles')
            .select('id, full_name, role, phone, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data || []);
    } catch (err) {
        next(err);
    }
};

const createUser = async (req, res, next) => {
    try {
        const { email, password, full_name, role } = req.body || {};

        if (!email || !password || !full_name) {
            return res.status(400).json({ error: 'email, password and full_name are required' });
        }
        if (!['admin', 'manager', 'tenant'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required for user creation' });
        }

        const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: String(email).trim().toLowerCase(),
            password: String(password),
            email_confirm: true,
        });

        if (createError) throw createError;

        const userId = created?.user?.id;
        if (!userId) {
            return res.status(500).json({ error: 'Failed to create auth user' });
        }

        const userClient = createUserClient(req.token);
        const { error: profileError } = await userClient
            .from('profiles')
            .insert([{
                id: userId,
                full_name,
                role,
            }]);

        if (profileError) throw profileError;

        res.status(201).json({ id: userId, full_name, role });
    } catch (err) {
        next(err);
    }
};

const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required for user deletion' });
        }

        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (error) throw error;

        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

module.exports = {
    listUsers,
    createUser,
    deleteUser,
};

