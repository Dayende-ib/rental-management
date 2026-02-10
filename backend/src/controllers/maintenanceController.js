const supabase = require('../config/supabase');

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
        const userId = req.user.id;
        const { data, error } = await supabase
            .from('maintenance_requests')
            .select('*, properties(title)')
            .eq('tenant_id', userId);

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const createMaintenanceRequest = async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('maintenance_requests')
            .insert([req.body])
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
        const { data, error } = await supabase
            .from('maintenance_requests')
            .update(req.body)
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
