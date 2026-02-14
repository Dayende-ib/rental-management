const supabase = require('../config/supabase');
const createUserClient = require('../config/supabaseUser');
const supabaseAdmin = require('../config/supabaseAdmin');
const { resolveTenant, resolveOrCreateTenant } = require('../utils/tenantResolver');
const { parsePagination, parseSort, buildListResponse } = require('../utils/listQuery');

/**
 * @swagger
 * components:
 *   schemas:
 *     Contract:
 *       type: object
 *       required:
 *         - property_id
 *         - tenant_id
 *         - start_date
 *         - monthly_rent
 *       properties:
 *         id:
 *           type: string
 *         property_id:
 *           type: string
 *         tenant_id:
 *           type: string
 *         start_date:
 *           type: string
 *           format: date
 *         end_date:
 *           type: string
 *           format: date
 *         monthly_rent:
 *           type: number
 *         deposit:
 *           type: number
 *         status:
 *           type: string
 *           enum: [active, terminated, expired]
 */

const getContracts = async (req, res, next) => {
    try {
        const userClient = createUserClient(req.token);
        const isAdmin = req.user?.role === 'admin';
        const isManager = req.user?.role === 'manager';
        const isBackoffice = isAdmin || isManager;
        let propertyIdsForManager = null;
        const pagination = parsePagination(req.query);
        const { sortBy, sortOrder } = parseSort(
            req.query,
            ['created_at', 'updated_at', 'start_date', 'status', 'monthly_rent'],
            'created_at'
        );

        let tenantIdForList = null;

        if (isManager) {
            const { data: managerProperties, error: managerPropertiesError } = await userClient
                .from('properties')
                .select('id')
                .eq('owner_id', req.user.id);
            if (managerPropertiesError) throw managerPropertiesError;
            propertyIdsForManager = (managerProperties || [])
                .map((p) => String(p.id || '').trim())
                .filter(Boolean);

            if (!propertyIdsForManager.length) {
                return res.status(200).json(buildListResponse([], pagination, 0));
            }
        }

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
        }

        let query = applyFilters(
            userClient
                .from('contracts')
                .select('*, properties(title, address, city, postal_code), tenants(full_name, email)')
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
                userClient.from('contracts').select('*', { count: 'exact', head: true })
            );
            if (countError) throw countError;
            total = count;
        }

        res.status(200).json(buildListResponse(data || [], pagination, total));
    } catch (err) {
        next(err);
    }
};

const getContractById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userClient = createUserClient(req.token);
        const isAdmin = req.user?.role === 'admin';
        const isManager = req.user?.role === 'manager';
        const isBackoffice = isAdmin || isManager;

        let query = userClient
            .from('contracts')
            .select('*, properties(title, address, city, postal_code), tenants(full_name, email)')
            .eq('id', id);

        if (!isBackoffice) {
            const tenant = await resolveTenant(userClient, req.user);
            if (!tenant) {
                return res.status(404).json({ error: 'Tenant profile not found' });
            }
            query = query.eq('tenant_id', tenant.id);
        }
        let data = null;
        let error = null;
        if (isManager) {
            const result = await query.maybeSingle();
            data = result.data;
            error = result.error;
            if (!error && data && !(await managerOwnsContract(userClient, data, req.user.id))) {
                data = null;
            }
        } else {
            const result = await query.maybeSingle();
            data = result.data;
            error = result.error;
        }

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Contract not found' });
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const createContract = async (req, res, next) => {
    try {
        const { property_id } = req.body;
        const userClient = createUserClient(req.token);
        const isAdmin = req.user?.role === 'admin';
        const isManager = req.user?.role === 'manager';

        if (!isAdmin && !isManager) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // 1. Check if the property is available
        const { data: property, error: propertyError } = await userClient
            .from('properties')
            .select('status')
            .eq('id', property_id)
            .maybeSingle();

        if (propertyError) throw propertyError;
        if (!property) return res.status(404).json({ error: 'Property not found' });

        if (property.status !== 'available') {
            return res.status(400).json({ error: 'This property is not available for rent (Status: ' + property.status + ')' });
        }

        const { data: existingActive, error: existingActiveError } = await userClient
            .from('contracts')
            .select('id')
            .eq('property_id', property_id)
            .eq('status', 'active')
            .maybeSingle();
        if (existingActiveError) throw existingActiveError;
        if (existingActive) {
            return res.status(409).json({ error: 'This property is already rented with an active contract.' });
        }

        // 2. Create the contract
        const payload = {
            ...req.body,
            landlord_id: isAdmin ? (req.body?.landlord_id || req.user.id) : req.user.id,
            status: 'active',
        };

        const { data: contract, error: contractError } = await userClient
            .from('contracts')
            .insert([payload])
            .select();

        if (contractError) throw contractError;

        // 3. Update property status to 'rented'
        const { error: updateError } = await userClient
            .from('properties')
            .update({ status: 'rented' })
            .eq('id', property_id);

        if (updateError) throw updateError;

        res.status(201).json(contract[0]);
    } catch (err) {
        next(err);
    }
};

