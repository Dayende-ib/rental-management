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
    _loadMaintenanceRequests();
  }

  void _loadMaintenanceRequests() {
    setState(() {
      _requestsFuture = _maintenanceService.getMaintenanceRequests();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes Demandes'),
        centerTitle: true,
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
            onRefresh: () async => _loadMaintenanceRequests(),
            child: requests.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    padding: EdgeInsets.all(AppConstants.defaultPadding),
                    itemCount: requests.length,
                    itemBuilder: (context, index) {
                      return _buildMaintenanceCard(requests[index]);
                    },
                  ),
          );
        },
      ),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: 2,
        onTap: (index) {
          if (index != 2) { // Don't navigate if already on this screen
            switch (index) {
              case 0:
                Navigator.pushNamed(context, '/home');
                break;
              case 1:
                Navigator.pushNamed(context, '/payments');
                break;
              case 3:
                Navigator.pushNamed(context, '/profile');
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
            color: Colors.grey,
          ),
          const SizedBox(height: 20),
          const Text(
            'Aucune demande de maintenance',
            style: TextStyle(fontSize: 18, color: Colors.grey),
          ),
          const SizedBox(height: 16),
          const Text(
            'Commencez par créer une nouvelle demande',
            style: TextStyle(color: Colors.grey),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton(
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
        case 'pending':
          return Colors.orange;
        case 'in_progress':
          return Colors.blue;
        case 'completed':
          return Colors.green;
        default:
          return Colors.grey;
      }
    }

    IconData getStatusIcon() {
      switch (request.status) {
        case 'pending':
          return Icons.access_time;
        case 'in_progress':
          return Icons.build;
        case 'completed':
          return Icons.check_circle;
        default:
          return Icons.help;
      }
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with status
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    request.description,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: getStatusColor(),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        getStatusIcon(),
                        size: 16,
                        color: Colors.white,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        request.statusDisplay,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Creation date
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

            // Updated date (if applicable)
            if (request.updatedAt != null) ...[
              const SizedBox(height: 4),
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