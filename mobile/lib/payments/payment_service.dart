import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import '../core/constants.dart';
import '../core/models.dart';

/// Service for handling payment-related API calls
class PaymentService {
  final ApiClient _apiClient = ApiClient();

  /// Get all payments for the current tenant
  Future<List<Payment>> getPayments() async {
    try {
      final data = await _apiClient.getList(AppConstants.paymentsEndpoint);
      final payments = <Payment>[];
      for (final item in data) {
        if (item is Map<String, dynamic>) {
          payments.add(Payment.fromJson(item));
        }
      }
      payments.sort((a, b) => b.dueDate.compareTo(a.dueDate));
      return payments;
    } catch (e) {
      throw Exception('Failed to load payments: $e');
    }
  }

  /// Get payment cards data:
  /// - paid history
  /// - upcoming payment for next month only
  Future<PaymentOverview> getPaymentOverview() async {
    try {
      final data = await _apiClient.get(
        '${AppConstants.paymentsEndpoint}/overview',
      );
      final paidRaw = data['paid'];
      final upcomingRaw = data['upcoming_next_month'];
      final meta = data['meta'];

      final paidPayments = <Payment>[];
      if (paidRaw is List) {
        for (final item in paidRaw) {
          if (item is Map<String, dynamic>) {
            paidPayments.add(Payment.fromJson(item));
          }
        }
      }
      paidPayments.sort((a, b) => b.dueDate.compareTo(a.dueDate));

      Payment? upcoming;
      if (upcomingRaw is Map<String, dynamic>) {
        upcoming = Payment.fromJson(upcomingRaw);
      }

      return PaymentOverview(
        paidPayments: paidPayments,
        upcomingNextMonth: upcoming,
        nextMonthLabel: meta is Map<String, dynamic>
            ? meta['next_month']?.toString()
            : null,
      );
    } catch (e) {
      throw Exception('Failed to load payment overview: $e');
    }
  }

  /// Create a targeted payment for a specific contract/property.
  Future<ManualPaymentResult> createManualPayment({
    required String contractId,
    required int monthsCount,
    required DateTime paymentDate,
    required DateTime coverageStartDate,
    required double amountPaid,
    String paymentMethod = 'bank_transfer',
    Uint8List? proofBytes,
    String? proofMimeType,
    String? proofFileName,
  }) async {
    try {
      final created = await _apiClient.post(
        '${AppConstants.paymentsEndpoint}/manual',
        body: {
          'contract_id': contractId,
          'months_count': monthsCount,
          'payment_date': paymentDate.toIso8601String(),
          'coverage_start_date': coverageStartDate.toIso8601String(),
          'amount_paid': amountPaid,
          'payment_method': paymentMethod,
        },
      );
      final paymentId = created['id']?.toString();
      if (paymentId != null && paymentId.isNotEmpty) {
        await _apiClient.put(
          '${AppConstants.paymentsEndpoint}/$paymentId',
          body: {
            'status': 'pending',
            'payment_method': paymentMethod,
            'payment_date': paymentDate.toIso8601String().split('T').first,
          },
        );
      }
      if (paymentId != null &&
          paymentId.isNotEmpty &&
          proofBytes != null &&
          proofBytes.isNotEmpty) {
        await _apiClient.uploadFile(
          '${AppConstants.paymentsEndpoint}/$paymentId/proof',
          bytes: proofBytes,
          filename: proofFileName ?? 'proof.jpg',
          mimeType: proofMimeType ?? 'image/jpeg',
        );
      }
      return ManualPaymentResult(success: true);
    } catch (e) {
      debugPrint('Manual payment creation error: $e');
      return ManualPaymentResult(
        success: false,
        errorMessage: _friendlyManualPaymentError(e),
      );
    }
  }

  /// Submit payment proof or mark payment as pending
  Future<bool> makePayment(
    String paymentId, {
    String paymentMethod = 'bank_transfer',
    Uint8List? proofBytes,
    String? proofMimeType,
    String? proofFileName,
  }) async {
    try {
      await _apiClient.put(
        '${AppConstants.paymentsEndpoint}/$paymentId',
        body: {
          'status': 'pending',
          'payment_method': paymentMethod,
          'payment_date': DateTime.now().toIso8601String().split('T').first,
        },
      );

      if (proofBytes != null && proofBytes.isNotEmpty) {
        await _apiClient.uploadFile(
          '${AppConstants.paymentsEndpoint}/$paymentId/proof',
          bytes: proofBytes,
          filename: proofFileName ?? 'proof.jpg',
          mimeType: proofMimeType ?? 'image/jpeg',
        );
      }
      return true;
    } catch (e) {
      debugPrint('Payment error: $e');
      return false;
    }
  }

  Future<bool> deletePayment(String paymentId) async {
    try {
      await _apiClient.delete('${AppConstants.paymentsEndpoint}/$paymentId');
      return true;
    } catch (e) {
      debugPrint('Delete payment error: $e');
      return false;
    }
  }
}

class ManualPaymentResult {
  final bool success;
  final String? errorMessage;

  const ManualPaymentResult({required this.success, this.errorMessage});
}

String _friendlyManualPaymentError(Object error) {
  final raw = error.toString();
  final lower = raw.toLowerCase();

  if (lower.contains('next month') ||
      lower.contains('mois prochain') ||
      lower.contains('paiement manuel autorise uniquement')) {
    return 'Le paiement manuel est autorise uniquement pour le mois prochain.';
  }
  if (lower.contains('no active contract') ||
      lower.contains('aucun contrat actif')) {
    return 'Aucun contrat actif trouve pour ce compte.';
  }
  if (lower.contains('contrat cible est requis') ||
      lower.contains('contract_id is required')) {
    return 'Selectionnez la maison/contrat a payer puis reessayez.';
  }
  if (lower.contains('nombre de mois') || lower.contains('months_count')) {
    return 'Nombre de mois invalide.';
  }
  if (lower.contains('montant verse') || lower.contains('amount_paid')) {
    return 'Somme versee invalide.';
  }
  if (lower.contains('already exists') ||
      lower.contains('existe deja') ||
      lower.contains('conflit detecte')) {
    return 'Un paiement existe deja pour cette periode.';
  }
  if (lower.contains('permission denied') ||
      lower.contains('action bloquee') ||
      lower.contains('rls')) {
    return 'Permission refusee. Verifiez la policy RLS des paiements.';
  }
  if (lower.contains('montant invalide') || lower.contains('invalid payment amount')) {
    return 'Montant invalide. Saisissez un montant superieur a zero.';
  }
  if (lower.contains('session') && lower.contains('expire')) {
    return 'Session expiree. Reconnectez-vous puis reessayez.';
  }
  if (raw.trim().isNotEmpty) {
    return raw.replaceAll('ApiException: ', '').trim();
  }
  return 'Creation impossible du paiement manuel.';
}
