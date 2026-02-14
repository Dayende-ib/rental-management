import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/constants.dart';
import '../core/models.dart';
import '../core/storage.dart';
import '../core/providers/dashboard_providers.dart';
import '../core/providers/payment_providers.dart';
import '../widgets/stat_charts.dart';
import '../navigation/main_navigation_screen.dart';

/// Home/Dashboard screen showing tenant overview
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(dashboardDataProvider);
    final paymentsAsync = ref.watch(paymentsProvider);

    return Scaffold(
      extendBodyBehindAppBar: true,
      body: dashboardAsync.when(
        data: (dashboardData) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(dashboardDataProvider);
            ref.invalidate(paymentsProvider);
          },
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              _buildHeaderSliver(dashboardData.tenant, dashboardData.property),
              SliverPadding(
                padding: EdgeInsets.all(AppConstants.defaultPadding),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    const SizedBox(height: 12),
                    _buildPropertyCard(
                      context,
                      ref,
                      dashboardData.property,
                      contractId: dashboardData.contractId,
                      contractStatus: dashboardData.contractStatus,
                      contractSignedByTenant:
                          dashboardData.contractSignedByTenant,
                      contractSignedByLandlord:
                          dashboardData.contractSignedByLandlord,
                    ),
                    const SizedBox(height: 24),

                    // Graphique des paiements
                    paymentsAsync.when(
                      data: (payments) => Card(
                        child: Padding(
                          padding: EdgeInsets.all(AppConstants.defaultPadding),
                          child: PaymentHistoryChart(payments: payments),
                        ),
                      ),
                      loading: () => const SizedBox(
                        height: 200,
                        child: Center(child: CircularProgressIndicator()),
                      ),
                      error: (err, stack) => const SizedBox.shrink(),
                    ),

                    const SizedBox(height: 24),
                    _buildQuickActions(
                      context,
                      unpaidPayments: dashboardData.upcomingPayments
                          .where((payment) => !payment.isPaid)
                          .length,
                      pendingMaintenance:
                          dashboardData.pendingMaintenanceRequests,
                    ),
                    const SizedBox(height: 20),
                    _buildUpcomingPayments(
                      context,
                      dashboardData.upcomingPayments,
                    ),
                    const SizedBox(height: 20),
                    _buildMaintenanceSummary(
                      context,
                      dashboardData.pendingMaintenanceRequests,
                    ),
                  ]),
                ),
              ),
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

  SliverAppBar _buildHeaderSliver(Tenant tenant, Property property) {
    final storedName = (StorageService.getUserFullName() ?? '').trim();
    final name = (tenant.name).isNotEmpty
        ? tenant.name
        : (storedName.isNotEmpty ? storedName : 'Utilisateur');
    final addressLine = [
      property.address,
      '${property.postalCode} ${property.city}',
    ].where((s) => s.isNotEmpty).join(', ');
    final rentText = property.monthlyRent.isFinite
        ? '${property.monthlyRent.toStringAsFixed(0)} FCFA / mois'
        : 'Montant non dispo';

    return SliverAppBar(
      pinned: true,
      stretch: true,
      expandedHeight: 240,
      collapsedHeight: 120,
      backgroundColor: Colors.transparent,
      automaticallyImplyLeading: false,
      flexibleSpace: LayoutBuilder(
        builder: (context, constraints) {
          final double t =
              ((constraints.maxHeight - kToolbarHeight) /
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
                                style: Theme.of(context).textTheme.headlineSmall
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
                                  const Icon(
                                    Icons.home,
                                    size: 16,
                                    color: Colors.white70,
                                  ),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      addressLine,
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(color: Colors.white70),
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
                                  const Icon(
                                    Icons.attach_money,
                                    size: 16,
                                    color: Colors.white70,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    rentText,
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodyMedium
                                        ?.copyWith(
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
                        child: const Icon(Icons.person, color: Colors.white),
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

  Widget _buildPropertyCard(
    BuildContext context,
    WidgetRef ref,
    Property property,
    {required String contractId,
    required String contractStatus,
    required bool contractSignedByTenant,
    required bool contractSignedByLandlord,}
  ) {
    if (property.id.isEmpty) {
      return Card(
        child: Padding(
          padding: EdgeInsets.all(AppConstants.defaultPadding),
          child: Column(
            children: [
              const Icon(
                Icons.home_work_outlined,
                size: 48,
                color: Color(AppColors.textMuted),
              ),
              const SizedBox(height: 12),
              Text(
                'Aucun logement actif',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              const Text(
                'Vous n\'avez pas encore de contrat de location actif.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(AppColors.textSecondary)),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    // Switch to 'Louer' tab (index 1)
                    ref.read(navigationIndexProvider.notifier).state = 1;
                  },
                  child: const Text('Trouver un logement'),
                ),
              ),
            ],
          ),
        ),
      );
    }

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
                const Icon(
                  Icons.attach_money,
                  color: Color(AppColors.accentSoft),
                ),
                const SizedBox(width: 8),
                Text(
                  'Loyer mensuel: ${property.monthlyRent.toStringAsFixed(0)} FCFA',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.blue.shade100),
              ),
              child: Text(
                'Statut contrat: ${_getContractStatusLabel(contractStatus, contractSignedByTenant, contractSignedByLandlord)}',
                style: TextStyle(
                  color: Colors.blue.shade800,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: contractStatus.toLowerCase() == 'active'
                    ? () {
                        ref
                            .read(openPaymentSubmitIntentProvider.notifier)
                            .state = PaymentSubmitIntent(
                          open: true,
                          contractId: contractId,
                          propertyLabel: property.address,
                          monthlyRent: property.monthlyRent,
                        );
                        ref.read(navigationIndexProvider.notifier).state = 2;
                      }
                    : null,
                icon: const Icon(Icons.receipt_long),
                label: Text(
                  contractStatus.toLowerCase() == 'active'
                      ? 'Payer et envoyer une preuve'
                      : 'Paiement disponible apres validation du contrat',
                ),
              ),
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
                        const Icon(
                          Icons.square_foot,
                          size: 16,
                          color: Colors.black54,
                        ),
                        const SizedBox(width: 4),
                        Text('${property.surface.toStringAsFixed(0)} m²'),
                      ],
                    ),
                  if (property.rooms > 0)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.meeting_room,
                          size: 16,
                          color: Colors.black54,
                        ),
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

  String _getContractStatusLabel(
    String contractStatus,
    bool contractSignedByTenant,
    bool contractSignedByLandlord,
  ) {
    final status = contractStatus.toLowerCase();
    if (status == 'active') return 'Valide';
    if (status == 'expired') return 'Expire';
    if (status == 'terminated' || status == 'cancelled') {
      return 'Rejete ou resilie';
    }
    if (status == 'draft' ||
        status == 'pending' ||
        status == 'signed' ||
        status == 'requested' ||
        status == 'submitted' ||
        status == 'awaiting_approval' ||
        status == 'under_review') {
      if (contractSignedByTenant && !contractSignedByLandlord) {
        return 'En attente de validation du bailleur';
      }
      if (!contractSignedByTenant) return 'Brouillon';
      return 'En cours de traitement';
    }
    if (status.isEmpty) return 'Aucun contrat';
    return status;
  }

  Widget _buildQuickActions(
    BuildContext context, {
    required int unpaidPayments,
    required int pendingMaintenance,
  }) {
    final paymentsSubtitle = unpaidPayments > 0
        ? '$unpaidPayments a payer'
        : 'Tout est a jour';
    final maintenanceSubtitle = pendingMaintenance > 0
        ? '$pendingMaintenance en cours'
        : 'Aucune demande';

    return Card(
      child: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Actions rapides',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const Spacer(),
                Icon(Icons.bolt, size: 18, color: Colors.orange.shade600),
              ],
            ),
            const SizedBox(height: 14),
            LayoutBuilder(
              builder: (context, constraints) {
                const double spacing = 12;
                final double itemWidth = (constraints.maxWidth - spacing) / 2;

                return Wrap(
                  spacing: spacing,
                  runSpacing: spacing,
                  children: [
                    SizedBox(
                      width: itemWidth,
                      child: _buildQuickActionTile(
                        context,
                        icon: Icons.payment,
                        title: 'Paiements',
                        subtitle: paymentsSubtitle,
                        badgeText: unpaidPayments > 0
                            ? unpaidPayments.toString()
                            : null,
                        onPressed: () =>
                            Navigator.pushNamed(context, '/payments'),
                        color: const Color(AppColors.accent),
                      ),
                    ),
                    SizedBox(
                      width: itemWidth,
                      child: _buildQuickActionTile(
                        context,
                        icon: Icons.build,
                        title: 'Maintenance',
                        subtitle: maintenanceSubtitle,
                        badgeText: pendingMaintenance > 0
                            ? pendingMaintenance.toString()
                            : null,
                        onPressed: () =>
                            Navigator.pushNamed(context, '/maintenance'),
                        color: Colors.orange.shade700,
                      ),
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActionTile(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    String? badgeText,
    required VoidCallback onPressed,
    required Color color,
  }) {
    return Material(
      color: const Color(AppColors.surface),
      elevation: 1,
      shadowColor: Colors.black.withValues(alpha: 0.06),
      borderRadius: BorderRadius.circular(AppConstants.cardRadius),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppConstants.cardRadius),
        onTap: onPressed,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          child: Row(
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(icon, color: color),
                  ),
                  if (badgeText != null)
                    Positioned(
                      right: -6,
                      top: -6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: color,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          badgeText,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: Theme.of(
                        context,
                      ).textTheme.bodySmall?.copyWith(color: Colors.black54),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Colors.black26),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildUpcomingPayments(BuildContext context, List<Payment> payments) {
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
    final Color overdueBg = Colors.red.shade100;
    final Color overdueText = Colors.red.shade800;

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
                    '${(payment.amount + payment.lateFee).toStringAsFixed(0)} FCFA',
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
                color: payment.isPaid
                    ? paidBg
                    : (payment.isOverdue ? overdueBg : dueBg),
                borderRadius: BorderRadius.circular(50),
              ),
              child: Text(
                payment.isPaid
                    ? 'Payé'
                    : (payment.isOverdue ? 'En retard' : 'À payer'),
                style: TextStyle(
                  color: payment.isPaid
                      ? paidText
                      : (payment.isOverdue ? overdueText : dueText),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMaintenanceSummary(BuildContext context, int pendingCount) {
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
