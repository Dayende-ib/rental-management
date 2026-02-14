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
        const isAdmin = req.user?.role === 'admin';
        const isManager = req.user?.role === 'manager';
        const isBackoffice = isAdmin || isManager;
        const pagination = parsePagination(req.query);
        const { sortBy, sortOrder } = parseSort(
            req.query,
            ['created_at', 'updated_at', 'due_date', 'status', 'amount'],
            'due_date'
        );
        let contractIdsForTenant = null;
        let contractIdsForManager = null;

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
        } else if (isManager) {
            const { data: contractsByLandlord, error: contractsByLandlordError } = await userClient
                .from('contracts')
                .select('id')
                .eq('landlord_id', req.user.id);
            if (contractsByLandlordError) throw contractsByLandlordError;

            const { data: managerProperties, error: managerPropertiesError } = await userClient
                .from('properties')
                .select('id')
                .eq('owner_id', req.user.id);
            if (managerPropertiesError) throw managerPropertiesError;

            const propertyIds = (managerProperties || [])
                .map((p) => String(p.id || '').trim())
                .filter(Boolean);

            let contractsByProperty = [];
            if (propertyIds.length) {
                const result = await userClient
                    .from('contracts')
                    .select('id')
                    .in('property_id', propertyIds);
                if (result.error) throw result.error;
                contractsByProperty = result.data || [];
            }

            contractIdsForManager = Array.from(
                new Set(
                    [...(contractsByLandlord || []), ...contractsByProperty]
                        .map((c) => String(c.id || '').trim())
                        .filter(Boolean)
                )
            );

            if (!contractIdsForManager.length) {
                return res.status(200).json(buildListResponse([], pagination, 0));
            }
        }

        let query = userClient
            .from('payments')
            .select('*, contracts(id, tenant_id, property_id, landlord_id, properties(title, address))')
            .order(sortBy, { ascending: sortOrder === 'asc' });

        if (!isBackoffice) {
            query = query.in('contract_id', contractIdsForTenant);
        } else if (isManager) {
            query = query.in('contract_id', contractIdsForManager);
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
            } else if (isManager) {
                countQuery = countQuery.in('contract_id', contractIdsForManager);
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
        const isManager = req.user?.role === 'manager';

        if (isManager) {
            const ownsContract = await managerOwnsContract(userClient, req.body?.contract_id, req.user.id);
            if (!ownsContract) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }

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
        const isManager = req.user?.role === 'manager';
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

            const { data: paymentContract, error: paymentContractError } = await userClient
                .from('payments')
                .select('id, contracts!inner(id, status, tenant_id)')
                .eq('id', id)
                .eq('contracts.tenant_id', tenant.id)
                .maybeSingle();
            if (paymentContractError) throw paymentContractError;
            if (!paymentContract) return res.status(404).json({ error: 'Payment not found' });
            const contractStatus = String(paymentContract?.contracts?.status || '').toLowerCase();
            if (contractStatus !== 'active') {
                return res.status(400).json({
                    error: 'Payment is allowed only for properties with a validated contract',
                });
            }
        } else if (isManager) {
            const ownsPayment = await managerOwnsPayment(userClient, id, req.user.id);
            if (!ownsPayment) return res.status(404).json({ error: 'Payment not found' });
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
        const isManager = req.user?.role === 'manager';
        const tenant = isBackoffice ? null : await resolveTenant(userClient, req.user);
        if (!isBackoffice && !tenant) {
            return res.status(404).json({ error: 'Tenant profile not found' });
        }
        if (isManager) {
            const ownsPayment = await managerOwnsPayment(userClient, id, req.user.id);
            if (!ownsPayment) return res.status(404).json({ error: 'Payment not found' });
        }

        let paymentQuery = userClient
            .from('payments')
            .select('id, proof_urls, contracts!inner(tenant_id, status)')
            .eq('id', id);

        if (!isBackoffice) {
            paymentQuery = paymentQuery.eq('contracts.tenant_id', tenant.id);
        }

        const { data: payment, error: paymentError } = await paymentQuery.maybeSingle();

        if (paymentError) throw paymentError;
        if (!payment) return res.status(404).json({ error: 'Payment not found' });
        if (!isBackoffice) {
            const contractStatus = String(payment?.contracts?.status || '').toLowerCase();
            if (contractStatus !== 'active') {
                return res.status(400).json({
                    error: 'Payment is allowed only for properties with a validated contract',
                });
            }
        }

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

        const requestedContractId = String(req.body?.contract_id || '').trim();
        if (!requestedContractId) {
            return res.status(400).json({ error: 'contract_id is required' });
        }

        const { data: contract, error: contractError } = await userClient
            .from('contracts')
            .select('id, property_id, monthly_rent, charges, status, start_date, properties(title, address)')
            .eq('id', requestedContractId)
            .eq('tenant_id', tenant.id)
            .eq('status', 'active')
            .maybeSingle();

        if (contractError) throw contractError;
        if (!contract) {
            return res.status(400).json({ error: 'No active contract found for this tenant and property' });
        }

        const monthsCountRaw = Number(req.body?.months_count);
        const monthsCount = Number.isFinite(monthsCountRaw)
            ? Math.floor(monthsCountRaw)
            : 0;
        if (monthsCount < 1 || monthsCount > 24) {
            return res.status(400).json({ error: 'months_count must be between 1 and 24' });
        }

        const paidAtRaw = req.body?.payment_date ? new Date(req.body.payment_date) : new Date();
        if (!paidAtRaw || Number.isNaN(paidAtRaw.getTime())) {
            return res.status(400).json({ error: 'payment_date is required and must be a valid date' });
        }
        const coverageStartRaw = req.body?.coverage_start_date
            ? new Date(req.body.coverage_start_date)
            : paidAtRaw;
        if (!coverageStartRaw || Number.isNaN(coverageStartRaw.getTime())) {
            return res.status(400).json({ error: 'coverage_start_date must be a valid date' });
        }

        const paymentDate = new Date(Date.UTC(
            paidAtRaw.getUTCFullYear(),
            paidAtRaw.getUTCMonth(),
            paidAtRaw.getUTCDate()
        ));
        const periodStart = new Date(Date.UTC(
            coverageStartRaw.getUTCFullYear(),
            coverageStartRaw.getUTCMonth(),
            coverageStartRaw.getUTCDate()
        ));
        const periodEndExclusive = new Date(Date.UTC(
            paymentDate.getUTCFullYear(),
            paymentDate.getUTCMonth() + monthsCount,
            paymentDate.getUTCDate()
        ));
        const periodEnd = new Date(periodEndExclusive.getTime() - 24 * 60 * 60 * 1000);

        const amountPaid = Number(req.body?.amount_paid);
        if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
            return res.status(400).json({ error: 'amount_paid is required and must be greater than 0' });
        }

        const monthlyBase = Number(contract.monthly_rent || 0) + Number(contract.charges || 0);
        const expectedTotal = Number.isFinite(monthlyBase) && monthlyBase > 0
            ? monthlyBase * monthsCount
            : amountPaid;

        const paymentMethodMeta = resolvePaymentMethod(req.body?.payment_method);
        const paymentMethod = paymentMethodMeta.stored;
        const periodLabel = `${formatMonthLabel(periodStart)} -> ${formatMonthLabel(periodEnd)}`;
        const month = `Abonnement ${monthsCount}m ${periodStart.toISOString().slice(0, 10)}->${periodEnd.toISOString().slice(0, 10)}`;
        const details = [
            `Contrat: ${contract.id}`,
            `Bien: ${contract?.properties?.title || contract?.properties?.address || 'N/A'}`,
            `Periode: ${periodLabel}`,
            `Date paiement: ${paymentDate.toISOString().slice(0, 10)}`,
            `Debut couverture: ${periodStart.toISOString().slice(0, 10)}`,
            `Fin couverture: ${periodEnd.toISOString().slice(0, 10)}`,
            `Mois payes: ${monthsCount}`,
            `Montant verse: ${amountPaid}`,
            paymentMethodMeta.selected === paymentMethod
                ? `Moyen: ${paymentMethodMeta.selected}`
                : `Moyen saisi: ${paymentMethodMeta.selected} (stocke: ${paymentMethod})`,
        ].join(' | ');

        const paymentPayload = {
            contract_id: contract.id,
            month,
            amount: expectedTotal,
            amount_paid: amountPaid,
            payment_method: paymentMethod,
            payment_date: paymentDate.toISOString().slice(0, 10),
            due_date: periodEnd.toISOString(),
            status: 'pending',
            validation_status: 'not_submitted',
            validation_notes: details,
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
                    error: 'RLS blocked payments insert for tenant. Enable tenant insert policy on payments table.',
                });
            }
            throw error;
        }
        res.status(201).json({
            ...data[0],
            meta: {
                months_count: monthsCount,
                period_start: periodStart.toISOString().slice(0, 10),
                period_end: periodEnd.toISOString().slice(0, 10),
            },
        });
    } catch (err) {
        next(err);
    }
};

const validatePayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { validation_notes } = req.body || {};
        const userClient = createUserClient(req.token);
        const isManager = req.user?.role === 'manager';

        if (isManager) {
            const ownsPayment = await managerOwnsPayment(userClient, id, req.user.id);
            if (!ownsPayment) return res.status(404).json({ error: 'Payment not found' });
        }

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
        const isManager = req.user?.role === 'manager';

        if (isManager) {
            const ownsPayment = await managerOwnsPayment(userClient, id, req.user.id);
            if (!ownsPayment) return res.status(404).json({ error: 'Payment not found' });
        }

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

const deletePayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userClient = createUserClient(req.token);
        const isAdmin = req.user?.role === 'admin';
        const isManager = req.user?.role === 'manager';
        const isBackoffice = isAdmin || isManager;

        if (!isBackoffice) {
            const tenant = await resolveTenant(userClient, req.user);
            if (!tenant) {
                return res.status(404).json({ error: 'Tenant profile not found' });
            }

            const { data: ownedPayment, error: ownedError } = await userClient
                .from('payments')
                .select('id, status, validation_status, contracts!inner(tenant_id)')
                .eq('id', id)
                .eq('contracts.tenant_id', tenant.id)
                .maybeSingle();
            if (ownedError) throw ownedError;
            if (!ownedPayment) return res.status(404).json({ error: 'Payment not found' });

            const status = String(ownedPayment.status || '').toLowerCase();
            const validationStatus = String(ownedPayment.validation_status || '').toLowerCase();
            if (status === 'paid' || validationStatus === 'validated') {
                return res.status(400).json({ error: 'Validated payments cannot be deleted' });
            }
        } else if (isManager) {
            const ownsPayment = await managerOwnsPayment(userClient, id, req.user.id);
            if (!ownsPayment) return res.status(404).json({ error: 'Payment not found' });
        }

        const { data: existing, error: existingError } = await userClient
            .from('payments')
            .select('id, status, validation_status')
            .eq('id', id)
            .maybeSingle();
        if (existingError) throw existingError;
        if (!existing) return res.status(404).json({ error: 'Payment not found' });
        if (!isAdmin) {
            const status = String(existing.status || '').toLowerCase();
            const validationStatus = String(existing.validation_status || '').toLowerCase();
            if (status === 'paid' || validationStatus === 'validated') {
                return res.status(400).json({ error: 'Validated payments cannot be deleted' });
            }
        }

        const { error } = await userClient
            .from('payments')
            .delete()
            .eq('id', id);
        if (error) throw error;

        return res.status(204).send();
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
    deletePayment,
};

