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
        let query = supabase
            .from('tenants')
            .select('*');
        if (req.userRole !== 'admin') {
            query = query.eq('owner_id', req.user.id);
        }
        const { data, error } = await query;

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const getCurrentTenant = async (req, res, next) => {
    try {
        const userId = req.user && req.user.id ? req.user.id : null;
        const email = req.user && req.user.email ? req.user.email : null;

        let data = [];
        let error = null;

        if (userId) {
            const result = await supabase
                .from('tenants')
                .select('*')
                .eq('id', userId)
                .limit(1);
            data = result.data || [];
            error = result.error;
        }

        if ((!data || !data.length) && email) {
            const result = await supabase
                .from('tenants')
                .select('*')
                .eq('email', email)
                .limit(1);
            data = result.data || [];
            error = result.error;
        }

        if (error) throw error;
        if (!data || !data.length) return res.status(404).json({ error: 'Tenant not found' });
        res.status(200).json(data[0]);
    } catch (err) {
        next(err);
    }
};

const getTenantById = async (req, res, next) => {
    try {
        const { id } = req.params;
        let query = supabase
            .from('tenants')
            .select('*')
            .eq('id', id);
        if (req.userRole !== 'admin') {
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
        const payload = {
            ...req.body,
            owner_id: req.userRole === 'admin' && req.body.owner_id ? req.body.owner_id : req.user.id,
        };
        const { data, error } = await supabase
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
        if (req.userRole !== 'admin' && 'owner_id' in req.body) {
            delete req.body.owner_id;
        }
        let query = supabase
            .from('tenants')
            .update(req.body)
            .eq('id', id);
        if (req.userRole !== 'admin') {
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
        let query = supabase
            .from('tenants')
            .delete()
            .eq('id', id);
        if (req.userRole !== 'admin') {
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
