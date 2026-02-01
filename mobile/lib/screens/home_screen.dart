import 'package:flutter/material.dart';
import '../core/models.dart';
import '../home/dashboard_service.dart';
import '../core/constants.dart';

/// Home/Dashboard screen showing tenant overview
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final DashboardService _dashboardService = DashboardService();
  late Future<DashboardData> _dashboardFuture;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  void _loadDashboardData() {
    setState(() {
      _dashboardFuture = _dashboardService.getDashboardData();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tableau de bord'),
        actions: [
          IconButton(
            icon: const Icon(Icons.account_circle),
            onPressed: () {
              Navigator.pushNamed(context, '/profile');
            },
          ),
        ],
      ),
      body: FutureBuilder<DashboardData>(
        future: _dashboardFuture,
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
                  Text(
                    'Erreur: ${snapshot.error}',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadDashboardData,
                    child: const Text('Réessayer'),
                  ),
                ],
              ),
            );
          }

          final dashboardData = snapshot.data!;
          return RefreshIndicator(
            onRefresh: () async => _loadDashboardData(),
            child: SingleChildScrollView(
              padding: EdgeInsets.all(AppConstants.defaultPadding),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Welcome section
                  _buildWelcomeCard(dashboardData.tenant),
                  const SizedBox(height: 20),

                  // Property info
                  _buildPropertyCard(dashboardData.property),
                  const SizedBox(height: 20),

                  // Quick actions
                  _buildQuickActions(),
                  const SizedBox(height: 20),

                  // Upcoming payments
                  _buildUpcomingPayments(dashboardData.upcomingPayments),
                  const SizedBox(height: 20),

                  // Maintenance summary
                  _buildMaintenanceSummary(dashboardData.pendingMaintenanceRequests),
                ],
              ),
            ),
          );
        },
      ),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: 0,
        onTap: (index) {
          switch (index) {
            case 0:
              // Current screen
              break;
            case 1:
              Navigator.pushNamed(context, '/payments');
              break;
            case 2:
              Navigator.pushNamed(context, '/maintenance');
              break;
            case 3:
              Navigator.pushNamed(context, '/profile');
              break;
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

  /// Build welcome card with tenant name
  Widget _buildWelcomeCard(Tenant tenant) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Bienvenue,',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
            Text(
              tenant.name,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Build property information card
  Widget _buildPropertyCard(Property property) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Votre logement',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.location_on, color: Colors.blue),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${property.address}\n${property.postalCode} ${property.city}',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.euro, color: Colors.green),
                const SizedBox(width: 8),
                Text(
                  'Loyer mensuel: ${property.monthlyRent.toStringAsFixed(2)} €',
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Build quick action buttons
  Widget _buildQuickActions() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Actions rapides',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildActionButton(
                  icon: Icons.payment,
                  label: 'Paiements',
                  onPressed: () => Navigator.pushNamed(context, '/payments'),
                ),
                _buildActionButton(
                  icon: Icons.build,
                  label: 'Maintenance',
                  onPressed: () => Navigator.pushNamed(context, '/maintenance'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Build individual action button
  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onPressed,
  }) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 30),
          const SizedBox(height: 8),
          Text(label),
        ],
      ),
    );
  }

  /// Build upcoming payments section
  Widget _buildUpcomingPayments(List<Payment> payments) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Prochains paiements',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            if (payments.isEmpty)
              const Text('Aucun paiement à venir')
            else
              ...payments.map((payment) => _buildPaymentItem(payment)).toList(),
          ],
        ),
      ),
    );
  }

  /// Build individual payment item
  Widget _buildPaymentItem(Payment payment) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: payment.isPaid ? Colors.green.shade50 : Colors.orange.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: payment.isPaid ? Colors.green : Colors.orange,
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                payment.month,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              Text(
                '${payment.amount.toStringAsFixed(2)} €',
                style: const TextStyle(fontSize: 16),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: payment.isPaid ? Colors.green : Colors.orange,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              payment.isPaid ? 'Payé' : 'À payer',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Build maintenance summary card
  Widget _buildMaintenanceSummary(int pendingCount) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: Row(
          children: [
            const Icon(Icons.build, size: 40, color: Colors.blue),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Demandes de maintenance',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    '$pendingCount demande(s) en attente',
                    style: const TextStyle(color: Colors.grey),
                  ),
                ],
              ),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pushNamed(context, '/maintenance'),
              child: const Text('Voir tout'),
            ),
          ],
        ),
      ),
    );
  }
}