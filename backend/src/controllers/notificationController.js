const createUserClient = require('../config/supabaseUser');

const getNotifications = async (req, res, next) => {
    try {
        const client = createUserClient(req.token);
        const { data, error } = await client
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data || []);
    } catch (err) {
        next(err);
    }
};

const markNotificationRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const client = createUserClient(req.token);
        const { data, error } = await client
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id)
            .select()
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Notification not found' });
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getNotifications,
    markNotificationRead,
};
