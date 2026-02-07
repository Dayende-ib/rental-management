import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../core/constants.dart';
import '../core/models.dart';

/// Guest view listing available properties
class GuestPropertiesScreen extends StatefulWidget {
  const GuestPropertiesScreen({super.key});

  @override
  State<GuestPropertiesScreen> createState() => _GuestPropertiesScreenState();
}

class _GuestPropertiesScreenState extends State<GuestPropertiesScreen> {
  final ApiClient _apiClient = ApiClient();
  late Future<List<Property>> _propertiesFuture;

  @override
  void initState() {
    super.initState();
    _propertiesFuture = _loadProperties();
  }

  Future<List<Property>> _loadProperties() async {
    final data = await _apiClient.getList(
      AppConstants.propertiesEndpoint,
      requiresAuth: false,
    );
    final properties = <Property>[];
    for (final item in data) {
      if (item is Map<String, dynamic>) {
        final status = (item['status'] ?? '').toString();
        if (status.isEmpty || status == 'available') {
          properties.add(Property.fromJson(item));
        }
      }
    }
    return properties;
  }

  Future<void> _refresh() async {
    setState(() {
      _propertiesFuture = _loadProperties();
    });
    await _propertiesFuture;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Biens disponibles'),
      ),
      body: FutureBuilder<List<Property>>(
        future: _propertiesFuture,
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
                    onPressed: _refresh,
                    child: const Text('Reessayer'),
                  ),
                ],
              ),
            );
          }

          final properties = snapshot.data ?? [];
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: EdgeInsets.all(AppConstants.defaultPadding),
              children: [
                _buildHeader(context),
                const SizedBox(height: 16),
                if (properties.isEmpty)
                  _buildEmptyState()
                else
                  ...properties.map(_buildPropertyCard),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Decouvrez nos biens a louer',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Connectez-vous ou creez un compte pour reserver et gerer vos paiements.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => Navigator.pushNamed(context, '/login'),
                    child: const Text('Se connecter'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pushNamed(context, '/register'),
                    child: const Text('Creer un compte'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.home_work_outlined, size: 70, color: Color(AppColors.textMuted)),
          const SizedBox(height: 16),
          const Text('Aucun bien disponible pour le moment'),
        ],
      ),
    );
  }

  Widget _buildPropertyCard(Property property) {
    final rentText = property.monthlyRent > 0
        ? '${property.monthlyRent.toStringAsFixed(0)} FCFA / mois'
        : 'Loyer sur demande';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.home, color: Color(AppColors.accent)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    property.address.isNotEmpty ? property.address : 'Propriete',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (property.city.isNotEmpty || property.postalCode.isNotEmpty)
              Text('${property.postalCode} ${property.city}'.trim()),
            const SizedBox(height: 8),
            Text(
              rentText,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}
