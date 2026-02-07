import '../core/api_client.dart';
import '../core/models.dart';

/// Service for handling payment-related API calls (DEMO MODE)
class PaymentService {
  final ApiClient _apiClient = ApiClient();
  List<Payment>? _cache;

  /// Get all payments for the current tenant (DEMO MODE)
  Future<List<Payment>> getPayments() async {
    try {
      await Future.delayed(const Duration(milliseconds: 400));

      _cache ??= [
        Payment(
          id: 'pay_001',
          month: 'Janvier 2024',
          amount: 450000.00,
          status: 'paid',
          dueDate: DateTime(2024, 1, 5),
          paidDate: DateTime(2024, 1, 3),
          validationStatus: 'validated',
        ),
        Payment(
          id: 'pay_002',
          month: 'Février 2024',
          amount: 450000.00,
          status: 'unpaid',
          dueDate: DateTime(2024, 2, 5),
          validationStatus: 'pending',
        ),
        Payment(
          id: 'pay_003',
          month: 'Mars 2024',
          amount: 450000.00,
          status: 'unpaid',
          dueDate: DateTime(2024, 3, 5),
          validationStatus: 'not_submitted',
        ),
        Payment(
          id: 'pay_004',
          month: 'Avril 2024',
          amount: 450000.00,
          status: 'unpaid',
          dueDate: DateTime(2024, 4, 5),
          validationStatus: 'rejected',
        ),
      ];

      _cache!.sort((a, b) => b.dueDate.compareTo(a.dueDate));
      return List<Payment>.from(_cache!);
    } catch (e) {
      throw Exception('Failed to load payments: $e');
    }
  }

  /// Simulate payment for a specific payment (DEMO MODE)
  Future<bool> makePayment(String paymentId, {String? proofBase64}) async {
    try {
      await Future.delayed(const Duration(milliseconds: 800));
      _cache = _cache?.map((p) {
        if (p.id == paymentId) {
          return Payment(
            id: p.id,
            month: p.month,
            amount: p.amount,
            status: p.status,
            dueDate: p.dueDate,
            paidDate: DateTime.now(),
            validationStatus: 'pending',
          );
        }
        return p;
      }).toList();
      // DEMO: send to API (commented)
      // await _apiClient.post('/payments/$paymentId/proof', body: {
      //   'proof': proofBase64,
      // });
      return true;
    } catch (e) {
      print('Payment error: $e');
      return false;
    }
  }
}