const updateContract = async (req, res, next) => {
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
            delete payload.landlord_id;
        }

        if (isManager) {
            const { data: existing, error: existingError } = await userClient
                .from('contracts')
                .select('id, property_id, landlord_id')
                .eq('id', id)
                .maybeSingle();
            if (existingError) throw existingError;
            if (!existing || !(await managerOwnsContract(userClient, existing, req.user.id))) {
                return res.status(404).json({ error: 'Contract not found' });
            }
        }

        let query = userClient
            .from('contracts')
            .update(payload)
            .eq('id', id);

        const { data, error } = await query.select();

        if (error) throw error;
        if (!data.length) return res.status(404).json({ error: 'Contract not found' });
        res.status(200).json(data[0]);
    } catch (err) {
        next(err);
    }
};

const deleteContract = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userClient = createUserClient(req.token);
        const isAdmin = req.user?.role === 'admin';
        const isManager = req.user?.role === 'manager';

        if (!isAdmin && !isManager) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // 1. Fetch contract to get property_id
        let fetchQuery = userClient
            .from('contracts')
            .select('id, property_id, landlord_id')
            .eq('id', id);

        const { data: contract, error: fetchError } = await fetchQuery.maybeSingle();

        if (fetchError) throw fetchError;
        if (!contract) return res.status(404).json({ error: 'Contract not found' });
        if (isManager && !(await managerOwnsContract(userClient, contract, req.user.id))) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        // 2. Delete the contract
        let deleteQuery = userClient
            .from('contracts')
            .delete()
            .eq('id', id);

        const { error } = await deleteQuery;

        if (error) throw error;

        // 3. Set property back to 'available' if contract existed
        if (contract) {
            await userClient
                .from('properties')
                .update({ status: 'available' })
                .eq('id', contract.property_id);
        }

        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

