import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../auth/auth_service.dart';
import '../core/models.dart';
import '../core/providers/dashboard_providers.dart';
import '../core/constants.dart';

/// Profile screen showing tenant information and logout option
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(dashboardDataProvider);
    final authService = AuthService();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mon Profil'),
      ),
      body: dashboardAsync.when(
        data: (data) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(dashboardDataProvider);
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: EdgeInsets.all(AppConstants.defaultPadding),
            children: [
              // Profile header
              _buildProfileHeader(data.tenant),
              const SizedBox(height: 30),

              // Contact information
              _buildContactInfo(data.tenant),
              const SizedBox(height: 30),

              // App information
              _buildAppInfo(),
              const SizedBox(height: 30),

              // Logout button
              _buildLogoutButton(context, authService),
            ],
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
                onPressed: () => ref.invalidate(dashboardDataProvider),
                child: const Text('Réessayer'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Build profile header with avatar and name
  Widget _buildProfileHeader(Tenant tenant) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(AppConstants.largePadding),
        child: Column(
          children: [
            const CircleAvatar(
              radius: 50,
              backgroundColor: Color(AppColors.surface),
              child: Icon(
                Icons.person,
                size: 50,
                color: Color(AppColors.accent),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              tenant.name.isNotEmpty ? tenant.name : 'Utilisateur',
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Locataire',
              style: TextStyle(
                fontSize: 14,
                color: Color(AppColors.textSecondary),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Build contact information section
  Widget _buildContactInfo(Tenant tenant) {
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
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            
            // Email
            ListTile(
              leading: const Icon(Icons.email, color: Color(AppColors.accent)),
              title: const Text('Email'),
              subtitle: Text(tenant.email.isNotEmpty ? tenant.email : 'Non disponible'),
            ),
            
            // Phone
            ListTile(
              leading: const Icon(Icons.phone, color: Color(AppColors.accentSoft)),
              title: const Text('Téléphone'),
              subtitle: Text(tenant.phone.isNotEmpty ? tenant.phone : 'Non disponible'),
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
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            
            const ListTile(
              leading: Icon(Icons.info, color: Color(AppColors.accent)),
              title: Text('Version'),
              subtitle: Text('1.0.0'),
            ),
            
            const ListTile(
              leading: Icon(Icons.security, color: Color(AppColors.accentSoft)),
              title: Text('Sécurité'),
              subtitle: Text('Connexion sécurisée par JWT'),
            ),
            
            const ListTile(
              leading: Icon(Icons.support, color: Color(AppColors.accent)),
              title: Text('Support'),
              subtitle: Text('contact@rental-management.com'),
            ),
          ],
        ),
      ),
    );
  }

  /// Build logout button
  Widget _buildLogoutButton(BuildContext context, AuthService authService) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        onPressed: () => _handleLogout(context, authService),
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.red,
          side: const BorderSide(color: Colors.red),
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

  /// Handle logout
  Future<void> _handleLogout(BuildContext context, AuthService authService) async {
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
      await authService.logout();
      if (!context.mounted) return;
      // Navigate to login screen and remove all previous routes
      Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
    }
  }
}