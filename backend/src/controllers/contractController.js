const supabase = require('../config/supabase');
const createUserClient = require('../config/supabaseUser');
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
        const isBackoffice = ['admin', 'manager'].includes(req.user?.role);
        const pagination = parsePagination(req.query);
        const { sortBy, sortOrder } = parseSort(
            req.query,
            ['created_at', 'updated_at', 'start_date', 'status', 'monthly_rent'],
            'created_at'
        );

        let tenantIdForList = null;

        const applyFilters = (query) => {
            let next = query;
            if (!isBackoffice) {
                next = next.eq('tenant_id', tenantIdForList);
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
        const isBackoffice = ['admin', 'manager'].includes(req.user?.role);

        let query = userClient
            .from('contracts')
            .select('*, properties(title, address), tenants(full_name, email)')
            .eq('id', id);

        if (!isBackoffice) {
            const tenant = await resolveTenant(userClient, req.user);
            if (!tenant) {
                return res.status(404).json({ error: 'Tenant profile not found' });
            }
            query = query.eq('tenant_id', tenant.id);
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Contract not found' });
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const createContract = async (req, res, next) => {
    try {
        const { property_id, tenant_id } = req.body;
        const userClient = createUserClient(req.token);

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

        // 2. Create the contract
        const { data: contract, error: contractError } = await userClient
            .from('contracts')
            .insert([{ ...req.body, status: 'active' }])
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
        const { data, error } = await userClient
            .from('contracts')
            .update(req.body)
            .eq('id', id)
            .select();

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

        // 1. Fetch contract to get property_id
        const { data: contract, error: fetchError } = await userClient
            .from('contracts')
            .select('property_id')
            .eq('id', id)
            .maybeSingle();

        if (fetchError) throw fetchError;

        // 2. Delete the contract
        const { error } = await userClient
            .from('contracts')
            .delete()
            .eq('id', id);

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
            .select('price, charges, status')
            .eq('id', property_id)
            .maybeSingle();

        if (propertyError) throw propertyError;
        if (!property) return res.status(404).json({ error: 'Property not found' });
        if (property.status !== 'available') return res.status(400).json({ error: 'Property is not available' });

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

const acceptContract = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userClient = createUserClient(req.token);
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

        // 2. Update Contract (Sign & Activate)
        // Rent is due at the beginning of month, with 5 days grace.
        const now = new Date();
        const { data: updatedContract, error: updateError } = await userClient
            .from('contracts')
            .update({
                status: 'active',
                signed_by_tenant: true,
                signed_by_landlord: true, // Auto-sign for MVP
                signed_at: now.toISOString(),
                start_date: now.toISOString(),
                payment_day: 1,
                grace_period_days: 5
            })
            .eq('id', id)
            .select();

        if (updateError) throw updateError;

        // 3. Update Property Status
        const { error: propertyUpdateError } = await userClient
            .from('properties')
            .update({ status: 'rented' })
            .eq('id', contract.property_id);
        if (propertyUpdateError) throw propertyUpdateError;

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
        const isBackoffice = ['admin', 'manager'].includes(req.user?.role);
        const tenant = isBackoffice ? null : await resolveTenant(userClient, req.user);

        if (!isBackoffice && !tenant) {
            return res.status(404).json({ error: 'Tenant profile not found' });
        }

        // Delete the draft contract
        let deleteQuery = userClient
            .from('contracts')
            .delete()
            .eq('id', id)
            .eq('status', 'draft'); // Security check

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

module.exports = {
    getContracts,
    getContractById,
    createContract,
    updateContract,
    deleteContract,
    createContractRequest,
    acceptContract,
    rejectContract,
};


