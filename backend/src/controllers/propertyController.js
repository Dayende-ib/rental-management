const supabase = require('../config/supabase');

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
            .single();

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

module.exports = {
    getProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
};
