import '../core/api_client.dart';
import '../core/models.dart';
import '../core/constants.dart';

/// Service for handling maintenance request API calls
class MaintenanceService {
  final ApiClient _apiClient = ApiClient();

  /// Get all maintenance requests for the current tenant
  Future<List<MaintenanceRequest>> getMaintenanceRequests() async {
    try {
      final response = await _apiClient.get(AppConstants.maintenanceEndpoint);
      final requests = (response['data'] as List)
          .map((item) => MaintenanceRequest.fromJson(item))
          .toList();
      
      // Sort by creation date (newest first)
      requests.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return requests;
    } catch (e) {
      throw Exception('Failed to load maintenance requests: $e');
    }
  }

  /// Create a new maintenance request
  Future<bool> createMaintenanceRequest(String description) async {
    try {
      await _apiClient.post(
        AppConstants.maintenanceEndpoint,
        body: {
          'description': description,
          'status': 'pending',
        },
      );
      return true;
    } catch (e) {
      print('Maintenance request error: $e');
      return false;
    }
  }
}