import '../core/api_client.dart';
import '../core/models.dart';

/// Service for handling payment-related API calls (DEMO MODE)
class PaymentService {
  final ApiClient _apiClient = ApiClient();

  /// Get all payments for the current tenant (DEMO MODE)
  Future<List<Payment>> getPayments() async {
    try {
      // DEMO MODE - Return fake data
      await Future.delayed(const Duration(milliseconds: 600)); // Simulate network delay
      
      final payments = [
        Payment(
          id: 'pay_001',
          month: 'Décembre 2023',
          amount: 1200.00,
          status: 'paid',
          dueDate: DateTime(2023, 12, 5),
          paidDate: DateTime(2023, 12, 3),
        ),
        Payment(
          id: 'pay_002',
          month: 'Novembre 2023',
          amount: 1200.00,
          status: 'paid',
          dueDate: DateTime(2023, 11, 5),
          paidDate: DateTime(2023, 11, 2),
        ),
        Payment(
          id: 'pay_003',
          month: 'Octobre 2023',
          amount: 1200.00,
          status: 'paid',
          dueDate: DateTime(2023, 10, 5),
          paidDate: DateTime(2023, 10, 4),
        ),
        Payment(
          id: 'pay_004',
          month: 'Septembre 2023',
          amount: 1200.00,
          status: 'paid',
          dueDate: DateTime(2023, 9, 5),
          paidDate: DateTime(2023, 9, 1),
        ),
        Payment(
          id: 'pay_005',
          month: 'Août 2023',
          amount: 1200.00,
          status: 'paid',
          dueDate: DateTime(2023, 8, 5),
          paidDate: DateTime(2023, 8, 3),
        ),
        Payment(
          id: 'pay_006',
          month: 'Juillet 2023',
          amount: 1200.00,
          status: 'paid',
          dueDate: DateTime(2023, 7, 5),
          paidDate: DateTime(2023, 7, 2),
        ),
        Payment(
          id: 'pay_007',
          month: 'Juin 2023',
          amount: 1200.00,
          status: 'paid',
          dueDate: DateTime(2023, 6, 5),
          paidDate: DateTime(2023, 6, 4),
        ),
        Payment(
          id: 'pay_008',
          month: 'Mai 2023',
          amount: 1200.00,
          status: 'paid',
          dueDate: DateTime(2023, 5, 5),
          paidDate: DateTime(2023, 5, 3),
        ),
        Payment(
          id: 'pay_009',
          month: 'Avril 2023',
          amount: 1200.00,
          status: 'paid',
          dueDate: DateTime(2023, 4, 5),
          paidDate: DateTime(2023, 4, 1),
        ),
        Payment(
          id: 'pay_010',
          month: 'Mars 2023',
          amount: 1200.00,
          status: 'paid',
          dueDate: DateTime(2023, 3, 5),
          paidDate: DateTime(2023, 3, 2),
        ),
        Payment(
          id: 'pay_011',
          month: 'Février 2023',
          amount: 1200.00,
          status: 'paid',
          dueDate: DateTime(2023, 2, 5),
          paidDate: DateTime(2023, 2, 4),
        ),
        Payment(
          id: 'pay_012',
          month: 'Janvier 2023',
          amount: 1200.00,
          status: 'paid',
          dueDate: DateTime(2023, 1, 5),
          paidDate: DateTime(2023, 1, 3),
        ),
      ];
      
      // Sort by due date (most recent first)
      payments.sort((a, b) => b.dueDate.compareTo(a.dueDate));
      return payments;
    } catch (e) {
      throw Exception('Failed to load payments: $e');
    }
  }

  /// Simulate payment for a specific payment (DEMO MODE)
  Future<bool> makePayment(String paymentId) async {
    try {
      // DEMO MODE - Always succeed after delay
      await Future.delayed(const Duration(milliseconds: 1000));
      return true;
    } catch (e) {
      print('Payment error: $e');
      return false;
    }
  }
}