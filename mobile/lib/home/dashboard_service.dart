import '../core/api_client.dart';
import '../core/constants.dart';
import '../core/models.dart';

/// Service for handling dashboard-related API calls
class DashboardService {
  final ApiClient _apiClient = ApiClient();

  /// Get dashboard data including tenant info, property, and payments
  Future<DashboardData> getDashboardData() async {
    try {
      final tenant = await _fetchTenant();
      final contracts = await _apiClient.getList(AppConstants.contractsEndpoint);
      final contract = _findContractForTenant(contracts, tenant.id);

      final property = await _fetchProperty(contract);
      final payments =
          await _fetchPayments(contractId: contract?['id']?.toString());
      final maintenance = await _fetchMaintenance(
        propertyId: property.id.isEmpty ? null : property.id,
      );

      payments.sort((a, b) => a.dueDate.compareTo(b.dueDate));
      final pendingMaintenanceRequests = maintenance
          .where((r) =>
              r.status == 'pending' ||
              r.status == 'reported' ||
              r.status == 'in_progress')
          .length;

      return DashboardData(
        tenant: tenant,
        property: property,
        upcomingPayments: payments,
        pendingMaintenanceRequests: pendingMaintenanceRequests,
      );
    } catch (e) {
      throw Exception('Failed to load dashboard data: $e');
    }
  }

  Future<Tenant> _fetchTenant() async {
    try {
      final data = await _apiClient.get(AppConstants.tenantProfileEndpoint);
      return Tenant.fromJson(data);
    } catch (_) {
      final data = await _apiClient.get(AppConstants.profileEndpoint);
      return Tenant.fromJson(data);
    }
  }

  Map<String, dynamic>? _findContractForTenant(
    List<dynamic> contracts,
    String tenantId,
  ) {
    for (final item in contracts) {
      if (item is Map<String, dynamic>) {
        if (item['tenant_id']?.toString() == tenantId) {
          return item;
        }
      }
    }
    return null;
  }

  Future<Property> _fetchProperty(Map<String, dynamic>? contract) async {
    if (contract != null && contract['property_id'] != null) {
      final propertyId = contract['property_id'].toString();
      final data =
          await _apiClient.get('${AppConstants.propertiesEndpoint}/$propertyId');
      final property = Property.fromJson(data);
      final rent = _toDouble(contract['monthly_rent'] ?? contract['monthlyRent']);
      if (rent > 0 && property.monthlyRent == 0) {
        return Property(
          id: property.id,
          address: property.address,
          city: property.city,
          postalCode: property.postalCode,
          monthlyRent: rent,
          surface: property.surface,
          rooms: property.rooms,
          photos: property.photos,
        );
      }
      return property;
    }

    final properties = await _apiClient.getList(AppConstants.propertiesEndpoint);
    if (properties.isNotEmpty && properties.first is Map<String, dynamic>) {
      return Property.fromJson(properties.first as Map<String, dynamic>);
    }
    return Property(
      id: '',
      address: '',
      city: '',
      postalCode: '',
      monthlyRent: 0,
      surface: 0,
      rooms: 0,
      photos: const [],
    );
  }

  Future<List<Payment>> _fetchPayments({String? contractId}) async {
    final data = await _apiClient.getList(AppConstants.paymentsEndpoint);
    final payments = <Payment>[];
    for (final item in data) {
      if (item is Map<String, dynamic>) {
        if (contractId == null ||
            item['contract_id']?.toString() == contractId) {
          payments.add(Payment.fromJson(item));
        }
      }
    }
    return payments;
  }

  Future<List<MaintenanceRequest>> _fetchMaintenance({String? propertyId}) async {
    final data = await _apiClient.getList(AppConstants.maintenanceEndpoint);
    final requests = <MaintenanceRequest>[];
    for (final item in data) {
      if (item is Map<String, dynamic>) {
        if (propertyId == null ||
            item['property_id']?.toString() == propertyId) {
          requests.add(MaintenanceRequest.fromJson(item));
        }
      }
    }
    return requests;
  }

  double _toDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0;
    return 0;
  }
}
