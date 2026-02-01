import '../core/api_client.dart';
import '../core/models.dart';
import '../core/constants.dart';

/// Service for handling payment-related API calls
class PaymentService {
  final ApiClient _apiClient = ApiClient();

  /// Get all payments for the current tenant
  Future<List<Payment>> getPayments() async {
    try {
      final response = await _apiClient.get(AppConstants.paymentsEndpoint);
      final payments = (response['data'] as List)
          .map((item) => Payment.fromJson(item))
          .toList();
      
      // Sort by due date (most recent first)
      payments.sort((a, b) => b.dueDate.compareTo(a.dueDate));
      return payments;
    } catch (e) {
      throw Exception('Failed to load payments: $e');
    }
  }

  /// Simulate payment for a specific payment
  Future<bool> makePayment(String paymentId) async {
    try {
      // In a real app, this would call a payment processing API
      // For this demo, we'll just update the payment status
      await _apiClient.post(
        '${AppConstants.paymentsEndpoint}/$paymentId/pay',
        body: {'status': 'paid'},
      );
      return true;
    } catch (e) {
      print('Payment error: $e');
      return false;
    }
  }
}