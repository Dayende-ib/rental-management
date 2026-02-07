import '../core/api_client.dart';
import '../core/constants.dart';
import '../core/models.dart';

/// Service for handling payment-related API calls
class PaymentService {
  final ApiClient _apiClient = ApiClient();

  /// Get all payments for the current tenant
  Future<List<Payment>> getPayments() async {
    try {
      final contractIds = await _resolveContractIds();
      final data = await _apiClient.getList(AppConstants.paymentsEndpoint);
      final payments = <Payment>[];
      for (final item in data) {
        if (item is Map<String, dynamic>) {
          if (contractIds.isEmpty ||
              contractIds.contains(item['contract_id']?.toString())) {
            payments.add(Payment.fromJson(item));
          }
        }
      }
      payments.sort((a, b) => b.dueDate.compareTo(a.dueDate));
      return payments;
    } catch (e) {
      throw Exception('Failed to load payments: $e');
    }
  }

  /// Submit payment proof or mark payment as pending
  Future<bool> makePayment(
    String paymentId, {
    String? proofBase64,
    String? proofMimeType,
  }) async {
    try {
      await _apiClient.put(
        '${AppConstants.paymentsEndpoint}/$paymentId',
        body: {
          'status': 'pending',
          'payment_date': DateTime.now().toIso8601String().split('T').first,
        },
      );

      if (proofBase64 != null && proofBase64.isNotEmpty) {
        await _apiClient.post(
          '${AppConstants.paymentsEndpoint}/$paymentId/proof',
          body: {
            'imageBase64': proofBase64,
            'mimeType': proofMimeType ?? 'image/jpeg',
          },
        );
      }
      return true;
    } catch (e) {
      print('Payment error: $e');
      return false;
    }
  }

  Future<Set<String>> _resolveContractIds() async {
    try {
      final tenant = await _apiClient.get(AppConstants.tenantProfileEndpoint);
      final tenantId = tenant['id']?.toString();
      if (tenantId == null || tenantId.isEmpty) return {};

      final contracts = await _apiClient.getList(AppConstants.contractsEndpoint);
      final ids = <String>{};
      for (final item in contracts) {
        if (item is Map<String, dynamic> &&
            item['tenant_id']?.toString() == tenantId &&
            item['id'] != null) {
          ids.add(item['id'].toString());
        }
      }
      return ids;
    } catch (_) {
      return {};
    }
  }
}
