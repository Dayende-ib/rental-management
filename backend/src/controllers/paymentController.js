const supabase = require('../config/supabase');
const createUserClient = require('../config/supabaseUser');

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
        const client = createUserClient(req.token);
        let query = client
            .from('payments')
            .select('*, contracts!inner(id, tenant_id, landlord_id)');
        if (req.userRole !== 'admin') {
            query = query.eq('contracts.landlord_id', req.user.id);
        }
        const { data, error } = await query;

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const createPayment = async (req, res, next) => {
    try {
        if (req.userRole !== 'admin') {
            const { data: contract, error: contractError } = await supabase
                .from('contracts')
                .select('id, landlord_id')
                .eq('id', req.body.contract_id)
                .maybeSingle();
            if (contractError) throw contractError;
            if (!contract || contract.landlord_id !== req.user.id) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }
        const client = createUserClient(req.token);
        const { data, error } = await client
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
        if (req.userRole !== 'admin') {
            const { data: payment, error: paymentError } = await supabase
                .from('payments')
                .select('id, contract_id')
                .eq('id', id)
                .maybeSingle();
            if (paymentError) throw paymentError;
            if (!payment) return res.status(404).json({ error: 'Payment not found' });
            const { data: contract, error: contractError } = await supabase
                .from('contracts')
                .select('id, landlord_id')
                .eq('id', payment.contract_id)
                .maybeSingle();
            if (contractError) throw contractError;
            if (!contract || contract.landlord_id !== req.user.id) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }
        const client = createUserClient(req.token);
        const { data, error } = await client
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
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'Missing file upload' });
        }

        const client = createUserClient(req.token);
        const mimeType = file.mimetype;
        const buffer = file.buffer;

        // determine extension
        const ext = (mimeType && mimeType.split('/')[1]) || 'png';
        const timestamp = Date.now();
        const filename = `payments/${id}/proof_${timestamp}.${ext}`;

        // upload to supabase storage (bucket: payment-proofs)
        const bucket = 'payment-proofs';

        const { error: uploadError } = await client.storage
            .from(bucket)
            .upload(filename, buffer, { contentType: mimeType, upsert: true });

        if (uploadError) throw uploadError;

        // get public url
        const { data: publicData } = client.storage.from(bucket).getPublicUrl(filename);
        const publicUrl = publicData && publicData.publicUrl ? publicData.publicUrl : null;

        const { data: existing, error: fetchError } = await client
            .from('payments')
            .select('proof_urls')
            .eq('id', id)
            .maybeSingle();
        if (fetchError) throw fetchError;

        const current = Array.isArray(existing?.proof_urls) ? existing.proof_urls : [];
        const updated = publicUrl ? [...current, publicUrl] : current;

        const { data, error } = await client
            .from('payments')
            .update({ proof_urls: updated, validation_status: 'pending' })
            .eq('id', id)
            .select();

        if (error) throw error;
        if (!data.length) return res.status(404).json({ error: 'Payment not found' });

        res.status(200).json(data[0]);
    } catch (err) {
        next(err);
    }
};

const validatePayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (req.userRole !== 'admin') {
            const { data: payment, error: paymentError } = await supabase
                .from('payments')
                .select('id, contract_id')
                .eq('id', id)
                .maybeSingle();
            if (paymentError) throw paymentError;
            if (!payment) return res.status(404).json({ error: 'Payment not found' });
            const { data: contract, error: contractError } = await supabase
                .from('contracts')
                .select('id, landlord_id')
                .eq('id', payment.contract_id)
                .maybeSingle();
            if (contractError) throw contractError;
            if (!contract || contract.landlord_id !== req.user.id) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }
        const client = createUserClient(req.token);
        const { data, error } = await client
            .from('payments')
            .update({
                validation_status: 'validated',
                validated_by: req.user?.id || null,
                validated_at: new Date().toISOString(),
                rejection_reason: null,
            })
            .eq('id', id)
            .select()
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Payment not found' });
        let tenantUserId = null;
        if (data.contract_id) {
            const { data: contract, error: contractError } = await supabase
                .from('contracts')
                .select('tenant_id')
                .eq('id', data.contract_id)
                .maybeSingle();
            if (!contractError && contract?.tenant_id) {
                tenantUserId = contract.tenant_id;
            }
        }
        await client.from('notifications').insert([{
            user_id: tenantUserId || req.user?.id || null,
            title: 'Paiement valide',
            message: 'Votre paiement a ete valide.',
            type: 'success',
            related_entity_type: 'payment',
            related_entity_id: data.id,
        }]);
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const rejectPayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rejection_reason, validation_notes } = req.body || {};
        if (req.userRole !== 'admin') {
            const { data: payment, error: paymentError } = await supabase
                .from('payments')
                .select('id, contract_id')
                .eq('id', id)
                .maybeSingle();
            if (paymentError) throw paymentError;
            if (!payment) return res.status(404).json({ error: 'Payment not found' });
            const { data: contract, error: contractError } = await supabase
                .from('contracts')
                .select('id, landlord_id')
                .eq('id', payment.contract_id)
                .maybeSingle();
            if (contractError) throw contractError;
            if (!contract || contract.landlord_id !== req.user.id) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }
        const client = createUserClient(req.token);
        const { data, error } = await client
            .from('payments')
            .update({
                validation_status: 'rejected',
                rejection_reason: rejection_reason || 'Rejete',
                validation_notes: validation_notes || null,
                validated_by: req.user?.id || null,
                validated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Payment not found' });
        let tenantUserId = null;
        if (data.contract_id) {
            const { data: contract, error: contractError } = await supabase
                .from('contracts')
                .select('tenant_id')
                .eq('id', data.contract_id)
                .maybeSingle();
            if (!contractError && contract?.tenant_id) {
                tenantUserId = contract.tenant_id;
            }
        }
        await client.from('notifications').insert([{
            user_id: tenantUserId || req.user?.id || null,
            title: 'Paiement rejete',
            message: `Votre paiement a ete rejete. Raison: ${rejection_reason || 'Non precisee'}.`,
            type: 'error',
            related_entity_type: 'payment',
            related_entity_id: data.id,
        }]);
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getPayments,
    createPayment,
    updatePayment,
    uploadPaymentProof,
    validatePayment,
    rejectPayment,
};