const createContractRequest = async (req, res, next) => {
    try {
        const { property_id, start_date, duration_months } = req.body;
        const userClient = createUserClient(req.token);
        const tenant = await resolveOrCreateTenant(userClient, req.user);
        if (!tenant) {
            return res.status(404).json({ error: 'Tenant profile not found. Please complete your profile first.' });
        }

        // 2. Get Property Details
        const { data: property, error: propertyError } = await userClient
            .from('properties')
            .select('price, charges, status, owner_id')
            .eq('id', property_id)
            .maybeSingle();

        if (propertyError) throw propertyError;
        if (!property) return res.status(404).json({ error: 'Property not found' });
        if (property.status !== 'available') return res.status(400).json({ error: 'Property is not available' });

        const { data: existingActive, error: existingActiveError } = await userClient
            .from('contracts')
            .select('id')
            .eq('property_id', property_id)
            .eq('status', 'active')
            .maybeSingle();
        if (existingActiveError) throw existingActiveError;
        if (existingActive) {
            return res.status(409).json({
                error: 'This property is already rented with an active contract.',
            });
        }

        const { data: template } = await userClient
            .from('documents')
            .select('id')
            .eq('entity_type', 'property')
            .eq('entity_id', property_id)
            .eq('document_type', 'lease_agreement')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (!template) {
            return res.status(400).json({
                error: 'Contract template is missing for this property. Please contact the landlord.',
            });
        }

        // 3. Create Draft Contract
        const { data: contract, error: contractError } = await userClient
            .from('contracts')
            .insert([{
                property_id,
                tenant_id: tenant.id,
                start_date: start_date || new Date().toISOString(),
                duration_months: duration_months || 12,
                monthly_rent: property.price,
                charges: property.charges || 0,
                landlord_id: property.owner_id || null,
                status: 'draft',
                signed_by_tenant: false,
                signed_by_landlord: false
            }])
            .select();

        if (contractError) throw contractError;

        res.status(201).json(contract[0]);
    } catch (err) {
        next(err);
    }
};

const uploadSignedContractDocument = async (req, res, next) => {
    try {
        const { id } = req.params;
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'Missing file upload' });

        const userClient = createUserClient(req.token);
        const tenant = await resolveTenant(userClient, req.user);
        if (!tenant) return res.status(404).json({ error: 'Tenant profile not found' });

        const { data: contract, error: contractError } = await userClient
            .from('contracts')
            .select('id, property_id, tenant_id, status')
            .eq('id', id)
            .eq('tenant_id', tenant.id)
            .maybeSingle();
        if (contractError) throw contractError;
        if (!contract) return res.status(404).json({ error: 'Contract not found' });
        if (contract.status !== 'draft') {
            return res.status(400).json({ error: 'Only draft contracts can be submitted' });
        }

        const path = `contracts/${id}/signed_${Date.now()}.pdf`;
        const bucket = 'documents';
        const { error: uploadError } = await userClient.storage
            .from(bucket)
            .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });
        if (uploadError) throw uploadError;

        const { error: documentError } = await userClient
            .from('documents')
            .insert([{
                entity_type: 'contract',
                entity_id: id,
                document_type: 'lease_agreement',
                file_name: file.originalname,
                file_url: path,
                mime_type: file.mimetype,
                file_size: file.size,
                uploaded_by: req.user?.id || null,
            }]);
        if (documentError) throw documentError;

        const { data: updated, error: updateError } = await userClient
            .from('contracts')
            .update({
                contract_document_url: path,
                signed_by_tenant: true,
                status: 'draft',
            })
            .eq('id', id)
            .select()
            .maybeSingle();
        if (updateError) throw updateError;

        return res.status(200).json(updated);
    } catch (err) {
        next(err);
    }
};

const getSignedContractPreview = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userClient = createUserClient(req.token);
        const isAdmin = req.user?.role === 'admin';
        const isManager = req.user?.role === 'manager';
        if (!isAdmin && !isManager) return res.status(403).json({ error: 'Forbidden' });

        const { data: contract, error } = await userClient
            .from('contracts')
            .select('id, property_id, landlord_id, contract_document_url')
            .eq('id', id)
            .maybeSingle();
        if (error) throw error;
        if (!contract) return res.status(404).json({ error: 'Contract not found' });
        if (isManager && !(await managerOwnsContract(userClient, contract, req.user.id))) {
            return res.status(404).json({ error: 'Contract not found' });
        }
        if (!contract.contract_document_url) {
            return res.status(404).json({ error: 'Signed contract document not found' });
        }

        const raw = String(contract.contract_document_url);
        if (raw.startsWith('http')) {
            return res.status(200).json({ preview_url: raw });
        }

        const { data: signedData, error: signedError } = await supabaseAdmin.storage
            .from('documents')
            .createSignedUrl(raw, 60 * 30);
        if (signedError) throw signedError;

        return res.status(200).json({ preview_url: signedData?.signedUrl || null });
    } catch (err) {
        next(err);
    }
};

