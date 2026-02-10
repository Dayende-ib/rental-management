const supabase = require('../config/supabase');

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
        const { data, error } = await supabase
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
        const { data, error } = await supabase
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

        // 1. Check if the property is available
        const { data: property, error: propertyError } = await supabase
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
        const { data: contract, error: contractError } = await supabase
            .from('contracts')
            .insert([{ ...req.body, status: 'active' }])
            .select();

        if (contractError) throw contractError;

        // 3. Update property status to 'rented'
        const { error: updateError } = await supabase
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
        const { data, error } = await supabase
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

        // 1. Fetch contract to get property_id
        const { data: contract, error: fetchError } = await supabase
            .from('contracts')
            .select('property_id')
            .eq('id', id)
            .maybeSingle();

        if (fetchError) throw fetchError;

        // 2. Delete the contract
        const { error } = await supabase
            .from('contracts')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // 3. Set property back to 'available' if contract existed
        if (contract) {
            await supabase
                .from('properties')
                .update({ status: 'available' })
                .eq('id', contract.property_id);
        }

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
};
