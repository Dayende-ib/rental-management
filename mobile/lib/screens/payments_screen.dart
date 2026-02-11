import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/models.dart';
import '../core/providers/payment_providers.dart';
import '../core/constants.dart';

/// Payments screen showing all rent payments with filtering
class PaymentsScreen extends ConsumerStatefulWidget {
  const PaymentsScreen({super.key});

  @override
  ConsumerState<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends ConsumerState<PaymentsScreen> {
  String _filter = 'all'; // 'all', 'paid', 'pending'

  @override
  Widget build(BuildContext context) {
    final paymentsAsync = ref.watch(paymentsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes Paiements'),
        actions: [
          IconButton(
            tooltip: 'Ajouter un paiement',
            icon: const Icon(Icons.add_circle_outline),
            onPressed: () => _openCreateManualPaymentSheet(context, ref),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(50),
          child: _buildFilterBar(),
        ),
      ),
      body: paymentsAsync.when(
        data: (payments) {
          final filteredPayments = _applyFilter(payments);
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(paymentsProvider);
            },
            child: filteredPayments.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: EdgeInsets.all(AppConstants.defaultPadding),
                    children: [
                      _buildPaymentRuleInfoCard(),
                      SizedBox(
                        height: MediaQuery.of(context).size.height * 0.5,
                        child: _buildEmptyState(),
                      ),
                    ],
                  )
                : ListView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: EdgeInsets.all(AppConstants.defaultPadding),
                    itemCount: filteredPayments.length + 1,
                    itemBuilder: (context, index) {
                      if (index == 0) {
                        return _buildPaymentRuleInfoCard();
                      }
                      return _buildPaymentCard(
                        context,
                        ref,
                        filteredPayments[index - 1],
                      );
                    },
                  ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => _buildErrorState(error),
      ),
    );
  }

