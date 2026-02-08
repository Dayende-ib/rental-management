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
        const { data, error } = await supabase
            .from('properties')
            .select('*');

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const getPropertyById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Property not found' });
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const createProperty = async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('properties')
            .insert([req.body])
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
        const { data, error } = await supabase
            .from('properties')
            .update(req.body)
            .eq('id', id)
            .select();

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
        const { error } = await supabase
            .from('properties')
            .delete()
            .eq('id', id);

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
        const { data: property, error: propertyError } = await userClient
            .from('properties')
            .select('id, photos')
            .eq('id', id)
            .maybeSingle();

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
