import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../core/constants.dart';
import '../core/models.dart';

class AvailablePropertyItem {
  final Property property;
  final String status;
  final String type;
  final String description;

  AvailablePropertyItem({
    required this.property,
    required this.status,
    required this.type,
    required this.description,
  });

  bool get isAvailable => status.isEmpty || status == 'available';
}

/// Authenticated view listing available properties
class AvailablePropertiesScreen extends StatefulWidget {
  const AvailablePropertiesScreen({super.key});

  @override
  State<AvailablePropertiesScreen> createState() =>
      _AvailablePropertiesScreenState();
}

class _AvailablePropertiesScreenState extends State<AvailablePropertiesScreen> {
  final ApiClient _apiClient = ApiClient();
  late Future<List<AvailablePropertyItem>> _propertiesFuture;

  @override
  void initState() {
    super.initState();
    _propertiesFuture = _loadProperties();
  }

  Future<List<AvailablePropertyItem>> _loadProperties() async {
    final data = await _apiClient.getList(AppConstants.propertiesEndpoint);
    final properties = <AvailablePropertyItem>[];
    for (final item in data) {
      if (item is Map<String, dynamic>) {
        final status = (item['status'] ?? '').toString();
        if (status.isNotEmpty && status != 'available') {
          continue;
        }
        final property = Property.fromJson(item);
        properties.add(
          AvailablePropertyItem(
            property: property,
            status: status,
            type: (item['type'] ?? '').toString(),
            description: (item['description'] ?? '').toString(),
          ),
        );
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

  Future<void> _requestRental(BuildContext context, Property property) async {
    try {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (c) => const Center(child: CircularProgressIndicator()),
      );

      // 1. Create Contract Request
      final response = await _apiClient.post(
        AppConstants.contractsEndpoint,
        body: {'property_id': property.id},
      );

      if (!mounted) return;
      Navigator.pop(context); // Close loading

      final contractId = response['id'];

      // 2. Show Confirmation Dialog
      _showContractDialog(context, contractId, property);
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context); // Close loading if active
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Erreur: ${e.toString().replaceAll("ApiException: ", "")}',
          ),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showContractDialog(
    BuildContext context,
    String contractId,
    Property property,
  ) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Contrat de location'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Propriété: ${property.title}'),
              Text('Loyer: ${property.monthlyRent} FCFA/mois'),
              const SizedBox(height: 16),
              const Text(
                'En acceptant, vous vous engagez à louer ce bien selon les termes du contrat standard.',
                textAlign: TextAlign.justify,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _rejectContract(contractId);
            },
            child: const Text('Refuser', style: TextStyle(color: Colors.red)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _acceptContract(contractId);
            },
            child: const Text('Accepter & Signer'),
          ),
        ],
      ),
    );
  }

  Future<void> _acceptContract(String contractId) async {
    try {
      await _apiClient.post(
        '${AppConstants.contractsEndpoint}/$contractId/accept',
      );
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Félicitations ! Le logement est loué.'),
          backgroundColor: Colors.green,
        ),
      );
      _refresh(); // Refresh list (property should disappear or show status)
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur lors de la signature: $e')),
      );
    }
  }

  Future<void> _rejectContract(String contractId) async {
    try {
      await _apiClient.post(
        '${AppConstants.contractsEndpoint}/$contractId/reject',
      );
      if (!mounted) return;

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Contrat refusé.')));
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Biens disponibles')),
      body: FutureBuilder<List<AvailablePropertyItem>>(
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

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.home_work_outlined,
            size: 70,
            color: Color(AppColors.textMuted),
          ),
          const SizedBox(height: 16),
          const Text('Aucun bien disponible pour le moment'),
        ],
      ),
    );
  }

  Widget _buildPropertyCard(AvailablePropertyItem item) {
    final property = item.property;
    final rentText = property.monthlyRent > 0
        ? '${property.monthlyRent.toStringAsFixed(0)} FCFA / mois'
        : 'Loyer sur demande';
    final location = '${property.postalCode} ${property.city}'.trim();
    final surfaceText = property.surface > 0
        ? '${property.surface.toStringAsFixed(0)} m²'
        : '';
    final roomsText = property.rooms > 0 ? '${property.rooms} pieces' : '';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
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
                const Icon(Icons.home, color: Color(AppColors.accent)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    property.address.isNotEmpty
                        ? property.address
                        : 'Propriete',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(AppColors.accentLight),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    'Disponible',
                    style: TextStyle(
                      color: Color(AppColors.accent),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            if (item.type.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text('Type: ${item.type}'),
            ],
            if (location.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(location),
            ],
            if (surfaceText.isNotEmpty || roomsText.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 12,
                runSpacing: 6,
                children: [
                  if (surfaceText.isNotEmpty)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.square_foot,
                          size: 16,
                          color: Colors.black54,
                        ),
                        const SizedBox(width: 4),
                        Text(surfaceText),
                      ],
                    ),
                  if (roomsText.isNotEmpty)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.meeting_room,
                          size: 16,
                          color: Colors.black54,
                        ),
                        const SizedBox(width: 4),
                        Text(roomsText),
                      ],
                    ),
                ],
              ),
            ],
            const SizedBox(height: 8),
            Text(rentText, style: const TextStyle(fontWeight: FontWeight.w600)),
            if (item.description.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(item.description),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _requestRental(context, property),
                icon: const Icon(Icons.key),
                label: const Text('Louer ce bien'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(AppColors.accent),
                  foregroundColor: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
