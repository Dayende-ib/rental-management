const supabase = require('../config/supabase');

const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = { role: 'guest' };
        return next();
    }

    const token = authHeader.split(' ')[1];

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            req.user = { role: 'guest' };
            return next();
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) {
            console.error('OptionalAuth Profile Error:', profileError);
        }

        req.user = {
            ...user,
            role: profile ? profile.role : 'tenant'
        };
        req.token = token;
        next();
    } catch (err) {
        // En cas d'erreur de token, on traite comme un invité
        req.user = { role: 'guest' };
        next();
    }
};

module.exports = optionalAuth;
