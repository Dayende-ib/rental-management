import 'package:flutter/material.dart';
import '../core/constants.dart';
import '../core/models.dart';
import '../home/dashboard_service.dart';

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
    _dashboardFuture = _dashboardService.getDashboardData();
  }

  Future<void> _refreshDashboardData() async {
    setState(() {
      _dashboardFuture = _dashboardService.getDashboardData();
    });
    await _dashboardFuture;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      body: FutureBuilder<DashboardData>(
        future: _dashboardFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError || !snapshot.hasData) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error, size: 60, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(
                    'Erreur: ${snapshot.error ?? 'Données indisponibles'}',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _refreshDashboardData,
                    child: const Text('Réessayer'),
                  ),
                ],
              ),
            );
          }

          final dashboardData = snapshot.data!;
          return RefreshIndicator(
            onRefresh: _refreshDashboardData,
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                _buildHeaderSliver(dashboardData.tenant, dashboardData.property),
                SliverPadding(
                  padding: EdgeInsets.all(AppConstants.defaultPadding),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      const SizedBox(height: 12),
                      _buildPropertyCard(dashboardData.property),
                      const SizedBox(height: 20),
                      _buildQuickActions(),
                      const SizedBox(height: 20),
                      _buildUpcomingPayments(dashboardData.upcomingPayments),
                      const SizedBox(height: 20),
                      _buildMaintenanceSummary(dashboardData.pendingMaintenanceRequests),
                    ]),
                  ),
                ),
              ],
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
              break;
            case 1:
              Navigator.pushReplacementNamed(context, '/payments');
              break;
            case 2:
              Navigator.pushReplacementNamed(context, '/maintenance');
              break;
            case 3:
              Navigator.pushReplacementNamed(context, '/profile');
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

  SliverAppBar _buildHeaderSliver(Tenant tenant, Property property) {
    final name = (tenant.name).isNotEmpty ? tenant.name : 'Utilisateur';
    final addressLine = [
      property.address,
      '${property.postalCode} ${property.city}'
    ].where((s) => s.isNotEmpty).join(', ');
    final rentText =
        property.monthlyRent.isFinite ? '${property.monthlyRent.toStringAsFixed(0)} FCFA / mois' : 'Montant non dispo';

    return SliverAppBar(
      pinned: true,
      stretch: true,
      expandedHeight: 240,
      collapsedHeight: 120,
      backgroundColor: Colors.transparent,
      automaticallyImplyLeading: false,
      flexibleSpace: LayoutBuilder(
        builder: (context, constraints) {
          final double t = ((constraints.maxHeight - kToolbarHeight) /
                  (240 - kToolbarHeight))
              .clamp(0.0, 1.0);
          final double headerOpacity = t;
          final double rentOpacity = t * t; // fade faster
          final double radius = 24 * t;

          return ClipRRect(
            borderRadius: BorderRadius.only(
              bottomLeft: Radius.circular(radius),
              bottomRight: Radius.circular(radius),
            ),
            child: Container(
              padding: EdgeInsets.only(
                left: AppConstants.defaultPadding,
                right: AppConstants.defaultPadding,
                bottom: 16,
              ),
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
              child: SafeArea(
                bottom: false,
                child: Align(
                  alignment: Alignment.bottomLeft,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Expanded(
                      child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Opacity(
                              opacity: headerOpacity,
                              child: Text(
                                name,
                                style: Theme.of(context)
                                    .textTheme
                                    .headlineSmall
                                    ?.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                    ),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Opacity(
                              opacity: headerOpacity,
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.home, size: 16, color: Colors.white70),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      addressLine,
                                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                            color: Colors.white70,
                                          ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 8),
                            Opacity(
                              opacity: rentOpacity,
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                  children: [
                                  const Icon(Icons.attach_money, size: 16, color: Colors.white70),
                                  const SizedBox(width: 6),
                                  Text(
                                    rentText,
                                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w600,
                                        ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      CircleAvatar(
                        radius: 24,
                        backgroundColor: Colors.white.withValues(alpha: 0.2),
                        child: const Icon(
                          Icons.person,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildPropertyCard(Property property) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Votre logement',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            if (property.photos.isNotEmpty) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Image.network(
                    property.photos.first,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      color: const Color(AppColors.border),
                      child: const Icon(Icons.image_not_supported),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
            Row(
              children: [
                const Icon(Icons.location_on, color: Color(AppColors.accent)),
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
                const Icon(Icons.attach_money, color: Color(AppColors.accentSoft)),
                const SizedBox(width: 8),
                Text(
                  'Loyer mensuel: ${property.monthlyRent.toStringAsFixed(0)} FCFA',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ],
            ),
            if (property.surface > 0 || property.rooms > 0) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 12,
                runSpacing: 6,
                children: [
                  if (property.surface > 0)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.square_foot, size: 16, color: Colors.black54),
                        const SizedBox(width: 4),
                        Text('${property.surface.toStringAsFixed(0)} m²'),
                      ],
                    ),
                  if (property.rooms > 0)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.meeting_room, size: 16, color: Colors.black54),
                        const SizedBox(width: 4),
                        Text('${property.rooms} pieces'),
                      ],
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Actions rapides',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildActionButton(
                    icon: Icons.payment,
                    label: 'Paiements',
                    onPressed: () => Navigator.pushNamed(context, '/payments'),
                    startColor: const Color(AppColors.accent),
                    endColor: const Color(AppColors.accentLight),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildActionButton(
                    icon: Icons.build,
                    label: 'Maintenance',
                    onPressed: () => Navigator.pushNamed(context, '/maintenance'),
                    startColor: Colors.orange.shade700,
                    endColor: Colors.orange.shade400,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildActionButton(
              icon: Icons.home_work,
              label: 'Proprietes',
              onPressed: () => Navigator.pushNamed(context, '/properties'),
              startColor: Colors.indigo.shade700,
              endColor: Colors.indigo.shade400,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onPressed,
    required Color startColor,
    required Color endColor,
  }) {
    return InkWell(
      borderRadius: BorderRadius.circular(AppConstants.inputRadius),
      onTap: onPressed,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [startColor, endColor],
          ),
          borderRadius: BorderRadius.circular(AppConstants.inputRadius),
          boxShadow: const [
            BoxShadow(
              color: Color(0x1A000000),
              blurRadius: 12,
              offset: Offset(0, 6),
            )
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 20,
              backgroundColor: Colors.white.withValues(alpha: 0.2),
              child: Icon(icon, color: Colors.white),
            ),
            const SizedBox(height: 10),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUpcomingPayments(List<Payment> payments) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Prochains paiements',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            if (payments.isEmpty)
              Text(
                'Aucun paiement à venir',
                style: Theme.of(context).textTheme.bodySmall,
              )
            else
              ...payments.map((payment) => _buildPaymentItem(payment)),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentItem(Payment payment) {
    final Color paidBg = const Color(AppColors.accentLight);
    final Color paidText = const Color(AppColors.accent);
    final Color dueBg = Colors.orange.shade100;
    final Color dueText = Colors.orange.shade800;

    return Card(
      color: const Color(AppColors.surface),
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppConstants.cardRadius / 2),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            CircleAvatar(
              radius: 22,
              backgroundColor: paidBg.withValues(alpha: 0.95),
              child: Icon(Icons.receipt_long, color: paidText, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    payment.month,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                Text(
                  '${payment.amount.toStringAsFixed(0)} FCFA',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: payment.isPaid ? paidBg : dueBg,
                borderRadius: BorderRadius.circular(50),
              ),
              child: Text(
                payment.isPaid ? 'Payé' : 'À payer',
                style: TextStyle(
                  color: payment.isPaid ? paidText : dueText,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMaintenanceSummary(int pendingCount) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: Row(
          children: [
            const Icon(Icons.build, size: 36, color: Color(AppColors.accent)),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Demandes de maintenance',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  Text(
                    '$pendingCount demande(s) en attente',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            OutlinedButton(
              onPressed: () => Navigator.pushNamed(context, '/maintenance'),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(AppColors.accent),
                side: const BorderSide(color: Color(AppColors.accent)),
              ),
              child: const Text('Voir tout'),
            ),
          ],
        ),
      ),
    );
  }
}
