const supabase = require('../config/supabase');
const createUserClient = require('../config/supabaseUser');

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
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userClient = createUserClient(req.token);
        let query = userClient
            .from('properties')
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

const getPropertyById = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { id } = req.params;
        const userClient = createUserClient(req.token);
        let query = userClient
            .from('properties')
            .select('*')
            .eq('id', id);
        if (req.userRole !== 'admin') {
            query = query.eq('owner_id', req.user.id);
        }
        const { data, error } = await query.maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Property not found' });
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const createProperty = async (req, res, next) => {
    try {
        const payload = {
            ...req.body,
            owner_id: req.userRole === 'admin' && req.body.owner_id ? req.body.owner_id : req.user.id,
        };
        const userClient = createUserClient(req.token);
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
        if (req.userRole !== 'admin' && 'owner_id' in req.body) {
            delete req.body.owner_id;
        }
        const userClient = createUserClient(req.token);
        let query = userClient
            .from('properties')
            .update(req.body)
            .eq('id', id);
        if (req.userRole !== 'admin') {
            query = query.eq('owner_id', req.user.id);
        }
        const { data, error } = await query.select();

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
        let query = userClient
            .from('properties')
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

const uploadPropertyPhoto = async (req, res, next) => {
    try {
        const { id } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'Missing file upload' });
        }
        const mimeType = file.mimetype;

        const userClient = createUserClient(req.token);

        // ensure property exists
        let propertyQuery = userClient
            .from('properties')
            .select('id, photos, owner_id')
            .eq('id', id);
        if (req.userRole !== 'admin') {
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

module.exports = {
    getProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
    uploadPropertyPhoto,
};
