const supabase = require('../config/supabase');

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
        const { data, error } = await supabase
            .from('tenants')
            .select('*');

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const getTenantById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Tenant not found' });
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const createTenant = async (req, res, next) => {
    try {
        const { data, error } = await supabase
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
        const { data, error } = await supabase
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
        const { error } = await supabase
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
    getTenantById,
    createTenant,
    updateTenant,
    deleteTenant,
};
