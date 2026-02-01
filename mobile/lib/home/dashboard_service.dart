import '../core/api_client.dart';
import '../core/models.dart';
import '../core/constants.dart';

/// Service for handling dashboard-related API calls
class DashboardService {
  final ApiClient _apiClient = ApiClient();

  /// Get dashboard data including tenant info, property, and payments
  Future<DashboardData> getDashboardData() async {
    try {
      // Fetch tenant profile
      final tenantResponse = await _apiClient.get(AppConstants.tenantProfileEndpoint);
      final tenant = Tenant.fromJson(tenantResponse['data']);
      
      // Fetch property info (assuming it's in tenant response or separate endpoint)
      final property = Property.fromJson(tenantResponse['property'] ?? {});
      
      // Fetch upcoming payments
      final paymentsResponse = await _apiClient.get(AppConstants.paymentsEndpoint);
      final payments = (paymentsResponse['data'] as List)
          .map((item) => Payment.fromJson(item))
          .toList();
      
      // Count pending maintenance requests
      final maintenanceResponse = await _apiClient.get(AppConstants.maintenanceEndpoint);
      final maintenanceRequests = (maintenanceResponse['data'] as List)
          .map((item) => MaintenanceRequest.fromJson(item))
          .where((request) => request.status == 'pending')
          .toList();
      
      return DashboardData(
        tenant: tenant,
        property: property,
        upcomingPayments: payments.take(3).toList(), // Show only next 3 payments
        pendingMaintenanceRequests: maintenanceRequests.length,
      );
    } catch (e) {
      throw Exception('Failed to load dashboard data: $e');
    }
  }
}