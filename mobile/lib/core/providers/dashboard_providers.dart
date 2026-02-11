import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models.dart';
import '../database/database_helper.dart';
import '../services/connectivity_service.dart';
import '../../home/dashboard_service.dart';

/// Dashboard service provider
final dashboardServiceProvider = Provider<DashboardService>((ref) {
  return DashboardService();
});

/// Dashboard data provider with offline support
final dashboardDataProvider = FutureProvider.autoDispose<DashboardData>((ref) async {
  final dashboardService = ref.watch(dashboardServiceProvider);
  final dbHelper = ref.watch(databaseHelperProvider);
  final connectivityService = ref.watch(connectivityServiceProvider);

  final isConnected = await connectivityService.isConnected();

  if (isConnected) {
    try {
      // Fetch from API
      final data = await dashboardService.getDashboardData();

      // Save to local database
      await dbHelper.insertTenant(data.tenant);
      await dbHelper.insertProperty(data.property);
      await dbHelper.insertPayments(data.upcomingPayments);
      await dbHelper.updateSyncMetadata('dashboard', DateTime.now());

      return data;
    } catch (e) {
      // If API fails, fallback to local database
      return await _loadFromDatabase(dbHelper);
    }
  } else {
    // Offline mode: load from local database
    return await _loadFromDatabase(dbHelper);
  }
});

Future<DashboardData> _loadFromDatabase(DatabaseHelper dbHelper) async {
  final tenant = await dbHelper.getTenant();
  final property = await dbHelper.getProperty();
  final payments = await dbHelper.getPayments();

  // Get pending maintenance count from database
  final maintenanceRequests = await dbHelper.getMaintenanceRequests();
  final pendingCount = maintenanceRequests
      .where((r) => r.status == 'pending' || r.status == 'reported')
      .length;

  return DashboardData(
    tenant: tenant ?? Tenant.empty(),
    property: property ?? Property.empty(),
    upcomingPayments: payments.take(3).toList(),
    pendingMaintenanceRequests: pendingCount,
  );
}

/// Provider to refresh dashboard
final refreshDashboardProvider = Provider<Future<void> Function()>((ref) {
  return () async {
    ref.invalidate(dashboardDataProvider);
  };
});
