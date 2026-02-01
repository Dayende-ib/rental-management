import 'package:flutter/material.dart';
import '../auth/auth_service.dart';
import '../core/models.dart';
import '../home/dashboard_service.dart';
import '../core/constants.dart';

/// Profile screen showing tenant information and logout option
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final AuthService _authService = AuthService();
  final DashboardService _dashboardService = DashboardService();
  late Future<Tenant?> _tenantFuture;

  @override
  void initState() {
    super.initState();
    _loadTenantData();
  }

  void _loadTenantData() {
    setState(() {
      _tenantFuture = _dashboardService.getDashboardData().then((data) => data.tenant);
    });
  }

  /// Handle logout
  Future<void> _handleLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Déconnexion'),
        content: const Text('Êtes-vous sûr de vouloir vous déconnecter ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Déconnexion'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await _authService.logout();
      // Navigate to login screen and remove all previous routes
      Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mon Profil'),
        centerTitle: true,
      ),
      body: FutureBuilder<Tenant?>(
        future: _tenantFuture,
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
                    onPressed: _loadTenantData,
                    child: const Text('Réessayer'),
                  ),
                ],
              ),
            );
          }

          final tenant = snapshot.data;
          return RefreshIndicator(
            onRefresh: () async => _loadTenantData(),
            child: SingleChildScrollView(
              padding: EdgeInsets.all(AppConstants.defaultPadding),
              child: Column(
                children: [
                  // Profile header
                  _buildProfileHeader(tenant),
                  const SizedBox(height: 30),

                  // Contact information
                  _buildContactInfo(tenant),
                  const SizedBox(height: 30),

                  // App information
                  _buildAppInfo(),
                  const SizedBox(height: 30),

                  // Logout button
                  _buildLogoutButton(),
                ],
              ),
            ),
          );
        },
      ),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: 3,
        onTap: (index) {
          if (index != 3) { // Don't navigate if already on this screen
            switch (index) {
              case 0:
                Navigator.pushNamed(context, '/home');
                break;
              case 1:
                Navigator.pushNamed(context, '/payments');
                break;
              case 2:
                Navigator.pushNamed(context, '/maintenance');
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

  /// Build profile header with avatar and name
  Widget _buildProfileHeader(Tenant? tenant) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(AppConstants.largePadding),
        child: Column(
          children: [
            const CircleAvatar(
              radius: 50,
              backgroundColor: Colors.blue,
              child: Icon(
                Icons.person,
                size: 50,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              tenant?.name ?? 'Chargement...',
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Locataire',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Build contact information section
  Widget _buildContactInfo(Tenant? tenant) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Informations de contact',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            
            // Email
            ListTile(
              leading: const Icon(Icons.email, color: Colors.blue),
              title: const Text('Email'),
              subtitle: Text(tenant?.email ?? 'Chargement...'),
            ),
            
            // Phone
            ListTile(
              leading: const Icon(Icons.phone, color: Colors.green),
              title: const Text('Téléphone'),
              subtitle: Text(tenant?.phone ?? 'Chargement...'),
            ),
          ],
        ),
      ),
    );
  }

  /// Build application information section
  Widget _buildAppInfo() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'À propos de l\'application',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            
            ListTile(
              leading: const Icon(Icons.info, color: Colors.grey),
              title: const Text('Version'),
              subtitle: const Text('1.0.0'),
            ),
            
            ListTile(
              leading: const Icon(Icons.security, color: Colors.grey),
              title: const Text('Sécurité'),
              subtitle: const Text('Connexion sécurisée par JWT'),
            ),
            
            ListTile(
              leading: const Icon(Icons.support, color: Colors.grey),
              title: const Text('Support'),
              subtitle: const Text('contact@rental-management.com'),
            ),
          ],
        ),
      ),
    );
  }

  /// Build logout button
  Widget _buildLogoutButton() {
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: ElevatedButton(
        onPressed: _handleLogout,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.red,
          foregroundColor: Colors.white,
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.logout, size: 20),
            SizedBox(width: 8),
            Text(
              'Se déconnecter',
              style: TextStyle(fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }
}