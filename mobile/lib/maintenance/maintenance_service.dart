import '../core/api_client.dart';
import '../core/models.dart';

/// Service for handling maintenance request API calls (DEMO MODE)
class MaintenanceService {
  final ApiClient _apiClient = ApiClient();

  /// Get all maintenance requests for the current tenant (DEMO MODE)
  Future<List<MaintenanceRequest>> getMaintenanceRequests() async {
    try {
      // DEMO MODE - Return fake data
      await Future.delayed(const Duration(milliseconds: 700)); // Simulate network delay
      
      final requests = [
        MaintenanceRequest(
          id: 'maint_001',
          description: 'Fuite d\'eau sous l\'évier de la cuisine',
          status: 'pending',
          createdAt: DateTime(2024, 1, 15, 10, 30),
        ),
        MaintenanceRequest(
          id: 'maint_002',
          description: 'Prise électrique défectueuse dans le salon',
          status: 'in_progress',
          createdAt: DateTime(2024, 1, 10, 9, 15),
          updatedAt: DateTime(2024, 1, 16, 14, 20),
        ),
        MaintenanceRequest(
          id: 'maint_003',
          description: 'Remplacement de l\'ampoule grillée dans la chambre',
          status: 'completed',
          createdAt: DateTime(2024, 1, 5, 16, 45),
          updatedAt: DateTime(2024, 1, 8, 11, 30),
        ),
        MaintenanceRequest(
          id: 'maint_004',
          description: 'Nettoyage des gouttières',
          status: 'completed',
          createdAt: DateTime(2023, 12, 20, 14, 15),
          updatedAt: DateTime(2023, 12, 22, 9, 0),
        ),
      ];
      
      // Sort by creation date (newest first)
      requests.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return requests;
    } catch (e) {
      throw Exception('Failed to load maintenance requests: $e');
    }
  }

  /// Create a new maintenance request (DEMO MODE)
  Future<bool> createMaintenanceRequest(String description) async {
    try {
      // DEMO MODE - Always succeed after delay
      await Future.delayed(const Duration(milliseconds: 1200));
      return true;
    } catch (e) {
      print('Maintenance request error: $e');
      return false;
    }
  }
}