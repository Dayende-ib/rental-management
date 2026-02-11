const supabaseAdmin = require('../config/supabaseAdmin');

const runDailyTasks = async (req, res) => {
    try {
        console.log('Running daily cron tasks...');
        const results = {
            paymentsCreated: 0,
            lateFeesApplied: 0,
            errors: []
        };

        // 1. Generate Monthly Payments (Run on 1st of month)
        // Or run daily and check if today matches payment_day OR if payment just hasn't been created yet for this month.
        // To be safe, we check if payment exists for current month for all active contracts.
        // This handles cases where cron might fail on the 1st.

        await generateMonthlyPayments(results);

        // 2. Apply Late Fees (Run daily)
        await applyLateFees(results);

        console.log('Daily tasks completed:', results);
        res.status(200).json({ success: true, results });
    } catch (error) {
        console.error('Cron job failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const generateMonthlyPayments = async (results) => {
    const today = new Date();
    // Only proceed if it's the beginning of the month (e.g., first 5 days) to avoid creating duplicates late?
    // Actually better to check existence.

    // Get all active contracts
    const { data: contracts, error: contractError } = await supabaseAdmin
        .from('contracts')
        .select('id, monthly_rent, charges, payment_day, tenant_id') // removed property_id for now as not needed for basic insert? wait, payment links to contract
        .eq('status', 'active');

    if (contractError) {
        results.errors.push(`Failed to fetch contracts: ${contractError.message}`);
        return;
    }

    const currentMonthName = today.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    const formattedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);

    for (const contract of contracts) {
        try {
            // Check if payment already exists for this month
            const { data: existingPayment, error: findError } = await supabaseAdmin
                .from('payments')
                .select('id')
                .eq('contract_id', contract.id)
                .eq('month', formattedMonth)
                .maybeSingle();

            if (findError) throw findError;

            if (!existingPayment) {
                // Determine due date: 1st of current month
                // Even if we run this script on the 2nd, due date was the 1st.
                const dueDate = new Date(today.getFullYear(), today.getMonth(), 1);
                // Adjust fortimezone if needed, but UTC midnight is usually fine for dates

                const { error: createError } = await supabaseAdmin
                    .from('payments')
                    .insert([{
                        contract_id: contract.id,
                        month: formattedMonth,
                        amount: contract.monthly_rent + (contract.charges || 0),
                        due_date: dueDate.toISOString(), // ISO string date component
                        status: 'pending',
                        late_fee: 0
                    }]);

                if (createError) throw createError;
                results.paymentsCreated++;
            }
        } catch (e) {
            results.errors.push(`Failed to create payment for contract ${contract.id}: ${e.message}`);
        }
    }
};

const applyLateFees = async (results) => {
    const today = new Date();
    // Late fee rule: if not paid by 6th (due date 1st + 5 days grace).
    // So we check if today > 6th.
    // Actually, simply: check payments where due_date < (today - 5 days).

    const gracePeriodDays = 5;
    const cutoffDate = new Date();
    cutoffDate.setDate(today.getDate() - gracePeriodDays);

    // Find pending/overdue payments without late fees that are past grace period
    const { data: overduePayments, error: fetchError } = await supabaseAdmin
        .from('payments')
        .select('id, amount, due_date, status, late_fee')
        // status is not 'paid' or 'validated'
        .neq('status', 'paid')
        .neq('status', 'validated') // Assuming validated means paid is confirmed
        .lte('due_date', cutoffDate.toISOString()) // Due date was 5 or more days ago
        .eq('late_fee', 0); // Only if late fee not already applied

    if (fetchError) {
        results.errors.push(`Failed to fetch overdue payments: ${fetchError.message}`);
        return;
    }

    for (const payment of overduePayments) {
        try {
            const penalty = payment.amount * 0.05;

            const { error: updateError } = await supabaseAdmin
                .from('payments')
                .update({
                    late_fee: penalty,
                    status: 'overdue' // Update status to overdue
                })
                .eq('id', payment.id);

            if (updateError) throw updateError;
            results.lateFeesApplied++;
        } catch (e) {
            results.errors.push(`Failed to apply late fee for payment ${payment.id}: ${e.message}`);
        }
    }
};

module.exports = {
    runDailyTasks
};
