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
                ? _buildEmptyState()
                : ListView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: EdgeInsets.all(AppConstants.defaultPadding),
                    itemCount: filteredPayments.length,
                    itemBuilder: (context, index) {
                      return _buildPaymentCard(
                        context,
                        ref,
                        filteredPayments[index],
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
            Text(
              '${payment.amount.toStringAsFixed(0)} FCFA',
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Color(AppColors.accent),
              ),
            ),
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
}
