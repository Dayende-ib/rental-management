const supabase = require('../config/supabase');

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        req.user = user;
        try {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();
            if (!profileError && profile && profile.role) {
                req.userRole = profile.role;
            }
        } catch (profileErr) {
            // ignore profile lookup failures
        }
        if (!req.userRole) req.userRole = 'staff';
        req.token = token;
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = authMiddleware;