const approveContractByLandlord = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userClient = createUserClient(req.token);
        const isAdmin = req.user?.role === 'admin';
        const isManager = req.user?.role === 'manager';
        if (!isAdmin && !isManager) return res.status(403).json({ error: 'Forbidden' });

        const { data: contract, error: fetchError } = await userClient
            .from('contracts')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (fetchError) throw fetchError;
        if (!contract) return res.status(404).json({ error: 'Contract not found' });
        if (isManager && !(await managerOwnsContract(userClient, contract, req.user.id))) {
            return res.status(404).json({ error: 'Contract not found' });
        }
        if (!contract.contract_document_url) {
            return res.status(400).json({ error: 'Tenant signed document is required before approval' });
        }
        const normalizedStatus = String(contract.status || '').toLowerCase();
        const lockedStatuses = ['active', 'terminated', 'expired', 'cancelled'];
        if (lockedStatuses.includes(normalizedStatus)) {
            return res.status(400).json({ error: 'Only pending contracts can be approved' });
        }

        const { data: existingActive, error: activeCheckError } = await userClient
            .from('contracts')
            .select('id')
            .eq('property_id', contract.property_id)
            .eq('status', 'active')
            .neq('id', id)
            .maybeSingle();
        if (activeCheckError) throw activeCheckError;
        if (existingActive) {
            return res.status(409).json({ error: 'This property is already rented with an active contract.' });
        }

        const now = new Date();
        const durationRaw = Number(req.body?.duration_months ?? contract.duration_months ?? 12);
        const durationMonths = Number.isFinite(durationRaw) ? Math.floor(durationRaw) : 0;
        if (durationMonths < 1 || durationMonths > 60) {
            return res.status(400).json({ error: 'duration_months must be between 1 and 60' });
        }
        const startDate = normalizeUtcDate(now);
        const endDate = addMonthsMinusOneDayUtc(startDate, durationMonths);

        const { data: updated, error: updateError } = await userClient
            .from('contracts')
            .update({
                status: 'active',
                duration_months: durationMonths,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                signed_by_tenant: true,
                signed_by_landlord: true,
                signed_at: now.toISOString(),
            })
            .eq('id', id)
            .select()
            .maybeSingle();
        if (updateError) throw updateError;

        await syncPropertyStatusOrThrow(userClient, contract.property_id, 'rented');

        await createInitialPaymentForContract(userClient, updated || contract);

        return res.status(200).json(updated || {});
    } catch (err) {
        next(err);
    }
};

