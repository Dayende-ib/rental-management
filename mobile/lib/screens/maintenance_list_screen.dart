import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/models.dart';
import '../core/providers/maintenance_providers.dart';
import '../core/constants.dart';

/// Maintenance requests list screen
class MaintenanceListScreen extends ConsumerWidget {
  const MaintenanceListScreen({super.key});

  Future<void> _openCreateScreen(BuildContext context, WidgetRef ref) async {
    final created = await Navigator.pushNamed(context, '/create-maintenance');
    if (created == true) {
      ref.invalidate(maintenanceRequestsProvider);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final requestsAsync = ref.watch(maintenanceRequestsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes demandes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _openCreateScreen(context, ref),
          ),
        ],
      ),
      body: requestsAsync.when(
        data: (requests) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(maintenanceRequestsProvider);
          },
          child: requests.isEmpty
              ? _buildEmptyState(context, ref)
              : ListView.builder(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: EdgeInsets.all(AppConstants.defaultPadding),
                  itemCount: requests.length,
                  itemBuilder: (context, index) {
                    return _buildMaintenanceCard(context, requests[index]);
                  },
                ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error, size: 60, color: Colors.red),
              const SizedBox(height: 16),
              Text('Erreur: $error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(maintenanceRequestsProvider),
                child: const Text('Reessayer'),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openCreateScreen(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('Nouvelle demande'),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, WidgetRef ref) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.build, size: 80, color: Color(AppColors.textMuted)),
          const SizedBox(height: 20),
          Text(
            'Aucune demande de maintenance',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 16),
          Text(
            'Commencez par creer une nouvelle demande',
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          OutlinedButton(
            onPressed: () => _openCreateScreen(context, ref),
            child: const Text('Creer une demande'),
          ),
        ],
      ),
    );
  }

  Widget _buildMaintenanceCard(
    BuildContext context,
    MaintenanceRequest request,
  ) {
    Color getStatusColor() {
      switch (request.status) {
        case 'reported':
        case 'pending':
          return Colors.orange.shade100;
        case 'in_progress':
          return Colors.blue.shade100;
        case 'completed':
          return Colors.green.shade100;
        case 'cancelled':
          return Colors.red.shade100;
        default:
          return const Color(AppColors.textMuted);
      }
    }

    IconData getStatusIcon() {
      switch (request.status) {
        case 'reported':
        case 'pending':
          return Icons.access_time;
        case 'in_progress':
          return Icons.build;
        case 'completed':
          return Icons.check_circle;
        case 'cancelled':
          return Icons.cancel;
        default:
          return Icons.help;
      }
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppConstants.cardRadius),
      ),
      elevation: 2,
      child: InkWell(
        onTap: () {
          Navigator.pushNamed(
            context,
            '/maintenance-detail',
            arguments: request,
          );
        },
        borderRadius: BorderRadius.circular(AppConstants.cardRadius),
        child: Padding(
          padding: EdgeInsets.all(AppConstants.defaultPadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    height: 36,
                    width: 36,
                    decoration: BoxDecoration(
                      color: getStatusColor(),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      getStatusIcon(),
                      color: Colors.black54,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          request.description,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          request.statusDisplay,
                          style: const TextStyle(
                            color: Colors.black54,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(
                    Icons.calendar_today,
                    size: 16,
                    color: Colors.grey,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Cree le: ${_formatDateTime(request.createdAt)}',
                    style: const TextStyle(color: Colors.grey),
                  ),
                ],
              ),
              if (request.updatedAt != null) ...[
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.update, size: 16, color: Colors.grey),
                    const SizedBox(width: 8),
                    Text(
                      'Mis a jour: ${_formatDateTime(request.updatedAt!)}',
                      style: const TextStyle(color: Colors.grey),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _formatDateTime(DateTime dateTime) {
    return '${dateTime.day}/${dateTime.month}/${dateTime.year} '
        'a ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}
