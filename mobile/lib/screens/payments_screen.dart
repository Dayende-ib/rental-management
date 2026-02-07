import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../core/models.dart';
import '../payments/payment_service.dart';
import '../core/constants.dart';

/// Payments screen showing all rent payments
class PaymentsScreen extends StatefulWidget {
  const PaymentsScreen({super.key});

  @override
  State<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends State<PaymentsScreen> {
  final PaymentService _paymentService = PaymentService();
  late Future<List<Payment>> _paymentsFuture;
  final ImagePicker _picker = ImagePicker();
  final Map<String, String?> _proofs = {};
  final Map<String, String?> _proofMimeTypes = {};

  @override
  void initState() {
    super.initState();
    _paymentsFuture = _paymentService.getPayments();
  }

  void _loadPayments() {
    setState(() {
      _paymentsFuture = _paymentService.getPayments();
    });
  }
 
  Future<void> _refreshPayments() async {
    _loadPayments();
    await _paymentsFuture;
  }

  Future<Map<String, String>?> _pickProof() async {
    final XFile? file = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 75,
    );
    if (file == null) return null;
    final bytes = await file.readAsBytes();
    return {
      'base64': base64Encode(bytes),
      'mimeType': _inferMimeType(file.path),
    };
  }

  String _inferMimeType(String path) {
    final lower = path.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    return 'image/jpeg';
  }

  void _removeProof(String paymentId) {
    setState(() {
      _proofs.remove(paymentId);
      _proofMimeTypes.remove(paymentId);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Preuve supprimée')),
    );
  }

  void _showProof(String paymentId) {
    final proof = _proofs[paymentId];
    if (proof == null) return;
    final bytes = base64Decode(proof);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Preuve'),
        content: Image.memory(bytes),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Fermer'),
          ),
        ],
      ),
    );
  }

  Future<void> _attachProof(String paymentId) async {
    final proof = await _pickProof();
    if (!mounted) return;
    setState(() {
      _proofs[paymentId] = proof?['base64'];
      _proofMimeTypes[paymentId] = proof?['mimeType'];
    });
    if (proof != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Preuve ajoutée')),
      );
    }
  }

  /// Handle payment simulation
  Future<void> _handlePayment(Payment payment) async {
    if (payment.isPaid || payment.isPendingValidation) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmer le paiement'),
        content: Text(
          'Confirmez-vous le paiement de ${payment.amount.toStringAsFixed(2)} € '
          'pour ${payment.month} ?\n\nVous pouvez joindre une preuve (photo). Le bailleur devra valider.',
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
      if (!mounted) return;
      final proof = _proofs[payment.id];
      final proofMimeType = _proofMimeTypes[payment.id];
      final success = await _paymentService.makePayment(
        payment.id,
        proofBase64: proof,
        proofMimeType: proofMimeType,
      );
      if (!mounted) return;
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              proof == null
                  ? 'Paiement envoyé pour validation (sans preuve)'
                  : 'Paiement envoyé avec preuve pour validation',
            ),
          ),
        );
        _loadPayments(); // Refresh the list
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes Paiements'),
      ),
      body: FutureBuilder<List<Payment>>(
        future: _paymentsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error, size: 60, color: Colors.red),
                  const SizedBox(height: 16),
                  Text('Erreur: ${snapshot.error}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadPayments,
                    child: const Text('Réessayer'),
                  ),
                ],
              ),
            );
          }

          final payments = snapshot.data!;
          return RefreshIndicator(
            onRefresh: _refreshPayments,
            child: ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: EdgeInsets.all(AppConstants.defaultPadding),
              itemCount: payments.length,
              itemBuilder: (context, index) {
                final payment = payments[index];
                return _buildPaymentCard(payment);
              },
            ),
          );
        },
      ),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: 1,
        onTap: (index) {
          if (index != 1) { // Don't navigate if already on this screen
            switch (index) {
              case 0:
                Navigator.pushReplacementNamed(context, '/home');
                break;
              case 2:
                Navigator.pushReplacementNamed(context, '/maintenance');
                break;
              case 3:
                Navigator.pushReplacementNamed(context, '/profile');
                break;
            }
          }
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Accueil',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.payment),
            label: 'Paiements',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.build),
            label: 'Maintenance',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profil',
          ),
        ],
      ),
    );
  }

  /// Build payment card avec statut de validation
  Widget _buildPaymentCard(Payment payment) {
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
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
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
                const Icon(Icons.attach_money, color: Color(AppColors.accent), size: 18),
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
                  const Icon(Icons.check_circle, size: 16, color: Color(AppColors.accentSoft)),
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
                  const Icon(Icons.warning_amber_rounded, size: 16, color: Colors.red),
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
                color: _proofs[payment.id] != null
                    ? Colors.green.shade50
                    : Colors.grey.shade200,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _proofs[payment.id] != null
                      ? Colors.green.shade200
                      : Colors.grey.shade300,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    _proofs[payment.id] != null ? Icons.check_circle : Icons.info_outline,
                    color: _proofs[payment.id] != null ? Colors.green : Colors.grey,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _proofs[payment.id] != null ? 'Preuve envoyée' : 'Preuve optionnelle',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.black87,
                            fontWeight: _proofs[payment.id] != null
                                ? FontWeight.w600
                                : FontWeight.w400,
                          ),
                    ),
                  ),
                  if (!isPaid && !isPendingValidation) ...[
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_vert),
                      onSelected: (value) {
                        switch (value) {
                          case 'add':
                            _attachProof(payment.id);
                            break;
                          case 'view':
                            _showProof(payment.id);
                            break;
                          case 'delete':
                            _removeProof(payment.id);
                            break;
                        }
                      },
                      itemBuilder: (context) => [
                        const PopupMenuItem(
                          value: 'add',
                          child: Text('Ajouter une preuve'),
                        ),
                        if (_proofs[payment.id] != null)
                          const PopupMenuItem(
                            value: 'view',
                            child: Text('Voir la preuve'),
                          ),
                        if (_proofs[payment.id] != null)
                          const PopupMenuItem(
                            value: 'delete',
                            child: Text('Supprimer la preuve'),
                          ),
                      ],
                    ),
                  ] else if (_proofs[payment.id] != null) ...[
                    IconButton(
                      onPressed: () => _showProof(payment.id),
                      icon: const Icon(Icons.visibility),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: (!isPaid && !isPendingValidation)
                    ? () => _handlePayment(payment)
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

  /// Format date for display
  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
