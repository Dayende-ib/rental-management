import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:async';
import '../screens/home_screen.dart';
import '../screens/available_properties_screen.dart';
import '../screens/payments_screen.dart';
import '../screens/maintenance_list_screen.dart';
import '../screens/profile_screen.dart';
import '../core/providers/dashboard_providers.dart';
import '../core/providers/payment_providers.dart';
import '../core/providers/maintenance_providers.dart';
import '../core/services/realtime_sync_service.dart';

import '../widgets/connectivity_banner.dart';

/// Navigation state provider
final navigationIndexProvider = StateProvider<int>((ref) => 0);

/// Main navigation screen with bottom navigation bar
class MainNavigationScreen extends ConsumerStatefulWidget {
  const MainNavigationScreen({super.key});

  static const List<Widget> _screens = [
    HomeScreen(),
    AvailablePropertiesScreen(),
    PaymentsScreen(),
    MaintenanceListScreen(),
    ProfileScreen(),
  ];

  @override
  ConsumerState<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends ConsumerState<MainNavigationScreen> {
  StreamSubscription<RealtimeEvent>? _realtimeSubscription;
  Timer? _debounce;
  final Set<String> _pendingEntities = <String>{};

  @override
  void initState() {
    super.initState();
    RealtimeSyncService.instance.start();
    _realtimeSubscription = RealtimeSyncService.instance.stream.listen((event) {
      final entity = event.entity.toLowerCase();
      if (entity.isEmpty) return;
      _pendingEntities.add(entity);
      _debounce?.cancel();
      _debounce = Timer(const Duration(milliseconds: 250), _flushRealtimeUpdates);
    });
  }

  void _flushRealtimeUpdates() {
    if (!mounted) return;
    final entities = Set<String>.from(_pendingEntities);
    _pendingEntities.clear();

    if (entities.contains('system') ||
        entities.contains('properties') ||
        entities.contains('contracts') ||
        entities.contains('payments') ||
        entities.contains('maintenance') ||
        entities.contains('notifications')) {
      ref.invalidate(dashboardDataProvider);
      ref.invalidate(paymentsProvider);
      ref.invalidate(paymentOverviewProvider);
      ref.invalidate(maintenanceRequestsProvider);
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _realtimeSubscription?.cancel();
    RealtimeSyncService.instance.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = ref.watch(navigationIndexProvider);

    return Scaffold(
      body: Column(
        children: [
          const ConnectivityBanner(),
          Expanded(
            child: IndexedStack(index: currentIndex, children: MainNavigationScreen._screens),
          ),
        ],
      ),

      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: currentIndex,
        onTap: (index) {
          ref.read(navigationIndexProvider.notifier).state = index;
        },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Accueil'),
          BottomNavigationBarItem(icon: Icon(Icons.search), label: 'Louer'),
          BottomNavigationBarItem(
            icon: Icon(Icons.payment),
            label: 'Paiements',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.build),
            label: 'Maintenance',
          ),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profil'),
        ],
      ),
    );
  }
}
