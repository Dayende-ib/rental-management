const createUserClient = require('../config/supabaseUser');

const listNotifications = async (req, res, next) => {
    try {
        const userClient = createUserClient(req.token);
        const { data, error } = await userClient
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        res.status(200).json(data || []);
    } catch (err) {
        next(err);
    }
};

const markNotificationRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userClient = createUserClient(req.token);
        const { data, error } = await userClient
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id)
            .select();

        if (error) throw error;
        if (!data.length) return res.status(404).json({ error: 'Notification not found' });
        res.status(200).json(data[0]);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    listNotifications,
    markNotificationRead,
};
