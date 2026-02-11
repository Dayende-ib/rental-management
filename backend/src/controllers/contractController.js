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
        let query = supabase
            .from('contracts')
            .select('*, properties(title)');
        if (req.userRole !== 'admin') {
            query = query.eq('landlord_id', req.user.id);
        }
        const { data, error } = await query;

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const getContractById = async (req, res, next) => {
    try {
        const { id } = req.params;
        let query = supabase
            .from('contracts')
            .select('*, properties(title)')
            .eq('id', id);
        if (req.userRole !== 'admin') {
            query = query.eq('landlord_id', req.user.id);
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
        const payload = {
            ...req.body,
            landlord_id: req.userRole === 'admin' && req.body.landlord_id ? req.body.landlord_id : req.user.id,
        };
        const { data, error } = await supabase
            .from('contracts')
            .insert([payload])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        next(err);
    }
};

const updateContract = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (req.userRole !== 'admin' && 'landlord_id' in req.body) {
            delete req.body.landlord_id;
        }
        let query = supabase
            .from('contracts')
            .update(req.body)
            .eq('id', id);
        if (req.userRole !== 'admin') {
            query = query.eq('landlord_id', req.user.id);
        }
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
        let query = supabase
            .from('contracts')
            .delete()
            .eq('id', id);
        if (req.userRole !== 'admin') {
            query = query.eq('landlord_id', req.user.id);
        }
        const { error } = await query;

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
};
