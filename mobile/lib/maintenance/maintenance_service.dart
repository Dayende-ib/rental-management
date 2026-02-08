import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import '../core/constants.dart';
import '../core/models.dart';

/// Service for handling maintenance request API calls
class MaintenanceService {
  final ApiClient _apiClient = ApiClient();

  /// Get all maintenance requests for the current tenant
  Future<List<MaintenanceRequest>> getMaintenanceRequests() async {
    try {
      final propertyId = await _resolvePropertyId();
      final data = await _apiClient.getList(AppConstants.maintenanceEndpoint);
      final requests = <MaintenanceRequest>[];
      for (final item in data) {
        if (item is Map<String, dynamic>) {
          if (propertyId == null || propertyId.isEmpty ||
              item['property_id']?.toString() == propertyId) {
            requests.add(MaintenanceRequest.fromJson(item));
          }
        }
      }
      requests.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return requests;
    } catch (e) {
      throw Exception('Failed to load maintenance requests: $e');
    }
  }

  /// Create a new maintenance request
  Future<bool> createMaintenanceRequest(String description) async {
    try {
      final propertyId = await _resolvePropertyId();
      if (propertyId == null || propertyId.isEmpty) {
        throw Exception('Aucune propriete disponible');
      }

      await _apiClient.post(
        AppConstants.maintenanceEndpoint,
        body: {
          'property_id': propertyId,
          'description': description,
        },
      );
      return true;
    } catch (e) {
      debugPrint('Maintenance request error: $e');
      return false;
    }
  }

  Future<String?> _resolvePropertyId() async {
    try {
      final tenant = await _apiClient.get(AppConstants.tenantProfileEndpoint);
      final tenantId = tenant['id']?.toString();
      if (tenantId != null && tenantId.isNotEmpty) {
        final contracts =
            await _apiClient.getList(AppConstants.contractsEndpoint);
        for (final item in contracts) {
          if (item is Map<String, dynamic> &&
              item['tenant_id']?.toString() == tenantId) {
            return item['property_id']?.toString();
          }
        }
      }
    } catch (_) {}

    final properties = await _apiClient.getList(AppConstants.propertiesEndpoint);
    if (properties.isNotEmpty && properties.first is Map<String, dynamic>) {
      return (properties.first as Map<String, dynamic>)['id']?.toString();
    }
    return null;
  }
}
