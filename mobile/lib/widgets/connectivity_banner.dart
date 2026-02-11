import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/services/connectivity_service.dart';

class ConnectivityBanner extends ConsumerWidget {
  const ConnectivityBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connectivityAsync = ref.watch(connectivityStatusProvider);
    final isOffline = connectivityAsync.when(
      data: (connected) => !connected,
      loading: () => false,
      error: (_, __) => false,
    );

    if (!isOffline) return const SizedBox.shrink();

    return Material(
      child: Container(
        width: double.infinity,
        color: Colors.orange,
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
        child: const Row(
          children: [
            Icon(Icons.cloud_off, color: Colors.white, size: 20),
            SizedBox(width: 8),
            Text(
              'Mode hors ligne - Données locales uniquement',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
