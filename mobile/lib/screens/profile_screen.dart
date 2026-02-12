import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../auth/auth_service.dart';
import '../core/models.dart';
import '../core/providers/dashboard_providers.dart';
import '../core/constants.dart';
import '../core/storage.dart';

/// Écran de profil premium pour les locataires
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(dashboardDataProvider);
    final authService = AuthService();
    final storedFullName = StorageService.getUserFullName() ?? '';
    final storedEmail = StorageService.getUserEmail() ?? '';

    return Scaffold(
      backgroundColor: const Color(AppColors.background),
      body: dashboardAsync.when(
        data: (data) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(dashboardDataProvider);
          },
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              _buildHeader(context, data.tenant, fallbackName: storedFullName),
              SliverPadding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppConstants.defaultPadding,
                  vertical: AppConstants.largePadding,
                ),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    _buildSectionTitle('Informations Personnelles'),
                    _buildProfileItem(
                      icon: Icons.person_outline_rounded,
                      title: 'Nom complet',
                      value: _resolveDisplayName(
                        data.tenant,
                        fallbackName: storedFullName,
                      ),
                    ),
                    _buildProfileItem(
                      icon: Icons.email_outlined,
                      title: 'Email',
                      value: _resolveDisplayEmail(
                        data.tenant,
                        fallbackEmail: storedEmail,
                      ),
                    ),
                    _buildProfileItem(
                      icon: Icons.phone_outlined,
                      title: 'Telephone',
                      value: data.tenant.phone.isNotEmpty
                          ? data.tenant.phone
                          : 'Non renseigne',
                    ),
                    const SizedBox(height: 16),
                    _buildEditProfileButton(
                      context,
                      ref,
                      authService,
                      data.tenant,
                    ),
                    const SizedBox(height: 32),
                    if (data.property.id.isNotEmpty) ...[
                      _buildSectionTitle('Ma Propriété'),
                      _buildProfileItem(
                        icon: Icons.home_outlined,
                        title: 'Adresse',
                        value: data.property.address,
                      ),
                      _buildProfileItem(
                        icon: Icons.location_city_outlined,
                        title: 'Ville',
                        value:
                            '${data.property.city} ${data.property.postalCode}'
                                .trim(),
                      ),
                      const SizedBox(height: 32),
                    ],
                    _buildSectionTitle('Application'),
                    _buildProfileItem(
                      icon: Icons.info_outline_rounded,
                      title: 'Version',
                      value: '1.0.5 Stable',
                    ),
                    _buildProfileItem(
                      icon: Icons.support_agent_rounded,
                      title: 'Support technique',
                      value: 'support@propriflow.com',
                    ),
                    const SizedBox(height: 48),
                    _buildLogoutButton(context, authService),
                    const SizedBox(
                      height: 80,
                    ), // Espace sous le bouton de déconnexion
                  ]),
                ),
              ),
            ],
          ),
        ),
        loading: () => const Center(
          child: CircularProgressIndicator(color: Color(AppColors.accent)),
        ),
        error: (error, stack) => _buildErrorState(ref, error),
      ),
    );
  }

  /// Header avec dégradé et avatar
  Widget _buildHeader(
    BuildContext context,
    Tenant tenant, {
    String fallbackName = '',
  }) {
    return SliverAppBar(
      expandedHeight: 240,
      pinned: true,
      stretch: true,
      elevation: 0,
      backgroundColor: const Color(AppColors.accent),
      flexibleSpace: FlexibleSpaceBar(
        stretchModes: const [
          StretchMode.zoomBackground,
          StretchMode.blurBackground,
        ],
        background: Stack(
          fit: StackFit.expand,
          children: [
            Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(AppColors.accent),
                    Color(AppColors.accentSoft),
                  ],
                ),
              ),
            ),
            // Décoration subtile (cercles)
            Positioned(
              top: -50,
              right: -50,
              child: CircleAvatar(
                radius: 100,
                backgroundColor: Colors.white.withAlpha(5),
              ),
            ),
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const SizedBox(height: 40),
                GestureDetector(
                  onLongPress: () =>
                      Navigator.pushNamed(context, '/debug-settings'),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: CircleAvatar(
                      radius: 50,
                      backgroundColor: const Color(AppColors.background),
                      child: const Icon(
                        Icons.person_rounded,
                        size: 60,
                        color: Color(AppColors.accent),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  _resolveDisplayName(tenant, fallbackName: fallbackName),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withAlpha(20),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text(
                    'LOCATAIRE PREMIUM',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _resolveDisplayName(Tenant tenant, {String fallbackName = ''}) {
    final tenantName = tenant.name.trim();
    if (tenantName.isNotEmpty) return tenantName;
    final storedName = fallbackName.trim();
    if (storedName.isNotEmpty) return storedName;
    return 'Utilisateur';
  }

  String _resolveDisplayEmail(Tenant tenant, {String fallbackEmail = ''}) {
    final tenantEmail = tenant.email.trim();
    if (tenantEmail.isNotEmpty) return tenantEmail;
    final storedEmail = fallbackEmail.trim();
    if (storedEmail.isNotEmpty) return storedEmail;
    return 'Non disponible';
  }

  /// Titre de section stylisé
  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 16),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w900,
          color: Color(AppColors.textSecondary),
          letterSpacing: 1.5,
        ),
      ),
    );
  }

  /// Élément de profil individuel (style premium)
  Widget _buildProfileItem({
    required IconData icon,
    required String title,
    required String value,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(3),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(AppColors.accent).withAlpha(8),
              borderRadius: BorderRadius.circular(15),
            ),
            child: Icon(icon, color: const Color(AppColors.accent), size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(AppColors.textSecondary),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 16,
                    color: Color(AppColors.textPrimary),
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEditProfileButton(
    BuildContext context,
    WidgetRef ref,
    AuthService authService,
    Tenant tenant,
  ) {
    return OutlinedButton.icon(
      onPressed: () => _handleEditProfile(context, ref, authService, tenant),
      icon: const Icon(Icons.edit_rounded, size: 20),
      label: const Text(
        'Modifier mes informations',
        style: TextStyle(fontWeight: FontWeight.w700),
      ),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(double.infinity, 52),
        foregroundColor: const Color(AppColors.accent),
        side: const BorderSide(color: Color(AppColors.accent)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }

  /// Bouton de déconnexion stylisé
  Widget _buildLogoutButton(BuildContext context, AuthService authService) {
    return ElevatedButton(
      onPressed: () => _handleLogout(context, authService),
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.white,
        foregroundColor: Colors.red,
        elevation: 0,
        minimumSize: const Size(double.infinity, 64),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: Colors.red.withAlpha(10), width: 1.5),
        ),
      ),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.logout_rounded, size: 24),
          SizedBox(width: 12),
          Text(
            'Se déconnecter',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
          ),
        ],
      ),
    );
  }

  /// État d'erreur stylisé
  Widget _buildErrorState(WidgetRef ref, Object error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.red.withAlpha(10),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.error_outline_rounded,
                size: 60,
                color: Colors.red,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Oups !',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w900,
                letterSpacing: -1,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Un problème est survenu lors de la récupération de votre profil.\n$error',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(AppColors.textSecondary),
                height: 1.5,
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () => ref.invalidate(dashboardDataProvider),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(AppColors.accent),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 16,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(15),
                ),
              ),
              child: const Text(
                'Réessayer',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleEditProfile(
    BuildContext context,
    WidgetRef ref,
    AuthService authService,
    Tenant tenant,
  ) async {
    final nameController = TextEditingController(text: tenant.name);
    final phoneController = TextEditingController(text: tenant.phone);
    final formKey = GlobalKey<FormState>();
    String? submitError;
    bool isSubmitting = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 16,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: Material(
                borderRadius: BorderRadius.circular(24),
                color: Colors.white,
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Form(
                    key: formKey,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Modifier le profil',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            color: Color(AppColors.textPrimary),
                          ),
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: nameController,
                          decoration: const InputDecoration(
                            labelText: 'Nom complet',
                            prefixIcon: Icon(Icons.person_outline_rounded),
                          ),
                          validator: (value) {
                            final text = (value ?? '').trim();
                            if (text.isEmpty) return 'Le nom est requis';
                            if (text.length < 3) {
                              return 'Minimum 3 caracteres';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: phoneController,
                          keyboardType: TextInputType.phone,
                          decoration: const InputDecoration(
                            labelText: 'Telephone',
                            prefixIcon: Icon(Icons.phone_outlined),
                          ),
                        ),
                        if (submitError != null) ...[
                          const SizedBox(height: 12),
                          Text(
                            submitError!,
                            style: const TextStyle(
                              color: Colors.red,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: isSubmitting
                                    ? null
                                    : () => Navigator.pop(context),
                                child: const Text('Annuler'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ElevatedButton(
                                onPressed: isSubmitting
                                    ? null
                                    : () async {
                                        if (!formKey.currentState!.validate()) {
                                          return;
                                        }
                                        setModalState(() {
                                          isSubmitting = true;
                                          submitError = null;
                                        });
                                        try {
                                          await authService.updateProfile(
                                            fullName: nameController.text,
                                            phone: phoneController.text,
                                          );
                                          if (!context.mounted) return;
                                          ref.invalidate(dashboardDataProvider);
                                          Navigator.pop(context);
                                          ScaffoldMessenger.of(
                                            context,
                                          ).showSnackBar(
                                            const SnackBar(
                                              content: Text(
                                                'Profil mis a jour',
                                              ),
                                            ),
                                          );
                                        } catch (e) {
                                          setModalState(() {
                                            submitError = e
                                                .toString()
                                                .replaceAll('Exception: ', '');
                                            isSubmitting = false;
                                          });
                                        }
                                      },
                                child: isSubmitting
                                    ? const SizedBox(
                                        width: 18,
                                        height: 18,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : const Text('Enregistrer'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );

    nameController.dispose();
    phoneController.dispose();
  }

  /// Gestion de la déconnexion avec confirmation
  Future<void> _handleLogout(
    BuildContext context,
    AuthService authService,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text(
          'Déconnexion',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        content: const Text(
          'Êtes-vous sûr de vouloir quitter votre session ?',
          style: TextStyle(color: Color(AppColors.textSecondary)),
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(25)),
        actionsPadding: const EdgeInsets.all(16),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text(
              'Annuler',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Color(AppColors.textSecondary),
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(15),
              ),
            ),
            child: const Text(
              'Déconnexion',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await authService.logout();
      if (!context.mounted) return;
      Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
    }
  }
}
