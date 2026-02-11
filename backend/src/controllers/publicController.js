const supabase = require('../config/supabase');

const getAvailableProperties = async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('status', 'available')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data || []);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAvailableProperties,
};
