const createUserClient = require('../config/supabaseUser');

const resolveTenant = async (client, user) => {
    if (!user) return null;
    const { data, error } = await client
        .from('tenants')
        .select('*')
        .or(`id.eq.${user.id},email.eq.${user.email}`)
        .limit(1);
    if (error) throw error;
    return data && data.length ? data[0] : null;
};

const getTenantPayments = async (req, res, next) => {
    try {
        const client = createUserClient(req.token);
        const tenant = await resolveTenant(client, req.user);
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

        const { data, error } = await client
            .from('payments')
            .select('*, contracts!inner(id, tenant_id, property_id)')
            .eq('contracts.tenant_id', tenant.id)
            .order('due_date', { ascending: false });

        if (error) throw error;
        res.status(200).json(data || []);
    } catch (err) {
        next(err);
    }
};

const getTenantMaintenance = async (req, res, next) => {
    try {
        const client = createUserClient(req.token);
        const tenant = await resolveTenant(client, req.user);
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

        const { data, error } = await client
            .from('maintenance_requests')
            .select('*')
            .eq('tenant_id', tenant.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data || []);
    } catch (err) {
        next(err);
    }
};

const createTenantMaintenance = async (req, res, next) => {
    try {
        const client = createUserClient(req.token);
        const tenant = await resolveTenant(client, req.user);
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

        const payload = {
            ...req.body,
            tenant_id: tenant.id,
            reported_by: req.user.id,
        };

        const { data, error } = await client
            .from('maintenance_requests')
            .insert([payload])
            .select();

        if (error) throw error;
        await client.from('notifications').insert([{
            user_id: req.user?.id || null,
            title: 'Demande maintenance envoyee',
            message: 'Votre demande de maintenance a ete envoyee.',
            type: 'info',
            related_entity_type: 'maintenance',
            related_entity_id: data[0]?.id || null,
        }]);
        res.status(201).json(data[0]);
    } catch (err) {
        next(err);
    }
};

const uploadTenantPaymentProof = async (req, res, next) => {
    try {
        const { id } = req.params;
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'Missing file upload' });

        const client = createUserClient(req.token);
        const tenant = await resolveTenant(client, req.user);
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

        const { data: payment, error: paymentError } = await client
            .from('payments')
            .select('id, contract_id, proof_urls')
            .eq('id', id)
            .maybeSingle();
        if (paymentError) throw paymentError;
        if (!payment) return res.status(404).json({ error: 'Payment not found' });

        const { data: contract, error: contractError } = await client
            .from('contracts')
            .select('id, tenant_id')
            .eq('id', payment.contract_id)
            .maybeSingle();
        if (contractError) throw contractError;
        if (!contract || contract.tenant_id !== tenant.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const mimeType = file.mimetype;
        const buffer = file.buffer;
        const ext = (mimeType && mimeType.split('/')[1]) || 'png';
        const timestamp = Date.now();
        const filename = `payments/${id}/proof_${timestamp}.${ext}`;
        const bucket = 'payment-proofs';

        const { error: uploadError } = await client.storage
            .from(bucket)
            .upload(filename, buffer, { contentType: mimeType, upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicData } = client.storage.from(bucket).getPublicUrl(filename);
        const publicUrl = publicData && publicData.publicUrl ? publicData.publicUrl : null;

        const existing = Array.isArray(payment.proof_urls) ? payment.proof_urls : [];
        const updated = publicUrl ? [...existing, publicUrl] : existing;

        const { data, error } = await client
            .from('payments')
            .update({
                proof_urls: updated,
                validation_status: 'pending',
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        if (!data.length) return res.status(404).json({ error: 'Payment not found' });
        res.status(200).json(data[0]);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getTenantPayments,
    getTenantMaintenance,
    createTenantMaintenance,
    uploadTenantPaymentProof,
};
