const supabase = require('../config/supabase');

/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       required:
 *         - contract_id
 *         - amount
 *         - payment_date
 *       properties:
 *         id:
 *           type: string
 *         contract_id:
 *           type: string
 *         amount:
 *           type: number
 *         payment_date:
 *           type: string
 *           format: date
 *         payment_method:
 *           type: string
 *           enum: [bank_transfer, cash, card]
 *         status:
 *           type: string
 *           enum: [paid, pending, overdue]
 */

const getPayments = async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('payments')
            .select('*, contracts(id, tenant_id)');

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const createPayment = async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('payments')
            .insert([req.body])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        next(err);
    }
};

const updatePayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('payments')
            .update(req.body)
            .eq('id', id)
            .select();

        if (error) throw error;
        if (!data.length) return res.status(404).json({ error: 'Payment not found' });
        res.status(200).json(data[0]);
    } catch (err) {
        next(err);
    }
};

const uploadPaymentProof = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { imageBase64, mimeType } = req.body;

        // convert base64 to buffer
        const buffer = Buffer.from(imageBase64, 'base64');

        // determine extension
        const ext = (mimeType && mimeType.split('/')[1]) || 'png';
        const timestamp = Date.now();
        const filename = `payments/${id}/proof_${timestamp}.${ext}`;

        // upload to supabase storage (bucket: payment-proofs)
        const bucket = 'payment-proofs';

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filename, buffer, { contentType: mimeType, upsert: true });

        if (uploadError) throw uploadError;

        // get public url
        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filename);
        const publicUrl = publicData && publicData.publicUrl ? publicData.publicUrl : null;

        // update payment record with proof url
        const { data, error } = await supabase
            .from('payments')
            .update({ proof_url: publicUrl })
            .eq('id', id)
            .select();

        if (error) throw error;
        if (!data.length) return res.status(404).json({ error: 'Payment not found' });

        res.status(200).json({ ...data[0], proof_url: publicUrl });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getPayments,
    createPayment,
    updatePayment,
    uploadPaymentProof,
};
