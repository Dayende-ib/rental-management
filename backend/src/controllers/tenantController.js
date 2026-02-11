const supabase = require('../config/supabase');
const createUserClient = require('../config/supabaseUser');
const { parsePagination, parseSort, buildListResponse } = require('../utils/listQuery');

/**
 * @swagger
 * components:
 *   schemas:
 *     Tenant:
 *       type: object
 *       required:
 *         - full_name
 *         - email
 *       properties:
 *         id:
 *           type: string
 *         full_name:
 *           type: string
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *         emergency_contact:
 *           type: string
 *         document_id:
 *           type: string
 */

const getTenants = async (req, res, next) => {
    try {
        const userClient = createUserClient(req.token);
        const pagination = parsePagination(req.query);
        const { sortBy, sortOrder } = parseSort(
            req.query,
            ['created_at', 'updated_at', 'full_name', 'email'],
            'created_at'
        );

        let query = userClient
            .from('tenants')
            .select('*')
            .order(sortBy, { ascending: sortOrder === 'asc' });

        if (pagination.enabled) {
            query = query.range(pagination.from, pagination.to);
        }

        const { data, error } = await query;
        if (error) throw error;

        let total = null;
        if (pagination.enabled) {
            const { count, error: countError } = await userClient
                .from('tenants')
                .select('*', { count: 'exact', head: true });
            if (countError) throw countError;
            total = count;
        }

        res.status(200).json(buildListResponse(data || [], pagination, total));
    } catch (err) {
        next(err);
    }
};

const getCurrentTenant = async (req, res, next) => {
    try {
        const userClient = createUserClient(req.token);
        const userId = req.user && req.user.id ? req.user.id : null;
        const email = req.user && req.user.email ? String(req.user.email).trim().toLowerCase() : null;

        let rows = [];
        let error = null;

        if (userId) {
            const result = await userClient
                .from('tenants')
                .select('*')
                .eq('user_id', userId)
                .limit(1);
            rows = result.data || [];
            error = result.error;
        }

        if ((!rows || !rows.length) && email) {
            const result = await userClient
                .from('tenants')
                .select('*')
                .eq('email', email)
                .limit(1);
            rows = result.data || [];
            error = result.error;
        }

        if (error) throw error;

        let tenant = rows && rows.length ? rows[0] : null;

        // Enrich/fallback with profile data so mobile always gets a usable full_name.
        let profile = null;
        if (userId) {
            const profileResult = await userClient
                .from('profiles')
                .select('full_name, phone')
                .eq('id', userId)
                .maybeSingle();
            if (profileResult.error) throw profileResult.error;
            profile = profileResult.data || null;
        }

        if (tenant) {
            const needsName = !String(tenant.full_name || '').trim();
            const needsPhone = !String(tenant.phone || '').trim() && String(profile?.phone || '').trim();
            if ((needsName && String(profile?.full_name || '').trim()) || needsPhone) {
                const patch = {};
                if (needsName && String(profile?.full_name || '').trim()) {
                    patch.full_name = String(profile.full_name).trim();
                    tenant.full_name = patch.full_name;
                }
                if (needsPhone) {
                    patch.phone = String(profile.phone).trim();
                    tenant.phone = patch.phone;
                }
                // Best effort sync, non-blocking for response.
                if (Object.keys(patch).length > 0) {
                    await userClient.from('tenants').update(patch).eq('id', tenant.id);
                }
            }
            return res.status(200).json(tenant);
        }

        // If tenant row doesn't exist yet, return profile-based fallback.
        if (profile) {
            return res.status(200).json({
                id: userId,
                user_id: userId,
                full_name: String(profile.full_name || '').trim(),
                email: email || '',
                phone: String(profile.phone || '').trim(),
            });
        }

        return res.status(404).json({ error: 'Tenant not found' });
    } catch (err) {
        next(err);
    }
};

const getTenantById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userClient = createUserClient(req.token);
        const { data, error } = await userClient
            .from('tenants')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Tenant not found' });
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const createTenant = async (req, res, next) => {
    try {
        const userClient = createUserClient(req.token);
        const { data, error } = await userClient
            .from('tenants')
            .insert([req.body])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        next(err);
    }
};

const updateTenant = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userClient = createUserClient(req.token);
        const { data, error } = await userClient
            .from('tenants')
            .update(req.body)
            .eq('id', id)
            .select();

        if (error) throw error;
        if (!data.length) return res.status(404).json({ error: 'Tenant not found' });
        res.status(200).json(data[0]);
    } catch (err) {
        next(err);
    }
};

const deleteTenant = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userClient = createUserClient(req.token);
        const { error } = await userClient
            .from('tenants')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getTenants,
    getCurrentTenant,
    getTenantById,
    createTenant,
    updateTenant,
    deleteTenant,
};
