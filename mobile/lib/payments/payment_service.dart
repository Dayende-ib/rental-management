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

  /// Create a manual payment entry for a future month.
  Future<ManualPaymentResult> createManualPayment({
    required DateTime dueMonth,
    required double amount,
    Uint8List? proofBytes,
    String? proofMimeType,
    String? proofFileName,
  }) async {
    try {
      final dueDate = DateTime(dueMonth.year, dueMonth.month, 1);
      final created = await _apiClient.post(
        '${AppConstants.paymentsEndpoint}/manual',
        body: {'amount': amount, 'due_date': dueDate.toIso8601String()},
      );
      final paymentId = created['id']?.toString();
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
    Uint8List? proofBytes,
    String? proofMimeType,
    String? proofFileName,
  }) async {
    try {
      await _apiClient.put(
        '${AppConstants.paymentsEndpoint}/$paymentId',
        body: {
          'status': 'pending',
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
}

class ManualPaymentResult {
  final bool success;
  final String? errorMessage;

  const ManualPaymentResult({required this.success, this.errorMessage});
}

String _friendlyManualPaymentError(Object error) {
  final raw = error.toString();
  if (raw.contains('next month')) {
    return 'Le paiement manuel est autorise uniquement pour le mois prochain.';
  }
  if (raw.contains('No active contract')) {
    return 'Aucun contrat actif trouve pour ce compte.';
  }
  if (raw.contains('already exists')) {
    return 'Un paiement existe deja pour ce mois.';
  }
  if (raw.contains('Permission denied')) {
    return 'Permission refusee. Verifiez la policy RLS des paiements.';
  }
  return 'Creation impossible du paiement manuel.';
}
