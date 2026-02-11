const supabase = require('../config/supabase');
const createUserClient = require('../config/supabaseUser');

const getUsers = async (req, res, next) => {
    try {
        if (req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const client = createUserClient(req.token);
        const { data, error } = await client
            .from('profiles')
            .select('id, full_name, role, phone, avatar_url, created_at, updated_at')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data || []);
    } catch (err) {
        next(err);
    }
};

const deleteUser = async (req, res, next) => {
    try {
        if (req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const { id } = req.params;
        const client = createUserClient(req.token);
        const { error } = await client
            .from('profiles')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getUsers,
    deleteUser,
};
