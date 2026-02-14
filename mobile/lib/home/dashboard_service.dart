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
      final contracts = await _apiClient.getList(
        AppConstants.contractsEndpoint,
      );
      final contract = _findContractForTenant(contracts, tenant.id);

      final property = await _fetchProperty(contract);
      final payments = await _fetchPayments(
        contractId: contract?['id']?.toString(),
      );
      final maintenance = await _fetchMaintenance(
        propertyId: property.id.isEmpty ? null : property.id,
      );

      payments.sort((a, b) => a.dueDate.compareTo(b.dueDate));
      final pendingMaintenanceRequests = maintenance
          .where(
            (r) =>
                r.status == 'pending' ||
                r.status == 'reported' ||
                r.status == 'in_progress',
          )
          .length;

      return DashboardData(
        tenant: tenant,
        property: property,
        contractId: (contract?['id'] ?? '').toString(),
        contractStatus: (contract?['status'] ?? '').toString(),
        contractSignedByTenant: (contract?['signed_by_tenant'] ?? false) == true,
        contractSignedByLandlord:
            (contract?['signed_by_landlord'] ?? false) == true,
        upcomingPayments: payments,
        pendingMaintenanceRequests: pendingMaintenanceRequests,
      );
    } catch (e) {
      throw Exception('Failed to load dashboard data: $e');
    }
  }

  Future<Tenant> _fetchTenant() async {
    try {
      final tenantData = await _apiClient.get(
        AppConstants.tenantProfileEndpoint,
      );
      try {
        final profileData = await _apiClient.get(AppConstants.profileEndpoint);
        final merged = <String, dynamic>{...profileData, ...tenantData};
        final tenantName = (tenantData['full_name'] ?? tenantData['name'] ?? '')
            .toString()
            .trim();
        if (tenantName.isEmpty) {
          final profileName =
              (profileData['full_name'] ?? profileData['name'] ?? '')
                  .toString()
                  .trim();
          if (profileName.isNotEmpty) {
            merged['full_name'] = profileName;
          }
        }
        return Tenant.fromJson(merged);
      } catch (_) {
        return Tenant.fromJson(tenantData);
      }
    } catch (_) {
      final data = await _apiClient.get(AppConstants.profileEndpoint);
      return Tenant.fromJson(data);
    }
  }

  Map<String, dynamic>? _findContractForTenant(
    List<dynamic> contracts,
    String tenantId,
  ) {
    final matched = <Map<String, dynamic>>[];
    for (final item in contracts) {
      if (item is Map<String, dynamic> &&
          item['tenant_id']?.toString() == tenantId) {
        matched.add(item);
      }
    }
    if (matched.isEmpty) return null;
    matched.sort((a, b) {
      final pa = _contractStatusPriority(a['status']);
      final pb = _contractStatusPriority(b['status']);
      if (pa != pb) return pa.compareTo(pb);
      final da = _parseDateValue(a['updated_at'] ?? a['created_at']);
      final db = _parseDateValue(b['updated_at'] ?? b['created_at']);
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return db.compareTo(da);
    });
    return matched.first;
  }

  int _contractStatusPriority(dynamic value) {
    final status = value?.toString().toLowerCase() ?? '';
    switch (status) {
      case 'active':
        return 0;
      case 'draft':
      case 'pending':
      case 'signed':
      case 'requested':
      case 'submitted':
      case 'awaiting_approval':
      case 'under_review':
        return 1;
      case 'terminated':
      case 'cancelled':
      case 'expired':
        return 3;
      default:
        return 2;
    }
  }

  Future<Property> _fetchProperty(Map<String, dynamic>? contract) async {
    if (contract != null && contract['property_id'] != null) {
      final propertyId = contract['property_id'].toString();
      final mineData = await _apiClient.getList(
        '${AppConstants.propertiesEndpoint}?scope=mine',
      );
      Property? property;
      for (final item in mineData) {
        if (item is Map<String, dynamic> &&
            item['id']?.toString() == propertyId) {
          property = Property.fromJson(item);
          break;
        }
      }

      property ??= Property(
        id: propertyId,
        title: _stringOrEmpty(
          contract['properties']?['title'] ?? contract['title'],
        ),
        address: _stringOrEmpty(
          contract['properties']?['address'] ??
              contract['properties']?['location'] ??
              contract['address'] ??
              contract['title'],
        ),
        city: _stringOrEmpty(
          contract['properties']?['city'] ??
              contract['properties']?['town'] ??
              contract['properties']?['commune'] ??
              contract['city'],
        ),
        postalCode: _stringOrEmpty(
          contract['properties']?['postal_code'] ??
              contract['properties']?['postalCode'] ??
              contract['properties']?['zip_code'] ??
              contract['postal_code'],
        ),
        monthlyRent: 0,
      );
      if (property.address.isEmpty ||
          property.city.isEmpty ||
          property.postalCode.isEmpty) {
        final fallbackAddress = _stringOrEmpty(
          contract['properties']?['address'] ??
              contract['properties']?['location'] ??
              contract['address'] ??
              contract['title'],
        );
        final fallbackCity = _stringOrEmpty(
          contract['properties']?['city'] ??
              contract['properties']?['town'] ??
              contract['properties']?['commune'] ??
              contract['city'],
        );
        final fallbackPostal = _stringOrEmpty(
          contract['properties']?['postal_code'] ??
              contract['properties']?['postalCode'] ??
              contract['properties']?['zip_code'] ??
              contract['postal_code'],
        );
        property = Property(
          id: property.id,
          title: property.title,
          address: property.address.isNotEmpty ? property.address : fallbackAddress,
          city: property.city.isNotEmpty ? property.city : fallbackCity,
          postalCode: property.postalCode.isNotEmpty
              ? property.postalCode
              : fallbackPostal,
          monthlyRent: property.monthlyRent,
          surface: property.surface,
          rooms: property.rooms,
          photos: property.photos,
        );
      }
      final rent = _toDouble(
        contract['monthly_rent'] ?? contract['monthlyRent'],
      );
      if (rent > 0 && property.monthlyRent == 0) {
        return Property(
          id: property.id,
          title: property.title,
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

    // If no contract is found, do NOT fetch random properties.
    // Return an empty property so the dashboard shows "No property" state.
    return Property(
      id: '',
      title: '',
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

  Future<List<MaintenanceRequest>> _fetchMaintenance({
    String? propertyId,
  }) async {
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

  DateTime? _parseDateValue(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String) return DateTime.tryParse(value);
    return null;
  }

  String _stringOrEmpty(dynamic value) {
    return value == null ? '' : value.toString().trim();
  }
}
