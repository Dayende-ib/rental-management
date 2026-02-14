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
        const isManager = req.user?.role === 'manager';
        let tenantIdsForManager = null;
        const pagination = parsePagination(req.query);
        const { sortBy, sortOrder } = parseSort(
            req.query,
            ['created_at', 'updated_at', 'full_name', 'email'],
            'created_at'
        );

        if (isManager) {
            const { data: contractsByLandlord, error: contractsByLandlordError } = await userClient
                .from('contracts')
                .select('tenant_id')
                .eq('landlord_id', req.user.id)
                .not('tenant_id', 'is', null);
            if (contractsByLandlordError) throw contractsByLandlordError;

            const { data: managerProperties, error: managerPropertiesError } = await userClient
                .from('properties')
                .select('id')
                .eq('owner_id', req.user.id);
            if (managerPropertiesError) throw managerPropertiesError;

            const propertyIds = (managerProperties || [])
                .map((p) => String(p.id || '').trim())
                .filter(Boolean);

            let contractsByProperty = [];
            if (propertyIds.length) {
                const result = await userClient
                    .from('contracts')
                    .select('tenant_id')
                    .in('property_id', propertyIds)
                    .not('tenant_id', 'is', null);
                if (result.error) throw result.error;
                contractsByProperty = result.data || [];
            }

            tenantIdsForManager = Array.from(
                new Set(
                    [...(contractsByLandlord || []), ...contractsByProperty]
                        .map((c) => String(c.tenant_id || '').trim())
                        .filter(Boolean)
                )
            );

            if (!tenantIdsForManager.length) {
                return res.status(200).json(buildListResponse([], pagination, 0));
            }
        }

        let query = userClient
            .from('tenants')
            .select('*')
            .order(sortBy, { ascending: sortOrder === 'asc' });

        if (isManager) {
            query = query.in('id', tenantIdsForManager);
        }

        if (pagination.enabled) {
            query = query.range(pagination.from, pagination.to);
        }

        const { data, error } = await query;
        if (error) throw error;

        let total = null;
        if (pagination.enabled) {
            let countQuery = userClient
                .from('tenants')
                .select('*', { count: 'exact', head: true });
            if (isManager) {
                countQuery = countQuery.in('id', tenantIdsForManager);
            }
            const { count, error: countError } = await countQuery;
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
        const isManager = req.user?.role === 'manager';
        let query = userClient
            .from('tenants')
            .select('*')
            .eq('id', id);

        if (isManager) {
            query = query.eq('owner_id', req.user.id);
        }

        const { data, error } = await query.maybeSingle();

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
        const isAdmin = req.user?.role === 'admin';
        const isManager = req.user?.role === 'manager';
        const payload = {
            ...req.body,
            owner_id: isAdmin ? (req.body?.owner_id || req.user.id) : req.user.id,
        };

        if (!isAdmin && !isManager) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { data, error } = await userClient
            .from('tenants')
            .insert([payload])
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
        const isAdmin = req.user?.role === 'admin';
        const isManager = req.user?.role === 'manager';

        if (!isAdmin && !isManager) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const payload = { ...req.body };
        if (isManager) {
            delete payload.owner_id;
        }

        let query = userClient
            .from('tenants')
            .update(payload)
            .eq('id', id);

        if (isManager) {
            query = query.eq('owner_id', req.user.id);
        }

        const { data, error } = await query.select();

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
        const isAdmin = req.user?.role === 'admin';
        const isManager = req.user?.role === 'manager';

        if (!isAdmin && !isManager) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        let query = userClient
            .from('tenants')
            .delete()
            .eq('id', id);

        if (isManager) {
            query = query.eq('owner_id', req.user.id);
        }

        const { error } = await query;

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
