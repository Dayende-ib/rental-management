import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/models.dart';
import '../core/providers/payment_providers.dart';
import '../core/constants.dart';

/// Payments screen showing all rent payments
class PaymentsScreen extends ConsumerWidget {
  const PaymentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final paymentsAsync = ref.watch(paymentsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Mes Paiements')),
      body: paymentsAsync.when(
        data: (payments) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(paymentsProvider);
          },
          child: payments.isEmpty
              ? _buildEmptyState()
              : ListView.builder(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: EdgeInsets.all(AppConstants.defaultPadding),
                  itemCount: payments.length,
                  itemBuilder: (context, index) {
                    return _buildPaymentCard(context, ref, payments[index]);
                  },
                ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
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
        ),
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
          const Text(
            'Aucun paiement trouvé',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          const Text(
            'Les paiements apparaîtront ici',
            style: TextStyle(color: Colors.grey),
          ),
        ],
      ),
    );
  }

  /// Build payment card avec statut de validation
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
      badgeText = 'Validation bailleur';
    } else if (isRejected) {
      badgeColor = Colors.red.shade100;
      badgeTextColor = Colors.red.shade800;
      badgeText = 'Non validé';
    } else {
      badgeColor = const Color(AppColors.surface);
      badgeTextColor = const Color(AppColors.textPrimary);
      badgeText = 'À payer';
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppConstants.cardRadius),
      ),
      elevation: 2,
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
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Échéance: ${_formatDate(payment.dueDate)}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: badgeColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    badgeText,
                    style: TextStyle(
                      color: badgeTextColor,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const Icon(
                  Icons.attach_money,
                  color: Color(AppColors.accent),
                  size: 18,
                ),
                const SizedBox(width: 8),
                Text(
                  '${payment.amount.toStringAsFixed(0)} FCFA',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ],
            ),
            if (payment.isPaid && payment.paidDate != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(
                    Icons.check_circle,
                    size: 16,
                    color: Color(AppColors.accentSoft),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Payé le: ${_formatDate(payment.paidDate!)}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ],
            if (isRejected) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(
                    Icons.warning_amber_rounded,
                    size: 16,
                    color: Colors.red,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Le bailleur a refusé ce paiement. Merci de renvoyer une preuve ou de re-soumettre.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.grey.shade200,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: Colors.grey, size: 18),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Preuve optionnelle',
                      style: TextStyle(
                        color: Colors.black87,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: (!isPaid && !isPendingValidation)
                    ? () => _handlePayment(context, ref, payment)
                    : null,
                child: Text(
                  isPaid
                      ? 'Déjà validé'
                      : isPendingValidation
                      ? 'Validation en cours'
                      : isRejected
                      ? 'Renvoyer le paiement'
                      : 'Payer / Marquer payé',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Handle payment simulation
  Future<void> _handlePayment(
    BuildContext context,
    WidgetRef ref,
    Payment payment,
  ) async {
    if (payment.isPaid || payment.isPendingValidation) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmer le paiement'),
        content: Text(
          'Confirmez-vous le paiement de ${payment.amount.toStringAsFixed(2)} FCFA '
          'pour ${payment.month} ?\n\nLe bailleur devra valider votre paiement.',
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
      final success = await paymentService.makePayment(payment.id);

      if (!context.mounted) return;

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Paiement envoyé pour validation')),
        );
        ref.invalidate(paymentsProvider); // Refresh the list
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Erreur lors du paiement'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Format date for display
  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
