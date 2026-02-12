const createUserClient = require('../config/supabaseUser');
const supabaseAdmin = require('../config/supabaseAdmin');
const { resolveTenant } = require('../utils/tenantResolver');
const { parsePagination, parseSort, buildListResponse } = require('../utils/listQuery');

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
        const userClient = createUserClient(req.token);
        const isBackoffice = ['admin', 'manager'].includes(req.user?.role);
        const pagination = parsePagination(req.query);
        const { sortBy, sortOrder } = parseSort(
            req.query,
            ['created_at', 'updated_at', 'due_date', 'status', 'amount'],
            'due_date'
        );
        let contractIdsForTenant = null;

        if (!isBackoffice) {
            const tenant = await resolveTenant(userClient, req.user);
            if (!tenant) {
                return res.status(404).json({ error: 'Tenant profile not found' });
            }
            const { data: contracts, error: contractsError } = await userClient
                .from('contracts')
                .select('id')
                .eq('tenant_id', tenant.id);

            if (contractsError) throw contractsError;
            contractIdsForTenant = (contracts || [])
                .map((c) => String(c.id || '').trim())
                .filter(Boolean);

            if (!contractIdsForTenant.length) {
                return res.status(200).json(buildListResponse([], pagination, 0));
            }
        }

        let query = userClient
            .from('payments')
            .select('*, contracts(id, tenant_id, property_id, properties(title, address))')
            .order(sortBy, { ascending: sortOrder === 'asc' });

        if (!isBackoffice) {
            query = query.in('contract_id', contractIdsForTenant);
        }

        if (pagination.enabled) {
            query = query.range(pagination.from, pagination.to);
        }

        const { data, error } = await query;

        if (error) throw error;
        let total = null;
        if (pagination.enabled) {
            let countQuery = userClient
                .from('payments')
                .select('id', { count: 'exact', head: true });
            if (!isBackoffice) {
                countQuery = countQuery.in('contract_id', contractIdsForTenant);
            }
            const { count, error: countError } = await countQuery;
            if (countError) throw countError;
            total = count;
        }

        res.status(200).json(buildListResponse(data || [], pagination, total));
    } catch (err) {
        next(err);
    }
};

const getPaymentsOverview = async (req, res, next) => {
    try {
        const userClient = createUserClient(req.token);
        const tenant = await resolveTenant(userClient, req.user);
        if (!tenant) {
            return res.status(404).json({ error: 'Tenant profile not found' });
        }

        const { data: contracts, error: contractsError } = await userClient
            .from('contracts')
            .select('id')
            .eq('tenant_id', tenant.id);

        if (contractsError) throw contractsError;
        const contractIds = (contracts || [])
            .map((c) => String(c.id || '').trim())
            .filter(Boolean);

        if (!contractIds.length) {
            return res.status(200).json({
                paid: [],
                upcoming_next_month: null,
                meta: { next_month: formatIsoMonth(getNextMonthStartUtc()) },
            });
        }

        const { data: payments, error: paymentsError } = await userClient
            .from('payments')
            .select('*, contracts(id, tenant_id, property_id, properties(title, address))')
            .in('contract_id', contractIds)
            .order('due_date', { ascending: false });

        if (paymentsError) throw paymentsError;
        const rows = Array.isArray(payments) ? payments : [];

        const nextMonthStart = getNextMonthStartUtc();
        const nextMonthEnd = getMonthEndUtc(nextMonthStart);
        let upcoming = null;
        const paid = [];

        for (const payment of rows) {
            const status = String(payment?.status || '').toLowerCase();
            const validationStatus = String(payment?.validation_status || '').toLowerCase();
            const dueDate = toUtcDate(payment?.due_date);
            const isPaid = status === 'paid' || validationStatus === 'validated';

            if (isPaid) {
                paid.push(payment);
                continue;
            }

            if (dueDate && dueDate >= nextMonthStart && dueDate <= nextMonthEnd && !upcoming) {
                upcoming = payment;
            }
        }

        return res.status(200).json({
            paid,
            upcoming_next_month: upcoming,
            meta: { next_month: formatIsoMonth(nextMonthStart) },
        });
    } catch (err) {
        next(err);
    }
};

