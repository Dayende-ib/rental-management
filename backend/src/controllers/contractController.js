const supabase = require('../config/supabase');
const createUserClient = require('../config/supabaseUser');

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
        const userId = req.user.id;
        const userClient = createUserClient(req.token);
        const { data, error } = await userClient
            .from('contracts')
            .select('*, properties(title)')
            .eq('tenant_id', userId);

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const getContractById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userClient = createUserClient(req.token);
        const { data, error } = await userClient
            .from('contracts')
            .select('*, properties(title)')
            .eq('id', id)
            .maybeSingle();

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
        const userId = req.user.id;

        // 1. Get Tenant ID
        const { data: tenant, error: tenantError } = await userClient
            .from('tenants')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

        if (tenantError) throw tenantError;
        if (!tenant) return res.status(404).json({ error: 'Tenant profile not found. Please complete your profile first.' });

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

        // 1. Get Contract
        const { data: contract, error: fetchError } = await userClient
            .from('contracts')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        if (contract.status !== 'draft') return res.status(400).json({ error: 'Contract is not in draft state' });

        // 2. Update Contract (Sign & Activate)
        // Note: For MVP we assume acting as landlord automatically validates it
        const { data: updatedContract, error: updateError } = await userClient
            .from('contracts')
            .update({
                status: 'active',
                signed_by_tenant: true,
                signed_by_landlord: true, // Auto-sign for MVP
                signed_at: new Date().toISOString()
            })
            .eq('id', id)
            .select();

        if (updateError) throw updateError;

        // 3. Update Property Status
        await userClient
            .from('properties')
            .update({ status: 'rented' })
            .eq('id', contract.property_id);

        res.status(200).json(updatedContract[0]);
    } catch (err) {
        next(err);
    }
};

const rejectContract = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userClient = createUserClient(req.token);

        // Delete the draft contract
        const { error } = await userClient
            .from('contracts')
            .delete()
            .eq('id', id)
            .eq('status', 'draft'); // Security check

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
