const supabase = require('../config/supabase');
const createUserClient = require('../config/supabaseUser');
const { parsePagination, parseSort, buildListResponse } = require('../utils/listQuery');
const { resolveTenant } = require('../utils/tenantResolver');

/**
 * @swagger
 * components:
 *   schemas:
 *     Property:
 *       type: object
 *       required:
 *         - title
 *         - address
 *         - price
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the property
 *         title:
 *           type: string
 *           description: The title of the property
 *         description:
 *           type: string
 *           description: Detailed description
 *         address:
 *           type: string
 *           description: Full address
 *         city:
 *           type: string
 *         postal_code:
 *           type: string
 *         surface:
 *           type: number
 *           description: Surface in square meters
 *         rooms:
 *           type: integer
 *         photos:
 *           type: array
 *           items:
 *             type: string
 *         price:
 *           type: number
 *           description: Monthly rent or sale price
 *         type:
 *           type: string
 *           enum: [apartment, house, studio]
 *         status:
 *           type: string
 *           enum: [available, rented, maintenance]
 */

const getProperties = async (req, res, next) => {
    try {
        const userClient = createUserClient(req.token);
        const pagination = parsePagination(req.query);
        const { sortBy, sortOrder } = parseSort(
            req.query,
            ['created_at', 'updated_at', 'price', 'city', 'status', 'title'],
            'created_at'
        );

        const isAdmin = req.user?.role === 'admin';
        const isManager = req.user?.role === 'manager';
        const isBackoffice = isAdmin || isManager;
        const scope = String(req.query?.scope || '').toLowerCase();
        const isTenantMineScope = req.user?.role === 'tenant' && scope === 'mine';
        let tenantMinePropertyIds = [];

        if (isTenantMineScope) {
            const tenant = await resolveTenant(userClient, req.user);
            if (tenant) {
                const { data: contracts, error: contractsError } = await userClient
                    .from('contracts')
                    .select('property_id')
                    .eq('tenant_id', tenant.id)
                    .in('status', ['active', 'pending', 'draft', 'signed'])
                    .not('property_id', 'is', null);

                if (contractsError) throw contractsError;
                tenantMinePropertyIds = Array.from(
                    new Set((contracts || []).map((c) => String(c.property_id || '')).filter(Boolean))
                );
            }
        }

        const applyFilters = (query) => {
            let next = query;
            if (isTenantMineScope) {
                if (!tenantMinePropertyIds.length) {
                    // Force empty result set when tenant has no active/pending contracts.
                    next = next.eq('id', '00000000-0000-0000-0000-000000000000');
                } else {
                    next = next.in('id', tenantMinePropertyIds);
                }
            } else if (!isBackoffice) {
                next = next.eq('status', 'available');
            }
            if (isManager) {
                next = next.eq('owner_id', req.user.id);
            }
            return next;
        };

        let query = applyFilters(
            userClient
                .from('properties')
                .select('*')
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
                userClient.from('properties').select('*', { count: 'exact', head: true })
            );
            if (countError) throw countError;
            total = count;
        }

        res.status(200).json(buildListResponse(data || [], pagination, total));
    } catch (err) {
        next(err);
    }
};

const getPropertyById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userClient = createUserClient(req.token);
        const isAdmin = req.user?.role === 'admin';
        const isManager = req.user?.role === 'manager';
        const isBackoffice = isAdmin || isManager;
        let query = userClient
            .from('properties')
            .select('*')
            .eq('id', id);

        if (!isBackoffice) {
            query = query.eq('status', 'available');
        }
        if (isManager) {
            query = query.eq('owner_id', req.user.id);
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Property not found' });
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const createProperty = async (req, res, next) => {
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
            .from('properties')
            .insert([payload])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        next(err);
    }
};

const updateProperty = async (req, res, next) => {
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
            .from('properties')
            .update(payload)
            .eq('id', id)
            .select();

        if (isManager) {
            query = query.eq('owner_id', req.user.id);
        }

        const { data, error } = await query;

        if (error) throw error;
        if (!data.length) return res.status(404).json({ error: 'Property not found' });
        res.status(200).json(data[0]);
    } catch (err) {
        next(err);
    }
};

const deleteProperty = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userClient = createUserClient(req.token);
        const isAdmin = req.user?.role === 'admin';
        const isManager = req.user?.role === 'manager';
        if (!isAdmin && !isManager) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        let query = userClient
            .from('properties')
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

const uploadPropertyPhoto = async (req, res, next) => {
    try {
        const { id } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'Missing file upload' });
        }
        const mimeType = file.mimetype;

        const userClient = createUserClient(req.token);
        const isAdmin = req.user?.role === 'admin';
        const isManager = req.user?.role === 'manager';
        if (!isAdmin && !isManager) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        let propertyQuery = userClient
            .from('properties')
            .select('id, photos')
            .eq('id', id);

        if (isManager) {
            propertyQuery = propertyQuery.eq('owner_id', req.user.id);
        }

        const { data: property, error: propertyError } = await propertyQuery.maybeSingle();

        if (propertyError) throw propertyError;
        if (!property) return res.status(404).json({ error: 'Property not found' });

        const buffer = file.buffer;
        const ext = (mimeType && mimeType.split('/')[1]) || 'png';
        const timestamp = Date.now();
        const filename = `properties/${id}/photo_${timestamp}.${ext}`;
        const bucket = 'property-photos';

        const { error: uploadError } = await userClient.storage
            .from(bucket)
            .upload(filename, buffer, { contentType: mimeType, upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicData } = userClient.storage.from(bucket).getPublicUrl(filename);
        const publicUrl = publicData && publicData.publicUrl ? publicData.publicUrl : null;

        const existingPhotos = Array.isArray(property.photos) ? property.photos : [];
        const updatedPhotos = publicUrl ? [...existingPhotos, publicUrl] : existingPhotos;

        const { data, error } = await userClient
            .from('properties')
            .update({ photos: updatedPhotos })
            .eq('id', id)
            .select();

        if (error) throw error;
        if (!data.length) return res.status(404).json({ error: 'Property not found' });
        res.status(200).json(data[0]);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
    uploadPropertyPhoto,
};
