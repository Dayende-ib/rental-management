import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../core/constants.dart';
import '../core/models.dart';
import '../core/providers/payment_providers.dart';

class PaymentsScreen extends ConsumerWidget {
  const PaymentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final overviewAsync = ref.watch(paymentOverviewProvider);
    final paymentsAsync = ref.watch(paymentsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes paiements'),
        actions: [
          IconButton(
            tooltip: 'Ajouter paiement prochain mois',
            icon: const Icon(Icons.add_circle_outline),
            onPressed: () => _openCreateManualPaymentSheet(context, ref),
          ),
        ],
      ),
      body: overviewAsync.when(
        data: (overview) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(paymentOverviewProvider);
            ref.invalidate(paymentsProvider);
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: EdgeInsets.all(AppConstants.defaultPadding),
            children: [
              _buildPaymentRuleInfoCard(),
              const SizedBox(height: 12),
              _buildUpcomingSection(context, ref, overview),
              const SizedBox(height: 16),
              _buildPaidSection(context, overview.paidPayments),
              const SizedBox(height: 16),
              _buildStatusTrackingSection(
                context,
                ref,
                paymentsAsync,
                overview,
              ),
            ],
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 56, color: Colors.red),
              const SizedBox(height: 12),
              Text('Erreur: $error', textAlign: TextAlign.center),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => ref.invalidate(paymentOverviewProvider),
                child: const Text('Reessayer'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusTrackingSection(
    BuildContext context,
    WidgetRef ref,
    AsyncValue<List<Payment>> paymentsAsync,
    PaymentOverview overview,
  ) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: paymentsAsync.when(
          data: (payments) {
            final upcomingId = overview.upcomingNextMonth?.id;
            final statusList =
                payments
                    .where(
                      (p) =>
                          p.id != upcomingId &&
                          (p.validationStatus == 'pending' ||
                              p.validationStatus == 'rejected' ||
                              p.validationStatus == 'not_submitted' ||
                              p.status == 'overdue'),
                    )
                    .toList()
                  ..sort((a, b) => b.dueDate.compareTo(a.dueDate));

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Suivi des statuts',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 10),
                if (statusList.isEmpty)
                  const Text('Aucun autre paiement en suivi.')
                else
                  ...statusList.map(
                    (p) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _buildPaymentCard(context, ref, p),
                    ),
                  ),
              ],
            );
          },
          loading: () => const SizedBox(
            height: 80,
            child: Center(child: CircularProgressIndicator()),
          ),
          error: (error, stackTrace) =>
              const Text('Impossible de charger les statuts secondaires.'),
        ),
      ),
    );
  }

  Widget _buildPaymentRuleInfoCard() {
    return Container(
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
              'Regle: le loyer doit etre valide avant le 5 du mois suivant. '
              'Au-dela, une penalite de 5% est appliquee.',
              style: TextStyle(fontSize: 12, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUpcomingSection(
    BuildContext context,
    WidgetRef ref,
    PaymentOverview overview,
  ) {
    final upcoming = overview.upcomingNextMonth;

    if (upcoming == null) {
      return Card(
        child: Padding(
          padding: EdgeInsets.all(AppConstants.defaultPadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Paiement du mois prochain',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              const Text('Aucun paiement a venir pour le mois prochain.'),
              const SizedBox(height: 12),
              ElevatedButton.icon(
                onPressed: () => _openCreateManualPaymentSheet(context, ref),
                icon: const Icon(Icons.add),
                label: const Text('Creer le paiement du mois prochain'),
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Paiement du mois prochain',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            _buildPaymentCard(context, ref, upcoming, emphasize: true),
          ],
        ),
      ),
    );
  }

  Widget _buildPaidSection(BuildContext context, List<Payment> paidPayments) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Paiements effectues',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            if (paidPayments.isEmpty)
              const Text('Aucun paiement valide pour le moment.')
            else
              ...paidPayments.map(
                (payment) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _buildPaidCard(context, payment),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaidCard(BuildContext context, Payment payment) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: Colors.green.shade100),
        borderRadius: BorderRadius.circular(12),
        color: Colors.green.shade50,
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.green),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      payment.month,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    Text(
                      '${(payment.amount + payment.lateFee).toStringAsFixed(0)} FCFA',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
              Text(
                _formatDate(payment.paidDate ?? payment.dueDate),
                style: const TextStyle(fontSize: 12, color: Colors.black54),
              ),
            ],
          ),
          if (payment.proofUrls.isNotEmpty) ...[
            const SizedBox(height: 8),
            _buildProofLinks(context, payment.proofUrls),
          ],
          if (payment.validationNotes.isNotEmpty) ...[
            const SizedBox(height: 8),
            _buildInfoLine('Note validation', payment.validationNotes),
          ],
        ],
      ),
    );
  }

  Widget _buildPaymentCard(
    BuildContext context,
    WidgetRef ref,
    Payment payment, {
    bool emphasize = false,
  }) {
    final statusMeta = _statusMeta(payment);
    final actionable =
        payment.validationStatus != 'validated' &&
        payment.status != 'paid' &&
        payment.validationStatus != 'pending';

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: emphasize
              ? const Color(AppColors.accentSoft)
              : Colors.grey.shade200,
          width: emphasize ? 1.5 : 1,
        ),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  payment.month,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              _badge(statusMeta.label, statusMeta.background, statusMeta.text),
            ],
          ),
          const SizedBox(height: 6),
          Text('Echeance: ${_formatDate(payment.dueDate)}'),
          const SizedBox(height: 6),
          Text(
            '${(payment.amount + payment.lateFee).toStringAsFixed(0)} FCFA',
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Color(AppColors.accent),
            ),
          ),
          if (payment.lateFee > 0)
            Text(
              'Penalite incluse: ${payment.lateFee.toStringAsFixed(0)} FCFA',
              style: const TextStyle(
                color: Colors.red,
                fontWeight: FontWeight.w600,
              ),
            ),
          if (payment.validationNotes.isNotEmpty) ...[
            const SizedBox(height: 10),
            _buildInfoLine('Note validation', payment.validationNotes),
          ],
          if (payment.rejectionReason.isNotEmpty) ...[
            const SizedBox(height: 10),
            _buildInfoLine('Motif de rejet', payment.rejectionReason),
          ],
          if (payment.proofUrls.isNotEmpty) ...[
            const SizedBox(height: 10),
            _buildProofLinks(context, payment.proofUrls),
          ],
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: actionable
                  ? () => _openSubmitPaymentSheet(context, ref, payment)
                  : null,
              icon: const Icon(Icons.upload_file),
              label: Text(_ctaLabel(payment)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProofLinks(BuildContext context, List<String> urls) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (var i = 0; i < urls.length; i++)
          ActionChip(
            label: Text('Preuve ${i + 1}'),
            onPressed: () => _openProofDialog(context, urls[i], i + 1),
          ),
      ],
    );
  }

  Widget _buildInfoLine(String label, String value) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        '$label: $value',
        style: const TextStyle(fontSize: 12, color: Colors.black87),
      ),
    );
  }

  _StatusMeta _statusMeta(Payment payment) {
    if (payment.validationStatus == 'validated' || payment.status == 'paid') {
      return _StatusMeta(
        'Valide',
        Colors.green.shade100,
        Colors.green.shade800,
      );
    }
    if (payment.validationStatus == 'rejected') {
      return _StatusMeta('Rejete', Colors.red.shade100, Colors.red.shade800);
    }
    if (payment.validationStatus == 'pending') {
      return _StatusMeta(
        'En attente validation',
        Colors.orange.shade100,
        Colors.orange.shade800,
      );
    }
    if (payment.validationStatus == 'not_submitted') {
      return _StatusMeta(
        'Non soumis',
        Colors.grey.shade200,
        Colors.grey.shade700,
      );
    }
    if (payment.status == 'overdue') {
      return _StatusMeta('En retard', Colors.red.shade100, Colors.red.shade900);
    }
    return _StatusMeta('A payer', Colors.grey.shade200, Colors.grey.shade700);
  }

  Widget _badge(String label, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(color: fg, fontWeight: FontWeight.bold, fontSize: 12),
      ),
    );
  }

  String _ctaLabel(Payment payment) {
    if (payment.validationStatus == 'pending') {
      return 'Preuve envoyee';
    }
    if (payment.validationStatus == 'rejected') {
      return 'Renvoyer une preuve';
    }
    if (payment.validationStatus == 'validated' || payment.status == 'paid') {
      return 'Deja valide';
    }
    return 'Soumettre paiement + preuve';
  }

  Future<void> _openSubmitPaymentSheet(
    BuildContext context,
    WidgetRef ref,
    Payment payment,
  ) async {
    _SelectedProof? selectedProof;
    bool isSubmitting = false;
    String? errorText;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (modalContext, setModalState) {
            return SafeArea(
              child: AnimatedPadding(
                duration: const Duration(milliseconds: 180),
                curve: Curves.easeOut,
                padding: EdgeInsets.only(
                  left: 16,
                  right: 16,
                  top: 16,
                  bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 16,
                ),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Soumettre paiement: ${payment.month}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Ajoutez une preuve (image) pour faciliter la validation.',
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: () async {
                          final picked = await _pickProofImage();
                          if (picked == null) return;
                          setModalState(() {
                            selectedProof = picked;
                          });
                        },
                        icon: const Icon(Icons.photo_library_outlined),
                        label: Text(
                          selectedProof == null
                              ? 'Choisir une preuve'
                              : 'Preuve: ${selectedProof!.fileName}',
                        ),
                      ),
                      if (errorText != null) ...[
                        const SizedBox(height: 10),
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
                                  setModalState(() {
                                    isSubmitting = true;
                                    errorText = null;
                                  });

                                  final paymentService = ref.read(
                                    paymentServiceProvider,
                                  );

                                  final ok = await paymentService.makePayment(
                                    payment.id,
                                    proofBytes: selectedProof?.bytes,
                                    proofFileName: selectedProof?.fileName,
                                    proofMimeType: selectedProof?.mimeType,
                                  );

                                  if (!modalContext.mounted) return;
                                  if (!ok) {
                                    setModalState(() {
                                      isSubmitting = false;
                                      errorText =
                                          'Soumission impossible. Verifiez votre connexion et la preuve.';
                                    });
                                    return;
                                  }

                                  ref.invalidate(paymentOverviewProvider);
                                  ref.invalidate(paymentsProvider);
                                  Navigator.pop(modalContext);
                                  ScaffoldMessenger.of(
                                    modalContext,
                                  ).showSnackBar(
                                    const SnackBar(
                                      content: Text(
                                        'Paiement soumis avec succes.',
                                      ),
                                    ),
                                  );
                                },
                          child: isSubmitting
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Text('Soumettre'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _openCreateManualPaymentSheet(
    BuildContext context,
    WidgetRef ref,
  ) async {
    String amountText = '';
    _SelectedProof? selectedProof;
    String? errorText;
    bool isSubmitting = false;

    final now = DateTime.now();
    final nextMonth = DateTime(now.year, now.month + 1, 1);

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (modalContext, setModalState) {
            return SafeArea(
              child: AnimatedPadding(
                duration: const Duration(milliseconds: 180),
                curve: Curves.easeOut,
                padding: EdgeInsets.only(
                  left: 16,
                  right: 16,
                  top: 16,
                  bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 16,
                ),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Ajouter un paiement manuel',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Mois cible: ${nextMonth.month.toString().padLeft(2, '0')}/${nextMonth.year}',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        decoration: const InputDecoration(
                          labelText: 'Montant (FCFA)',
                          hintText: 'Ex: 75000',
                        ),
                        onChanged: (value) {
                          amountText = value;
                        },
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: () async {
                          final picked = await _pickProofImage();
                          if (picked == null) return;
                          setModalState(() {
                            selectedProof = picked;
                          });
                        },
                        icon: const Icon(Icons.photo_library_outlined),
                        label: Text(
                          selectedProof == null
                              ? 'Ajouter une preuve (optionnel)'
                              : 'Preuve: ${selectedProof!.fileName}',
                        ),
                      ),
                      if (errorText != null) ...[
                        const SizedBox(height: 10),
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
                                  final amount = double.tryParse(
                                    amountText.trim(),
                                  );
                                  if (amount == null || amount <= 0) {
                                    setModalState(() {
                                      errorText =
                                          'Veuillez entrer un montant valide.';
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
                                  final result = await paymentService
                                      .createManualPayment(
                                        dueMonth: nextMonth,
                                        amount: amount,
                                        proofBytes: selectedProof?.bytes,
                                        proofFileName: selectedProof?.fileName,
                                        proofMimeType: selectedProof?.mimeType,
                                      );

                                  if (!modalContext.mounted) return;

                                  if (!result.success) {
                                    setModalState(() {
                                      isSubmitting = false;
                                      errorText =
                                          result.errorMessage ??
                                          'Creation impossible.';
                                    });
                                    return;
                                  }

                                  ref.invalidate(paymentOverviewProvider);
                                  ref.invalidate(paymentsProvider);
                                  Navigator.pop(modalContext);
                                  ScaffoldMessenger.of(
                                    modalContext,
                                  ).showSnackBar(
                                    const SnackBar(
                                      content: Text(
                                        'Paiement ajoute avec succes.',
                                      ),
                                    ),
                                  );
                                },
                          child: isSubmitting
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Text('Ajouter le paiement'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<_SelectedProof?> _pickProofImage() async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );
      if (picked == null) return null;
      final bytes = await picked.readAsBytes();
      if (bytes.isEmpty) return null;
      return _SelectedProof(
        bytes: bytes,
        fileName: picked.name,
        mimeType: _guessMimeType(picked.name),
      );
    } catch (_) {
      return null;
    }
  }

  String _guessMimeType(String filename) {
    final name = filename.toLowerCase();
    if (name.endsWith('.png')) return 'image/png';
    if (name.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }

  Future<void> _openProofDialog(
    BuildContext context,
    String url,
    int index,
  ) async {
    await showDialog<void>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: Text('Preuve $index'),
          content: SizedBox(
            width: 360,
            child: InteractiveViewer(
              child: Image.network(
                url,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) =>
                    SelectableText(url),
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Fermer'),
            ),
          ],
        );
      },
    );
  }

  String _formatDate(DateTime date) =>
      '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
}

class _StatusMeta {
  final String label;
  final Color background;
  final Color text;

  _StatusMeta(this.label, this.background, this.text);
}

class _SelectedProof {
  final Uint8List bytes;
  final String fileName;
  final String mimeType;

  _SelectedProof({
    required this.bytes,
    required this.fileName,
    required this.mimeType,
  });
}
