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

  /// Create a manual payment entry for a future month.
  Future<bool> createManualPayment({
    required DateTime dueMonth,
    required double amount,
  }) async {
    try {
      final dueDate = DateTime(dueMonth.year, dueMonth.month, 1);
      await _apiClient.post(
        '${AppConstants.paymentsEndpoint}/manual',
        body: {'amount': amount, 'due_date': dueDate.toIso8601String()},
      );
      return true;
    } catch (e) {
      debugPrint('Manual payment creation error: $e');
      return false;
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
