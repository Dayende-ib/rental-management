const supabase = require('../config/supabase');
const supabaseAdmin = require('../config/supabaseAdmin');

const authSse = async (req, res, next) => {
    const header = req.headers.authorization;
    const queryToken = String(req.query?.token || '').trim();
    const token = header && header.startsWith('Bearer ')
        ? header.split(' ')[1]
        : queryToken;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role, full_name')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) {
            console.error('AuthSse Profile Error:', profileError);
        }

        req.user = {
            ...user,
            role: profile ? profile.role : 'tenant',
            full_name: profile ? profile.full_name : null,
        };
        req.token = token;
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = authSse;

