import '../core/api_client.dart';
import '../core/models.dart';

/// Service for handling dashboard-related API calls (DEMO MODE)
class DashboardService {
  final ApiClient _apiClient = ApiClient();

  /// Get dashboard data including tenant info, property, and payments (DEMO MODE)
  Future<DashboardData> getDashboardData() async {
    try {
      // DEMO MODE - Return fake data
      await Future.delayed(const Duration(milliseconds: 800)); // Simulate network delay
      
      final tenant = Tenant(
        id: 'demo_user_123',
        name: 'Awa Sawadogo',
        email: 'awa.sawadogo@example.com',
        phone: '+226 70 12 34 56',
      );
      
      final property = Property(
        id: 'prop_456',
        address: '01 BP 1234, Quartier Koulouba',
        city: 'Ouagadougou',
        postalCode: 'BF-1100',
        monthlyRent: 450000.00, // FCFA
      );
      
      final payments = [
        Payment(
          id: 'pay_001',
          month: 'Janvier 2024',
          amount: 1200.00,
          status: 'paid',
          dueDate: DateTime(2024, 1, 5),
          paidDate: DateTime(2024, 1, 3),
        ),
        Payment(
          id: 'pay_002',
          month: 'Février 2024',
          amount: 1200.00,
          status: 'unpaid',
          dueDate: DateTime(2024, 2, 5),
        ),
        Payment(
          id: 'pay_003',
          month: 'Mars 2024',
          amount: 1200.00,
          status: 'unpaid',
          dueDate: DateTime(2024, 3, 5),
        ),
      ];
      
      return DashboardData(
        tenant: tenant,
        property: property,
        upcomingPayments: payments,
        pendingMaintenanceRequests: 2,
      );
    } catch (e) {
      throw Exception('Failed to load dashboard data: $e');
    }
  }
}