const acceptContract = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userClient = createUserClient(req.token);
        const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
        const isBackoffice = ['admin', 'manager'].includes(req.user?.role);
        const tenant = isBackoffice ? null : await resolveTenant(userClient, req.user);

        if (!isBackoffice && !tenant) {
            return res.status(404).json({ error: 'Tenant profile not found' });
        }

        // 1. Get Contract
        let contractQuery = userClient
            .from('contracts')
            .select('*')
            .eq('id', id);

        if (!isBackoffice) {
            contractQuery = contractQuery.eq('tenant_id', tenant.id);
        }

        const { data: contract, error: fetchError } = await contractQuery.single();

        if (fetchError) throw fetchError;
        if (contract.status !== 'draft') return res.status(400).json({ error: 'Contract is not in draft state' });

        // Safety check to avoid duplicate active contracts for the same property.
        const { data: existingActive, error: activeCheckError } = await userClient
            .from('contracts')
            .select('id')
            .eq('property_id', contract.property_id)
            .eq('status', 'active')
            .neq('id', id)
            .maybeSingle();
        if (activeCheckError) throw activeCheckError;
        if (existingActive) {
            return res.status(409).json({
                error: 'This property is already rented with an active contract.',
            });
        }

        let landlordId = contract.landlord_id || null;
        if (!landlordId) {
            const { data: propertyOwner, error: propertyOwnerError } = await userClient
                .from('properties')
                .select('owner_id')
                .eq('id', contract.property_id)
                .maybeSingle();
            if (propertyOwnerError) throw propertyOwnerError;
            landlordId = propertyOwner?.owner_id || null;
        }

        // 2. Update Contract (Sign & Activate)
        // Rent is due at the beginning of month, with 5 days grace.
        const now = new Date();
        const { data: updatedContract, error: updateError } = await userClient
            .from('contracts')
            .update({
                status: 'active',
                landlord_id: landlordId,
                signed_by_tenant: true,
                signed_by_landlord: true, // Auto-sign for MVP
                signed_at: now.toISOString(),
                start_date: now.toISOString(),
                payment_day: 1,
                grace_period_days: 5
            })
            .eq('id', id)
            .select();

        if (updateError) {
            if (updateError.code === '23505') {
                return res.status(409).json({
                    error: 'This property is already rented with an active contract.',
                });
            }
            throw updateError;
        }

        // 3. Update Property Status
        let propertyUpdate = await userClient
            .from('properties')
            .update({ status: 'rented' })
            .eq('id', contract.property_id);

        if (propertyUpdate.error && (propertyUpdate.error.code === '42501' || propertyUpdate.error.code === '401') && hasServiceRoleKey) {
            propertyUpdate = await supabaseAdmin
                .from('properties')
                .update({ status: 'rented' })
                .eq('id', contract.property_id);
        }
        if (propertyUpdate.error) throw propertyUpdate.error;

        // 4. Create Initial Payment (for next month)
        // Rule: payment should be validated before the 5th of next month.
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const monthName = nextMonthDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
        const formattedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        const dueDate = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), 1);

        const { error: paymentInsertError } = await userClient
            .from('payments')
            .insert([{
                contract_id: id,
                month: formattedMonth,
                amount: contract.monthly_rent + (contract.charges || 0),
                due_date: dueDate.toISOString(),
                status: 'pending',
                late_fee: 0,
                validation_status: 'not_submitted'
            }]);
        if (paymentInsertError) throw paymentInsertError;

        res.status(200).json(updatedContract[0]);
    } catch (err) {
        next(err);
    }
};

const rejectContract = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userClient = createUserClient(req.token);
        const isAdmin = req.user?.role === 'admin';
        const isManager = req.user?.role === 'manager';
        const isBackoffice = isAdmin || isManager;
        const tenant = isBackoffice ? null : await resolveTenant(userClient, req.user);

        if (!isBackoffice && !tenant) {
            return res.status(404).json({ error: 'Tenant profile not found' });
        }

        if (isManager) {
            const { data: existing, error: existingError } = await userClient
                .from('contracts')
                .select('id, property_id, landlord_id')
                .eq('id', id)
                .maybeSingle();
            if (existingError) throw existingError;
            if (!existing || !(await managerOwnsContract(userClient, existing, req.user.id))) {
                return res.status(404).json({ error: 'Contract not found' });
            }
        }

        // Delete the draft contract
        let deleteQuery = userClient
            .from('contracts')
            .delete()
            .eq('id', id)
            .in('status', [
                'draft',
                'pending',
                'signed',
                'requested',
                'submitted',
                'awaiting_approval',
                'under_review',
            ]); // Security check

        if (!isBackoffice) {
            deleteQuery = deleteQuery.eq('tenant_id', tenant.id);
        }

        const { error } = await deleteQuery;

        if (error) throw error;

        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

