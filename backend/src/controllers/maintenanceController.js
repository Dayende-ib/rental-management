const supabase = require('../config/supabase');
const createUserClient = require('../config/supabaseUser');

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
        let query = supabase
            .from('maintenance_requests')
            .select('*, properties!inner(title, owner_id)');
        if (req.userRole !== 'admin') {
            query = query.eq('properties.owner_id', req.user.id);
        }
        const { data, error } = await query;

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const createMaintenanceRequest = async (req, res, next) => {
    try {
        if (req.userRole !== 'admin') {
            const { data: property, error: propertyError } = await supabase
                .from('properties')
                .select('id, owner_id')
                .eq('id', req.body.property_id)
                .maybeSingle();
            if (propertyError) throw propertyError;
            if (!property || property.owner_id !== req.user.id) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }
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
        const client = createUserClient(req.token);
        const { data: existing, error: existingError } = await supabase
            .from('maintenance_requests')
            .select('id, status, tenant_id')
            .eq('id', id)
            .maybeSingle();
        if (existingError) throw existingError;
        if (req.userRole !== 'admin') {
            const { data: request, error: requestError } = await supabase
                .from('maintenance_requests')
                .select('id, property_id')
                .eq('id', id)
                .maybeSingle();
            if (requestError) throw requestError;
            if (!request) return res.status(404).json({ error: 'Maintenance request not found' });
            const { data: property, error: propertyError } = await supabase
                .from('properties')
                .select('id, owner_id')
                .eq('id', request.property_id)
                .maybeSingle();
            if (propertyError) throw propertyError;
            if (!property || property.owner_id !== req.user.id) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }
        const { data, error } = await client
            .from('maintenance_requests')
            .update(req.body)
            .eq('id', id)
            .select();

        if (error) throw error;
        if (!data.length) return res.status(404).json({ error: 'Maintenance request not found' });
        const updated = data[0];
        if (existing && existing.status !== updated.status && updated.tenant_id) {
            const statusLabel = {
                reported: 'Signale',
                pending: 'En attente',
                in_progress: 'En cours',
                completed: 'Termine',
                cancelled: 'Annule',
            }[updated.status] || updated.status;
            await client.from('notifications').insert([{
                user_id: updated.tenant_id,
                title: 'Maintenance mise a jour',
                message: `Votre demande est maintenant: ${statusLabel}.`,
                type: updated.status === 'completed' ? 'success' : 'info',
                related_entity_type: 'maintenance',
                related_entity_id: updated.id,
            }]);
        }
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
