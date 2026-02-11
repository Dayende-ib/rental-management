const normalizeEmail = (value) =>
    String(value || '')
        .trim()
        .toLowerCase();

const resolveTenant = async (userClient, user) => {
    if (!user || !user.id) return null;
    const normalizedEmail = normalizeEmail(user.email);

    const { data, error } = await userClient
        .from('tenants')
        .select('id, user_id, email')
        .eq('user_id', user.id)
        .maybeSingle();

    if (error) throw error;
    if (data) return data;

    if (normalizedEmail) {
        const byEmail = await userClient
            .from('tenants')
            .select('id, user_id, email')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (byEmail.error) throw byEmail.error;
        if (byEmail.data) return byEmail.data;
    }

    return null;
};

const resolveOrCreateTenant = async (userClient, user) => {
    const existing = await resolveTenant(userClient, user);
    if (existing) {
        if (!existing.user_id && user?.id) {
            // Try to attach legacy tenant rows by email to current auth user.
            await userClient
                .from('tenants')
                .update({ user_id: user.id })
                .eq('id', existing.id)
                .eq('email', normalizeEmail(user.email || existing.email));
            return {
                ...existing,
                user_id: user.id,
            };
        }
        return existing;
    }

    if (!user?.id || !user?.email) return null;

    const normalizedEmail = normalizeEmail(user.email);

    const { data: profile } = await userClient
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle();

    const payload = {
        user_id: user.id,
        email: normalizedEmail,
        full_name: String(profile?.full_name || 'Tenant').trim() || 'Tenant',
        phone: profile?.phone || null,
    };

    const { data: inserted, error: insertError } = await userClient
        .from('tenants')
        .insert([payload])
        .select('id, user_id, email')
        .maybeSingle();

    if (!insertError && inserted) {
        return inserted;
    }

    // Conflict/parallel request: try resolving again.
    return resolveTenant(userClient, user);
};

module.exports = {
    resolveTenant,
    resolveOrCreateTenant,
};