const terminateContract = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { termination_reason } = req.body || {};
        const userClient = createUserClient(req.token);
        const isAdmin = req.user?.role === 'admin';
        const isManager = req.user?.role === 'manager';

        if (!isAdmin && !isManager) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { data: existing, error: existingError } = await userClient
            .from('contracts')
            .select('id, property_id, status, landlord_id')
            .eq('id', id)
            .maybeSingle();
        if (existingError) throw existingError;
        if (!existing) return res.status(404).json({ error: 'Contract not found' });
        if (isManager && !(await managerOwnsContract(userClient, existing, req.user.id))) {
            return res.status(404).json({ error: 'Contract not found' });
        }
        if (String(existing.status || '').toLowerCase() !== 'active') {
            return res.status(400).json({ error: 'Only active contracts can be terminated' });
        }

        const nowIso = new Date().toISOString();
        const { data: updated, error: updateError } = await userClient
            .from('contracts')
            .update({
                status: 'terminated',
                termination_date: nowIso,
                termination_reason: termination_reason || 'Resiliation manuelle',
            })
            .eq('id', id)
            .select()
            .maybeSingle();
        if (updateError) throw updateError;

        await syncPropertyStatusOrThrow(userClient, existing.property_id, 'available');

        return res.status(200).json(updated || {});
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getContracts,
    getContractById,
    createContract,
    updateContract,
    deleteContract,
    createContractRequest,
    uploadSignedContractDocument,
    getSignedContractPreview,
    approveContractByLandlord,
    acceptContract,
    rejectContract,
    terminateContract,
};

async function managerOwnsContract(userClient, contract, managerId) {
    if (!contract) return false;
    if (contract.landlord_id && contract.landlord_id === managerId) return true;
    if (!contract.property_id) return false;

    let { data: property, error: propertyError } = await userClient
        .from('properties')
        .select('id')
        .eq('id', contract.property_id)
        .eq('owner_id', managerId)
        .maybeSingle();

    const errorCode = String(propertyError?.code || '').toLowerCase();
    const errorMessage = String(propertyError?.message || '').toLowerCase();
    const canFallbackToAdmin =
        Boolean(propertyError) &&
        (
            ['42501', '401'].includes(errorCode) ||
            errorMessage.includes('permission denied')
        );

    if (canFallbackToAdmin) {
        const adminResult = await supabaseAdmin
            .from('properties')
            .select('id')
            .eq('id', contract.property_id)
            .eq('owner_id', managerId)
            .maybeSingle();
        property = adminResult.data;
        propertyError = adminResult.error;
    }

    if (propertyError) throw propertyError;
    return Boolean(property);
}

async function createInitialPaymentForContract(userClient, contract) {
    const now = new Date();
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthName = nextMonthDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    const formattedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const dueDate = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), 1);

    const { data: existing } = await userClient
        .from('payments')
        .select('id')
        .eq('contract_id', contract.id)
        .eq('month', formattedMonth)
        .limit(1);

    if (existing && existing.length) return;

    const { error } = await userClient
        .from('payments')
        .insert([{
            contract_id: contract.id,
            month: formattedMonth,
            amount: Number(contract.monthly_rent || 0) + Number(contract.charges || 0),
            due_date: dueDate.toISOString(),
            status: 'pending',
            late_fee: 0,
            validation_status: 'not_submitted',
        }]);
    if (error) throw error;
}

function isPermissionDeniedError(err) {
    const code = String(err?.code || '').toLowerCase();
    const message = String(err?.message || '').toLowerCase();
    return ['42501', '401'].includes(code) || message.includes('permission denied');
}

async function syncPropertyStatusOrThrow(userClient, propertyId, status) {
    let lastError = null;

    const userUpdate = await userClient
        .from('properties')
        .update({ status })
        .eq('id', propertyId);
    if (!userUpdate.error) return;
    lastError = userUpdate.error;

    const adminUpdate = await supabaseAdmin
        .from('properties')
        .update({ status })
        .eq('id', propertyId);
    if (!adminUpdate.error) return;
    lastError = adminUpdate.error;

    throw lastError;
}

function normalizeUtcDate(date) {
    return new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
    ));
}

function addMonthsMinusOneDayUtc(startDate, months) {
    const exclusive = new Date(Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth() + months,
        startDate.getUTCDate(),
    ));
    return new Date(exclusive.getTime() - 24 * 60 * 60 * 1000);
}