  Widget _buildFilterBar() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          _filterChip('Tous', 'all'),
          const SizedBox(width: 8),
          _filterChip('Validés', 'paid'),
          const SizedBox(width: 8),
          _filterChip('En attente', 'pending'),
        ],
      ),
    );
  }

  Widget _filterChip(String label, String value) {
    final isSelected = _filter == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        if (selected) setState(() => _filter = value);
      },
      selectedColor: const Color(AppColors.accent).withOpacity(0.2),
      labelStyle: TextStyle(
        color: isSelected ? const Color(AppColors.accent) : Colors.black54,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
    );
  }

  List<Payment> _applyFilter(List<Payment> payments) {
    if (_filter == 'all') return payments;
    if (_filter == 'paid') {
      return payments.where((p) => p.isPaid || p.isValidated).toList();
    }
    if (_filter == 'pending') {
      return payments.where((p) => !p.isPaid && !p.isValidated).toList();
    }
    return payments;
  }

  Widget _buildErrorState(Object error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error, size: 60, color: Colors.red),
          const SizedBox(height: 16),
          Text('Erreur: $error'),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => ref.invalidate(paymentsProvider),
            child: const Text('Réessayer'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.payment, size: 80, color: Colors.grey),
          const SizedBox(height: 16),
          Text(
            _filter == 'all'
                ? 'Aucun paiement trouvé'
                : 'Aucun paiement dans cette catégorie',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentRuleInfoCard() {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.shade100),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline, color: Colors.blue),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              'Regle de paiement: chaque loyer doit etre valide avant le 5 du mois suivant. '
              'Passe cette date, une penalite de 5% est appliquee.',
              style: TextStyle(
                fontSize: 12,
                color: Colors.black87,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentCard(
    BuildContext context,
    WidgetRef ref,
    Payment payment,
  ) {
    final bool isPaid = payment.isPaid || payment.isValidated;
    final bool isPendingValidation = payment.isPendingValidation;
    final bool isRejected = payment.isRejected;

    Color badgeColor;
    String badgeText;
    Color badgeTextColor;

    if (isPaid) {
      badgeColor = const Color(AppColors.accentLight);
      badgeTextColor = const Color(AppColors.accent);
      badgeText = 'Validé';
    } else if (isPendingValidation) {
      badgeColor = Colors.orange.shade100;
      badgeTextColor = Colors.orange.shade800;
      badgeText = 'En attente';
    } else if (isRejected) {
      badgeColor = Colors.red.shade100;
      badgeTextColor = Colors.red.shade800;
      badgeText = 'Refusé';
    } else if (payment.isOverdue) {
      badgeColor = Colors.red.shade100;
      badgeTextColor = Colors.red.shade900;
      badgeText = 'En retard';
    } else {
      badgeColor = Colors.grey.shade200;
      badgeTextColor = Colors.grey.shade700;
      badgeText = 'À payer';
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      payment.month,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'Échéance: ${_formatDate(payment.dueDate)}',
                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: badgeColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    badgeText,
                    style: TextStyle(
                      color: badgeTextColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${(payment.amount + payment.lateFee).toStringAsFixed(0)} FCFA',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Color(AppColors.accent),
                  ),
                ),
                if (payment.lateFee > 0) ...[
                  const SizedBox(width: 8),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text(
                      '(dont ${payment.lateFee.toStringAsFixed(0)} pénalité)',
                      style: const TextStyle(
                        color: Colors.red,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            if (!isPaid) ...[
              const SizedBox(height: 10),
              Text(
                'A valider avant le 5 du mois suivant (penalite 5% ensuite).',
                style: TextStyle(
                  color: Colors.orange.shade900,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: (!isPaid && !isPendingValidation)
                    ? () => _handlePayment(context, ref, payment)
                    : null,
                child: Text(
                  isPaid
                      ? 'Payé'
                      : isPendingValidation
                      ? 'En attente de validation'
                      : 'Payer maintenant',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handlePayment(
    BuildContext context,
    WidgetRef ref,
    Payment payment,
  ) async {
    // Simulation simple pour l'exemple
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmer le paiement'),
        content: Text(
          'Voulez-vous marquer le mois de ${payment.month} comme payé ?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Confirmer'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final paymentService = ref.read(paymentServiceProvider);
      await paymentService.makePayment(payment.id);
      ref.invalidate(paymentsProvider);
    }
  }

  String _formatDate(DateTime date) => '${date.day}/${date.month}/${date.year}';

  Future<void> _openCreateManualPaymentSheet(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final amountController = TextEditingController();
    DateTime? selectedMonth;
    String? errorText;
    bool isSubmitting = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 16,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Ajouter un paiement',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: amountController,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: const InputDecoration(
                      labelText: 'Montant (FCFA)',
                      hintText: 'Ex: 75000',
                    ),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () async {
                      final now = DateTime.now();
                      final firstFutureMonth = DateTime(
                        now.year,
                        now.month + 1,
                        1,
                      );
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: selectedMonth ?? firstFutureMonth,
                        firstDate: firstFutureMonth,
                        lastDate: DateTime(now.year + 10, 12, 31),
                        helpText: 'Selectionnez un mois futur',
                      );
                      if (picked == null) return;
                      final normalized = DateTime(picked.year, picked.month, 1);
                      setModalState(() {
                        selectedMonth = normalized;
                      });
                    },
                    icon: const Icon(Icons.calendar_month),
                    label: Text(
                      selectedMonth == null
                          ? 'Choisir mois/annee'
                          : '${selectedMonth!.month.toString().padLeft(2, '0')}/${selectedMonth!.year}',
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Seuls les mois futurs sont autorises.',
                    style: TextStyle(fontSize: 12, color: Colors.black54),
                  ),
                  if (errorText != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      errorText!,
                      style: const TextStyle(
                        color: Colors.red,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              final month = selectedMonth;
                              final amount = double.tryParse(
                                amountController.text.trim(),
                              );
                              if (month == null) {
                                setModalState(() {
                                  errorText =
                                      'Veuillez selectionner un mois futur';
                                });
                                return;
                              }
                              if (amount == null || amount <= 0) {
                                setModalState(() {
                                  errorText =
                                      'Veuillez entrer un montant valide';
                                });
                                return;
                              }
                              final now = DateTime.now();
                              final currentMonthStart = DateTime(
                                now.year,
                                now.month,
                                1,
                              );
                              if (!month.isAfter(currentMonthStart)) {
                                setModalState(() {
                                  errorText =
                                      'Le mois doit etre strictement futur';
                                });
                                return;
                              }

                              setModalState(() {
                                isSubmitting = true;
                                errorText = null;
                              });

                              final paymentService = ref.read(
                                paymentServiceProvider,
                              );
                              final ok = await paymentService
                                  .createManualPayment(
                                    dueMonth: month,
                                    amount: amount,
                                  );
                              if (!context.mounted) return;

                              if (!ok) {
                                setModalState(() {
                                  isSubmitting = false;
                                  errorText =
                                      'Creation impossible. Verifiez votre contrat actif.';
                                });
                                return;
                              }

                              ref.invalidate(paymentsProvider);
                              Navigator.pop(context);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Paiement ajoute avec succes'),
                                ),
                              );
                            },
                      child: isSubmitting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Ajouter le paiement'),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );

    amountController.dispose();
  }
}
