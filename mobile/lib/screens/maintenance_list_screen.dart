import 'package:flutter/material.dart';
import '../core/models.dart';
import '../maintenance/maintenance_service.dart';
import '../core/constants.dart';

/// Maintenance requests list screen
class MaintenanceListScreen extends StatefulWidget {
  const MaintenanceListScreen({super.key});

  @override
  State<MaintenanceListScreen> createState() => _MaintenanceListScreenState();
}

class _MaintenanceListScreenState extends State<MaintenanceListScreen> {
  final MaintenanceService _maintenanceService = MaintenanceService();
  late Future<List<MaintenanceRequest>> _requestsFuture;

  @override
  void initState() {
    super.initState();
    _requestsFuture = _maintenanceService.getMaintenanceRequests();
  }

  void _loadMaintenanceRequests() {
    setState(() {
      _requestsFuture = _maintenanceService.getMaintenanceRequests();
    });
  }
 
  Future<void> _refreshMaintenanceRequests() async {
    _loadMaintenanceRequests();
    await _requestsFuture;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes Demandes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              Navigator.pushNamed(context, '/create-maintenance');
            },
          ),
        ],
      ),
      body: FutureBuilder<List<MaintenanceRequest>>(
        future: _requestsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error, size: 60, color: Colors.red),
                  const SizedBox(height: 16),
                  Text('Erreur: ${snapshot.error}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadMaintenanceRequests,
                    child: const Text('Réessayer'),
                  ),
                ],
              ),
            );
          }

          final requests = snapshot.data!;
          return RefreshIndicator(
            onRefresh: _refreshMaintenanceRequests,
            child: requests.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: EdgeInsets.all(AppConstants.defaultPadding),
                    itemCount: requests.length,
                    itemBuilder: (context, index) {
                      return _buildMaintenanceCard(requests[index]);
                    },
                  ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.pushNamed(context, '/create-maintenance'),
        icon: const Icon(Icons.add),
        label: const Text('Nouvelle demande'),
      ),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: 2,
        onTap: (index) {
          if (index != 2) { // Don't navigate if already on this screen
            switch (index) {
              case 0:
                Navigator.pushReplacementNamed(context, '/home');
                break;
              case 1:
                Navigator.pushReplacementNamed(context, '/payments');
                break;
              case 3:
                Navigator.pushReplacementNamed(context, '/profile');
                break;
            }
          }
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Accueil',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.payment),
            label: 'Paiements',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.build),
            label: 'Maintenance',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profil',
          ),
        ],
      ),
    );
  }

  /// Build empty state when no maintenance requests
  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.build,
            size: 80,
            color: Color(AppColors.textMuted),
          ),
          const SizedBox(height: 20),
          Text(
            'Aucune demande de maintenance',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 16),
          Text(
            'Commencez par créer une nouvelle demande',
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          OutlinedButton(
            onPressed: () {
              Navigator.pushNamed(context, '/create-maintenance');
            },
            child: const Text('Créer une demande'),
          ),
        ],
      ),
    );
  }

  /// Build maintenance request card
  Widget _buildMaintenanceCard(MaintenanceRequest request) {
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
                        style: TextStyle(
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
                const Icon(Icons.calendar_today, size: 16, color: Colors.grey),
                const SizedBox(width: 8),
                Text(
                  'Créé le: ${_formatDateTime(request.createdAt)}',
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
                    'Mis à jour: ${_formatDateTime(request.updatedAt!)}',
                    style: const TextStyle(color: Colors.grey),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// Format datetime for display
  String _formatDateTime(DateTime dateTime) {
    return '${dateTime.day}/${dateTime.month}/${dateTime.year} '
        'à ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}