const createPayment = async (req, res, next) => {
    try {
        const userClient = createUserClient(req.token);
        const { data, error } = await userClient
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
        const userClient = createUserClient(req.token);
        const isBackoffice = ['admin', 'manager'].includes(req.user?.role);
        const payload = isBackoffice ? req.body : sanitizeTenantPaymentUpdate(req.body);

        if (!isBackoffice) {
            const tenant = await resolveTenant(userClient, req.user);
            if (!tenant) {
                return res.status(404).json({ error: 'Tenant profile not found' });
            }

            const { data: owned, error: ownedError } = await userClient
                .from('payments')
                .select('id, contracts!inner(tenant_id)')
                .eq('id', id)
                .eq('contracts.tenant_id', tenant.id)
                .maybeSingle();

            if (ownedError) throw ownedError;
            if (!owned) return res.status(404).json({ error: 'Payment not found' });
        }

        const { data, error } = await userClient
            .from('payments')
            .update(payload)
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
        const userClient = createUserClient(req.token);

        if (!file) {
            return res.status(400).json({ error: 'Missing file upload' });
        }

        const mimeType = file.mimetype;
        const buffer = file.buffer;

        // determine extension
        const ext = (mimeType && mimeType.split('/')[1]) || 'png';
        const timestamp = Date.now();
        const filename = `payments/${id}/proof_${timestamp}.${ext}`;

        // upload to supabase storage (bucket: payment-proofs)
        const bucket = 'payment-proofs';

        const { error: uploadError } = await userClient.storage
            .from(bucket)
            .upload(filename, buffer, { contentType: mimeType, upsert: true });

        if (uploadError) throw uploadError;

        // get public url
        const { data: publicData } = userClient.storage.from(bucket).getPublicUrl(filename);
        const publicUrl = publicData && publicData.publicUrl ? publicData.publicUrl : null;

        const isBackoffice = ['admin', 'manager'].includes(req.user?.role);
        const tenant = isBackoffice ? null : await resolveTenant(userClient, req.user);
        if (!isBackoffice && !tenant) {
            return res.status(404).json({ error: 'Tenant profile not found' });
        }

        let paymentQuery = userClient
            .from('payments')
            .select('id, proof_urls, contracts!inner(tenant_id)')
            .eq('id', id);

        if (!isBackoffice) {
            paymentQuery = paymentQuery.eq('contracts.tenant_id', tenant.id);
        }

        const { data: payment, error: paymentError } = await paymentQuery.maybeSingle();

        if (paymentError) throw paymentError;
        if (!payment) return res.status(404).json({ error: 'Payment not found' });

        const nextProofs = Array.isArray(payment.proof_urls) ? [...payment.proof_urls] : [];
        if (publicUrl) {
            nextProofs.push(publicUrl);
        }

        // update payment record with proof urls
        const { data, error } = await userClient
            .from('payments')
            .update({
                proof_urls: nextProofs,
                validation_status: 'pending',
                status: 'pending',
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

const createTenantManualPayment = async (req, res, next) => {
    try {
        const userClient = createUserClient(req.token);
        const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
        const tenant = await resolveTenant(userClient, req.user);
        if (!tenant) {
            return res.status(404).json({ error: 'Tenant profile not found' });
        }

        const { data: contract, error: contractError } = await userClient
            .from('contracts')
            .select('id, monthly_rent, charges, status, start_date')
            .eq('tenant_id', tenant.id)
            .eq('status', 'active')
            .order('start_date', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (contractError) throw contractError;
        if (!contract) {
            return res.status(400).json({ error: 'No active contract found for this tenant' });
        }

        const nextMonthStart = getNextMonthStartUtc();

        const rawDueDate = req.body?.due_date ? new Date(req.body.due_date) : null;
        if (!rawDueDate || Number.isNaN(rawDueDate.getTime())) {
            return res.status(400).json({ error: 'due_date is required and must be a valid date' });
        }

        const dueMonthStart = normalizeMonthStartUtc(rawDueDate);
        if (dueMonthStart.getTime() !== nextMonthStart.getTime()) {
            return res.status(400).json({ error: 'Manual payment can only be created for the next month' });
        }

        const amountInput = Number(req.body?.amount);
        const defaultAmount = Number(contract.monthly_rent || 0) + Number(contract.charges || 0);
        const amount = Number.isFinite(amountInput) && amountInput > 0 ? amountInput : defaultAmount;
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Invalid payment amount' });
        }

        const month = formatMonthLabel(dueMonthStart);
        const paymentPayload = {
            contract_id: contract.id,
            month,
            amount,
            due_date: dueMonthStart.toISOString(),
            status: 'pending',
            validation_status: 'not_submitted',
            late_fee: 0,
        };

        let data = null;
        let error = null;

        const userInsert = await userClient
            .from('payments')
            .insert([paymentPayload])
            .select();
        data = userInsert.data;
        error = userInsert.error;

        if (error && (error.code === '42501' || error.code === '401') && hasServiceRoleKey) {
            const adminInsert = await supabaseAdmin
                .from('payments')
                .insert([paymentPayload])
                .select();
            data = adminInsert.data;
            error = adminInsert.error;
        }

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({ error: 'A payment already exists for this contract and month' });
            }
            if (error.code === '42501' || error.code === '401') {
                return res.status(403).json({
                    error: 'Permission denied by RLS. Apply the hardening SQL patch for payments tenant insert.',
                });
            }
            throw error;
        }
        res.status(201).json(data[0]);
    } catch (err) {
        next(err);
    }
};

const validatePayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { validation_notes } = req.body || {};
        const userClient = createUserClient(req.token);

        const { data, error } = await userClient
            .from('payments')
            .update({
                validation_status: 'validated',
                status: 'paid',
                payment_date: new Date().toISOString().split('T')[0],
                validated_by: req.user.id,
                validated_at: new Date().toISOString(),
                validation_notes: validation_notes || null,
                rejection_reason: null,
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

const rejectPayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rejection_reason, validation_notes } = req.body || {};
        const userClient = createUserClient(req.token);

        const { data, error } = await userClient
            .from('payments')
            .update({
                validation_status: 'rejected',
                status: 'pending',
                rejection_reason: rejection_reason || 'Payment proof rejected',
                validation_notes: validation_notes || null,
                validated_by: req.user.id,
                validated_at: new Date().toISOString(),
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
    getPayments,
    getPaymentsOverview,
    createPayment,
    createTenantManualPayment,
    updatePayment,
    uploadPaymentProof,
    validatePayment,
    rejectPayment,
};

function sanitizeTenantPaymentUpdate(input) {
    const safe = {};
    const allowed = ['payment_date', 'status'];
    for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(input || {}, key)) {
            safe[key] = input[key];
        }
    }
    return safe;
}

function formatMonthLabel(date) {
    const monthName = date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
}

function normalizeMonthStartUtc(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function getNextMonthStartUtc(reference = new Date()) {
    return new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1));
}

function getMonthEndUtc(monthStart) {
    return new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function toUtcDate(value) {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

function formatIsoMonth(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}


