const supabase = require('../config/supabase');
const createUserClient = require('../config/supabaseUser');
const { resolveTenant } = require('../utils/tenantResolver');
const { parsePagination, parseSort, buildListResponse } = require('../utils/listQuery');

/**
 * @swagger
 * components:
 *   schemas:
 *     MaintenanceRequest:
 *       type: object
 *       required:
 *         - property_id
 *         - description
 *       properties:
 *         id:
 *           type: string
 *         property_id:
 *           type: string
 *         description:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, in_progress, completed, cancelled]
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         request_date:
 *           type: string
 *           format: date-time
 */

const getMaintenanceRequests = async (req, res, next) => {
    try {
        const userClient = createUserClient(req.token);
        const isAdmin = req.user?.role === 'admin';
        const isManager = req.user?.role === 'manager';
        const isBackoffice = isAdmin || isManager;
        const pagination = parsePagination(req.query);
        const { sortBy, sortOrder } = parseSort(
            req.query,
            ['created_at', 'updated_at', 'status', 'urgency'],
            'created_at'
        );
        let tenantIdForList = null;
        let propertyIdsForManager = null;

        const applyFilters = (query) => {
            let next = query;
            if (!isBackoffice) {
                next = next.eq('tenant_id', tenantIdForList);
            }
            if (isManager) {
                next = next.in('property_id', propertyIdsForManager);
            }
            return next;
        };

        if (!isBackoffice) {
            const tenant = await resolveTenant(userClient, req.user);
            if (!tenant) {
                return res.status(404).json({ error: 'Tenant profile not found' });
            }
            tenantIdForList = tenant.id;
        } else if (isManager) {
            const { data: properties, error: propertiesError } = await userClient
                .from('properties')
                .select('id')
                .eq('owner_id', req.user.id);
            if (propertiesError) throw propertiesError;
            propertyIdsForManager = (properties || [])
                .map((p) => String(p.id || '').trim())
                .filter(Boolean);
            if (!propertyIdsForManager.length) {
                return res.status(200).json(buildListResponse([], pagination, 0));
            }
        }

        let query = applyFilters(
            userClient
                .from('maintenance_requests')
                .select('*, properties(title, address), tenants(full_name, email)')
                .order(sortBy, { ascending: sortOrder === 'asc' })
        );

        if (pagination.enabled) {
            query = query.range(pagination.from, pagination.to);
        }

        const { data, error } = await query;

        if (error) throw error;
        let total = null;
        if (pagination.enabled) {
            const { count, error: countError } = await applyFilters(
                userClient.from('maintenance_requests').select('*', { count: 'exact', head: true })
            );
            if (countError) throw countError;
            total = count;
        }

        res.status(200).json(buildListResponse(data || [], pagination, total));
    } catch (err) {
        next(err);
    }
};

const createMaintenanceRequest = async (req, res, next) => {
    try {
        const userClient = createUserClient(req.token);
        const isAdmin = req.user?.role === 'admin';
        const isManager = req.user?.role === 'manager';
        const isBackoffice = isAdmin || isManager;
        let payload = req.body || {};

        if (!isBackoffice) {
            const tenant = await resolveTenant(userClient, req.user);
            if (!tenant) {
                return res.status(404).json({ error: 'Tenant profile not found' });
            }

            payload = {
                property_id: payload.property_id,
                tenant_id: tenant.id,
                reported_by: req.user.id,
                title: String(payload.title || payload.description || 'Maintenance request').slice(0, 120),
                description: payload.description,
                urgency: payload.urgency || 'medium',
                category: payload.category || 'other',
                status: 'reported',
                photos: Array.isArray(payload.photos) ? payload.photos : [],
            };
        } else {
            if (isManager) {
                const { data: property, error: propertyError } = await userClient
                    .from('properties')
                    .select('id, owner_id')
                    .eq('id', payload.property_id)
                    .maybeSingle();
                if (propertyError) throw propertyError;
                if (!property || property.owner_id !== req.user.id) {
                    return res.status(403).json({ error: 'Forbidden' });
                }
            }
            payload = {
                ...payload,
                title: String(payload.title || payload.description || 'Maintenance request').slice(0, 120),
            };
        }

        const { data, error } = await userClient
            .from('maintenance_requests')
            .insert([payload])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        next(err);
    }
};

const updateMaintenanceRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userClient = createUserClient(req.token);
        const isAdmin = req.user?.role === 'admin';
        const isManager = req.user?.role === 'manager';
        const isBackoffice = isAdmin || isManager;

        let payload = req.body || {};

        if (!isBackoffice) {
            const tenant = await resolveTenant(userClient, req.user);
            if (!tenant) {
                return res.status(404).json({ error: 'Tenant profile not found' });
            }

            if (payload.status && payload.status !== 'cancelled') {
                return res.status(403).json({ error: 'Tenants can only cancel their own requests' });
            }

            const { data: ownReq, error: ownReqError } = await userClient
                .from('maintenance_requests')
                .select('id, tenant_id')
                .eq('id', id)
                .eq('tenant_id', tenant.id)
                .maybeSingle();

            if (ownReqError) throw ownReqError;
            if (!ownReq) return res.status(404).json({ error: 'Maintenance request not found' });

            payload = {
                status: payload.status || 'cancelled',
                notes: payload.notes,
            };
        } else if (isManager) {
            const { data: ownReq, error: ownReqError } = await userClient
                .from('maintenance_requests')
                .select('id, property_id')
                .eq('id', id)
                .maybeSingle();
            if (ownReqError) throw ownReqError;
            if (!ownReq) return res.status(404).json({ error: 'Maintenance request not found' });

            const { data: property, error: propertyError } = await userClient
                .from('properties')
                .select('id, owner_id')
                .eq('id', ownReq.property_id)
                .maybeSingle();
            if (propertyError) throw propertyError;
            if (!property || property.owner_id !== req.user.id) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }

        const { data, error } = await userClient
            .from('maintenance_requests')
            .update(payload)
            .eq('id', id)
            .select();

        if (error) throw error;
        if (!data.length) return res.status(404).json({ error: 'Maintenance request not found' });
        res.status(200).json(data[0]);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getMaintenanceRequests,
    createMaintenanceRequest,
    updateMaintenanceRequest,
};


