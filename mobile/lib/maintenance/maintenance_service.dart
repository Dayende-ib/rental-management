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
      final data = await _apiClient.getList(AppConstants.maintenanceEndpoint);
      final requests = <MaintenanceRequest>[];
      for (final item in data) {
        if (item is Map<String, dynamic>) {
          requests.add(MaintenanceRequest.fromJson(item));
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
          'title': _buildTitle(description),
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
      // /mobile/contracts is already tenant-scoped by backend.
      final contracts = await _apiClient.getList(
        AppConstants.contractsEndpoint,
      );
      if (contracts.isNotEmpty) {
        // Prioritize active contracts, then pending/draft.
        final ranked = contracts.whereType<Map<String, dynamic>>().toList()
          ..sort((a, b) => _contractRank(a).compareTo(_contractRank(b)));
        for (final item in ranked) {
          final propertyId = item['property_id']?.toString();
          if (propertyId != null && propertyId.isNotEmpty) {
            return propertyId;
          }
        }
      }
    } catch (_) {}

    // Do not fallback to random available property; maintenance must target user's own property.
    return null;
  }

  int _contractRank(Map<String, dynamic> contract) {
    final status = (contract['status'] ?? '').toString().toLowerCase();
    switch (status) {
      case 'active':
        return 0;
      case 'pending':
        return 1;
      case 'draft':
        return 2;
      default:
        return 9;
    }
  }

  String _buildTitle(String description) {
    final raw = description.trim();
    if (raw.isEmpty) return 'Maintenance request';
    if (raw.length <= 80) return raw;
    return '${raw.substring(0, 77)}...';
  }
}
