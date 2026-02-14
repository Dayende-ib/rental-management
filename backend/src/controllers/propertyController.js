const supabase = require('../config/supabase');
const supabaseAdmin = require('../config/supabaseAdmin');
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

        const includeUnavailableForTenant =
            req.user?.role === 'tenant' &&
            ['1', 'true', 'yes'].includes(String(req.query?.include_unavailable || '').toLowerCase());

        const applyFilters = (query) => {
            let next = query;
            if (isTenantMineScope) {
                if (!tenantMinePropertyIds.length) {
                    // Force empty result set when tenant has no active/pending contracts.
                    next = next.eq('id', '00000000-0000-0000-0000-000000000000');
                } else {
                    next = next.in('id', tenantMinePropertyIds);
                }
            } else if (!isBackoffice && !includeUnavailableForTenant) {
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

        const normalized = await markPropertiesWithActiveContract(
            userClient,
            data || [],
            req.user?.role
        );
        res.status(200).json(buildListResponse(normalized, pagination, total));
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

        const includeUnavailableForTenant =
            req.user?.role === 'tenant' &&
            ['1', 'true', 'yes'].includes(String(req.query?.include_unavailable || '').toLowerCase());
        if (!isBackoffice && !includeUnavailableForTenant) {
            query = query.eq('status', 'available');
        }
        if (isManager) {
            query = query.eq('owner_id', req.user.id);
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Property not found' });
        const [normalized] = await markPropertiesWithActiveContract(
            userClient,
            [data],
            req.user?.role
        );
        res.status(200).json(normalized || data);
    } catch (err) {
        next(err);
    }
};

const createProperty = async (req, res, next) => {
    try {
        const userClient = createUserClient(req.token);
        const isManager = req.user?.role === 'manager';

        if (!isManager) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const payload = {
            ...req.body,
            owner_id: req.user.id,
        };

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
        const isManager = req.user?.role === 'manager';
        if (!isManager) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const payload = { ...req.body };
        delete payload.owner_id;

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
        const isManager = req.user?.role === 'manager';
        if (!isManager) {
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

const uploadPropertyContractTemplate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const file = req.file;
        const userClient = createUserClient(req.token);
        const isManager = req.user?.role === 'manager';

        if (!file) return res.status(400).json({ error: 'Missing file upload' });
        if (!isManager) return res.status(403).json({ error: 'Forbidden' });

        let propertyQuery = userClient
            .from('properties')
            .select('id, owner_id')
            .eq('id', id);
        if (isManager) {
            propertyQuery = propertyQuery.eq('owner_id', req.user.id);
        }
        const { data: property, error: propertyError } = await propertyQuery.maybeSingle();
        if (propertyError) throw propertyError;
        if (!property) return res.status(404).json({ error: 'Property not found' });

        const buffer = file.buffer;
        const timestamp = Date.now();
        const path = `properties/${id}/contract_template_${timestamp}.pdf`;
        const bucket = 'documents';

        const { error: uploadError } = await userClient.storage
            .from(bucket)
            .upload(path, buffer, { contentType: file.mimetype, upsert: true });
        if (uploadError) throw uploadError;

        const payload = {
            entity_type: 'property',
            entity_id: id,
            document_type: 'lease_agreement',
            file_name: file.originalname,
            file_url: path,
            mime_type: file.mimetype,
            file_size: file.size,
            uploaded_by: req.user?.id || null,
        };

        const { data, error } = await userClient
            .from('documents')
            .insert([payload])
            .select()
            .maybeSingle();
        if (error) throw error;

        return res.status(201).json(data);
    } catch (err) {
        next(err);
    }
};

const getPropertyContractTemplate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userClient = createUserClient(req.token);
        const { data: row, error } = await userClient
            .from('documents')
            .select('id, file_url, file_name, mime_type, created_at')
            .eq('entity_type', 'property')
            .eq('entity_id', id)
            .eq('document_type', 'lease_agreement')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        let fileUrl = row?.file_url || null;
        let fileName = row?.file_name || 'contract.pdf';

        // Fallback 1: signed document saved directly on a property's latest contract.
        if (!fileUrl) {
            const { data: contracts, error: contractsError } = await userClient
                .from('contracts')
                .select('id, status, contract_document_url, created_at')
                .eq('property_id', id)
                .order('created_at', { ascending: false })
                .limit(50);
            if (contractsError) throw contractsError;

            const latestWithDoc = (contracts || []).find((c) => String(c?.contract_document_url || '').trim() !== '');
            if (latestWithDoc?.contract_document_url) {
                fileUrl = latestWithDoc.contract_document_url;
                fileName = `contract_${latestWithDoc.id}.pdf`;
            }

            // Fallback 2: signed document saved in documents table at contract level.
            if (!fileUrl) {
                const contractIds = (contracts || [])
                    .map((c) => String(c.id || '').trim())
                    .filter(Boolean);

                if (contractIds.length) {
                    const { data: contractDoc, error: contractDocError } = await userClient
                        .from('documents')
                        .select('id, file_url, file_name, mime_type, document_type, created_at')
                        .eq('entity_type', 'contract')
                        .in('entity_id', contractIds)
                        .order('created_at', { ascending: false })
                        .limit(50);
                    if (contractDocError) throw contractDocError;

                    const preferred = (contractDoc || []).find((d) => {
                        const docType = String(d?.document_type || '').toLowerCase();
                        const mimeType = String(d?.mime_type || '').toLowerCase();
                        const url = String(d?.file_url || '').toLowerCase();
                        return docType === 'lease_agreement'
                            || mimeType === 'application/pdf'
                            || url.endsWith('.pdf');
                    });

                    const firstDoc = preferred || (contractDoc || [])[0];
                    if (firstDoc?.file_url) {
                        fileUrl = firstDoc.file_url;
                        fileName = firstDoc.file_name || 'contract.pdf';
                    }
                }
            }
        }

        if (!fileUrl) {
            return res.status(404).json({ error: 'Contract template not found for this property' });
        }

        if (String(fileUrl || '').startsWith('http')) {
            return res.status(200).json({
                file_name: fileName,
                download_url: fileUrl,
            });
        }

        let signedData = null;
        const userSign = await userClient.storage.from('documents').createSignedUrl(fileUrl, 60 * 30);
        if (!userSign.error) {
            signedData = userSign.data;
        } else {
            const adminSign = await supabaseAdmin.storage.from('documents').createSignedUrl(fileUrl, 60 * 30);
            if (adminSign.error) throw adminSign.error;
            signedData = adminSign.data;
        }

        return res.status(200).json({
            file_name: fileName,
            download_url: signedData?.signedUrl || null,
        });
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
    uploadPropertyContractTemplate,
    getPropertyContractTemplate,
};

async function markPropertiesWithActiveContract(userClient, properties, viewerRole) {
    const rows = Array.isArray(properties) ? properties : [];
    if (!rows.length) return rows;

    const ids = Array.from(new Set(rows.map((p) => String(p?.id || '')).filter(Boolean)));
    if (!ids.length) return rows;

    const openStatuses = ['draft', 'pending', 'active', 'submitted', 'awaiting_approval', 'under_review', 'signed', 'requested'];

    let contracts = null;
    let error = null;

    // Tenant/guest views must use global occupancy; user-scoped RLS can hide
    // other tenants' contracts and make an occupied property appear available.
    const preferAdmin = ['tenant', 'guest'].includes(String(viewerRole || '').toLowerCase());
    const firstClient = preferAdmin ? supabaseAdmin : userClient;
    const secondClient = preferAdmin ? userClient : supabaseAdmin;

    const firstResult = await firstClient
        .from('contracts')
        .select('property_id, status')
        .in('property_id', ids)
        .in('status', openStatuses);
    contracts = firstResult.data;
    error = firstResult.error;

    if (error) {
        const secondResult = await secondClient
            .from('contracts')
            .select('property_id, status')
            .in('property_id', ids)
            .in('status', openStatuses);
        contracts = secondResult.data;
        error = secondResult.error;
    }

    if (error) throw error;

    const activeIds = new Set((contracts || []).map((c) => String(c?.property_id || '')).filter(Boolean));
    return rows.map((row) => {
        if (!row || !activeIds.has(String(row.id || ''))) {
            const normalizedStatus = String(row?.status || '').toLowerCase();
            const nextStatus = normalizedStatus === 'rented' ? 'available' : row?.status;
            return {
                ...row,
                status: nextStatus,
                has_active_contract: false,
                has_open_contract: false,
                is_contractable: nextStatus === 'available',
            };
        }
        return {
            ...row,
            status: 'rented',
            has_active_contract: true,
            has_open_contract: true,
            is_contractable: false,
        };
    });
}