function sanitizeTenantPaymentUpdate(input) {
    const safe = {};
    const allowed = ['payment_date', 'status', 'payment_method'];
    for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(input || {}, key)) {
            safe[key] = input[key];
        }
    }
    if (Object.prototype.hasOwnProperty.call(safe, 'payment_method')) {
        const paymentMethodMeta = resolvePaymentMethod(safe.payment_method);
        safe.payment_method = paymentMethodMeta.stored;
        if (paymentMethodMeta.selected !== paymentMethodMeta.stored) {
            safe.validation_notes =
                `Moyen saisi: ${paymentMethodMeta.selected} (stocke: ${paymentMethodMeta.stored})`;
        }
    }
    return safe;
}

function resolvePaymentMethod(raw) {
    const value = String(raw || '').trim().toLowerCase();
    if (value === 'card') return { selected: 'card', stored: 'card' };
    if (value === 'mobile_money') return { selected: 'mobile_money', stored: 'bank_transfer' };
    if (value === 'bank_transfer') return { selected: 'bank_transfer', stored: 'bank_transfer' };
    return { selected: 'bank_transfer', stored: 'bank_transfer' };
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

async function managerOwnsContract(userClient, contractId, managerId) {
    if (!contractId) return false;
    const { data, error } = await userClient
        .from('contracts')
        .select('id, property_id, landlord_id')
        .eq('id', contractId)
        .maybeSingle();
    if (error) throw error;
    if (!data) return false;
    if (data.landlord_id === managerId) return true;

    const { data: property, error: propertyError } = await userClient
        .from('properties')
        .select('id')
        .eq('id', data.property_id)
        .eq('owner_id', managerId)
        .maybeSingle();
    if (propertyError) throw propertyError;
    return Boolean(property);
}

async function managerOwnsPayment(userClient, paymentId, managerId) {
    if (!paymentId) return false;
    const { data, error } = await userClient
        .from('payments')
        .select('id, contract_id')
        .eq('id', paymentId)
        .maybeSingle();
    if (error) throw error;
    if (!data) return false;
    return managerOwnsContract(userClient, data.contract_id, managerId);
}


