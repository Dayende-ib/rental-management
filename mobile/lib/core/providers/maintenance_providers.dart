import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models.dart';
import '../database/database_helper.dart';
import '../services/connectivity_service.dart';
import '../../maintenance/maintenance_service.dart';

/// Maintenance service provider
final maintenanceServiceProvider = Provider<MaintenanceService>((ref) {
  return MaintenanceService();
});

/// Maintenance requests provider with offline support
final maintenanceRequestsProvider = FutureProvider<List<MaintenanceRequest>>((
  ref,
) async {
  final maintenanceService = ref.watch(maintenanceServiceProvider);
  final dbHelper = ref.watch(databaseHelperProvider);
  final connectivityService = ref.watch(connectivityServiceProvider);

  final isConnected = await connectivityService.isConnected();

  if (isConnected) {
    try {
      // Fetch from API
      final requests = await maintenanceService.getMaintenanceRequests();

      // Save to local database
      await dbHelper.insertMaintenanceRequests(requests);
      await dbHelper.updateSyncMetadata('maintenance', DateTime.now());

      return requests;
    } catch (e) {
      // If API fails, fallback to local database
      return await dbHelper.getMaintenanceRequests();
    }
  } else {
    // Offline mode: load from local database
    return await dbHelper.getMaintenanceRequests();
  }
});

/// Provider to refresh maintenance requests
final refreshMaintenanceProvider = Provider<Future<void> Function()>((ref) {
  return () async {
    ref.invalidate(maintenanceRequestsProvider);
  };
});

/// Maintenance statistics provider
final maintenanceStatsProvider = Provider<MaintenanceStats>((ref) {
  final requestsAsync = ref.watch(maintenanceRequestsProvider);

  return requestsAsync.when(
    data: (requests) {
      final pending = requests
          .where((r) => r.status == 'pending' || r.status == 'reported')
          .length;
      final inProgress = requests
          .where((r) => r.status == 'in_progress')
          .length;
      final completed = requests.where((r) => r.status == 'completed').length;
      final urgent = requests.where((r) => r.urgency == 'urgent').length;

      return MaintenanceStats(
        pendingCount: pending,
        inProgressCount: inProgress,
        completedCount: completed,
        urgentCount: urgent,
      );
    },
    loading: () => MaintenanceStats.empty(),
    error: (error, stackTrace) => MaintenanceStats.empty(),
  );
});

/// Maintenance stats model
class MaintenanceStats {
  final int pendingCount;
  final int inProgressCount;
  final int completedCount;
  final int urgentCount;

  MaintenanceStats({
    required this.pendingCount,
    required this.inProgressCount,
    required this.completedCount,
    required this.urgentCount,
  });

  factory MaintenanceStats.empty() {
    return MaintenanceStats(
      pendingCount: 0,
      inProgressCount: 0,
      completedCount: 0,
      urgentCount: 0,
    );
  }

  int get totalCount => pendingCount + inProgressCount + completedCount;
  int get activeCount => pendingCount + inProgressCount;
}
