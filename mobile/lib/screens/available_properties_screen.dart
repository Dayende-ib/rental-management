import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:async';
import '../core/api_client.dart';
import '../core/constants.dart';
import '../core/models.dart';
import '../core/services/realtime_sync_service.dart';
import '../core/storage.dart';
import 'payments_screen.dart';

class AvailablePropertyItem {
  final Property property;
  final String status;
  final String type;
  final String description;
  final String contractId;
  final String contractStatus;
  final bool contractSignedByTenant;
  final bool contractSignedByLandlord;
  final DateTime? contractEndDate;

  AvailablePropertyItem({
    required this.property,
    required this.status,
    required this.type,
    required this.description,
    this.contractId = '',
    this.contractStatus = '',
    this.contractSignedByTenant = false,
    this.contractSignedByLandlord = false,
    this.contractEndDate,
  });

  bool get isAvailable => status.isEmpty || status == 'available';
}

enum PropertyViewMode { available, mine }

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
  StreamSubscription<RealtimeEvent>? _realtimeSubscription;
  Timer? _refreshDebounce;
  PropertyViewMode _viewMode = PropertyViewMode.available;
  String _currentUserRole = '';
  String _currentUserId = '';
  int _availableCount = 0;
  int _mineCount = 0;

  @override
  void initState() {
    super.initState();
    _propertiesFuture = _loadProperties();
    _initializeUserContext();
    _refreshCounts();
    _realtimeSubscription = RealtimeSyncService.instance.stream.listen((event) {
      final entity = event.entity.toLowerCase();
      if (entity == 'properties' ||
          entity == 'contracts' ||
          entity == 'payments' ||
          entity == 'maintenance' ||
          entity == 'system') {
        _refreshDebounce?.cancel();
        _refreshDebounce = Timer(const Duration(milliseconds: 250), () {
          if (!mounted) return;
          _refresh();
        });
      }
    });
  }

  @override
  void dispose() {
    _refreshDebounce?.cancel();
    _realtimeSubscription?.cancel();
    super.dispose();
  }

  bool get _canUseOwnerView =>
      _currentUserRole == 'admin' || _currentUserRole == 'manager';
  bool get _canUseMineView => _currentUserRole == 'tenant' || _canUseOwnerView;

  Future<void> _initializeUserContext() async {
    try {
      final profile = await _apiClient.get(AppConstants.profileEndpoint);
      final role = (profile['role'] ?? '').toString();
      final userId = (profile['id'] ?? '').toString();
      if (!mounted) return;
      setState(() {
        _currentUserRole = role;
        _currentUserId = userId;
        _propertiesFuture = _loadProperties();
      });
      await _refreshCounts();
    } catch (_) {
      // Fallback: authenticated mobile app is tenant by design.
      if (!mounted) return;
      final hasSession = (StorageService.getToken() ?? '').isNotEmpty;
      if (hasSession) {
        setState(() {
          _currentUserRole = 'tenant';
          _propertiesFuture = _loadProperties();
        });
      }
    }
  }

  Future<List<AvailablePropertyItem>> _loadProperties() async {
    final endpoint = _buildPropertiesEndpoint();
    final data = await _apiClient.getList(endpoint);
    Map<String, Map<String, dynamic>> contractsByProperty = {};

    if (_currentUserRole == 'tenant') {
      final contracts = await _apiClient.getList(AppConstants.contractsEndpoint);
      for (final item in contracts) {
        if (item is! Map<String, dynamic>) continue;
        final propertyId = (item['property_id'] ?? '').toString();
        if (propertyId.isEmpty) continue;
        final current = contractsByProperty[propertyId];
        if (current == null) {
          contractsByProperty[propertyId] = item;
          continue;
        }
        final currentDate =
            DateTime.tryParse((current['created_at'] ?? '').toString()) ??
            DateTime.fromMillisecondsSinceEpoch(0);
        final itemDate =
            DateTime.tryParse((item['created_at'] ?? '').toString()) ??
            DateTime.fromMillisecondsSinceEpoch(0);
        if (itemDate.isAfter(currentDate)) {
          contractsByProperty[propertyId] = item;
        }
      }
    }

    return _toPropertyItems(
      data,
      mode: _viewMode,
      contractsByProperty: contractsByProperty,
    );
  }

  List<AvailablePropertyItem> _toPropertyItems(
    List<dynamic> data, {
    required PropertyViewMode mode,
    bool applyOwnerFilter = true,
    Map<String, Map<String, dynamic>>? contractsByProperty,
  }) {
    final properties = <AvailablePropertyItem>[];
    for (final item in data) {
      if (item is! Map<String, dynamic>) continue;
      final status = (item['status'] ?? '').toString();
      if (mode == PropertyViewMode.mine &&
          applyOwnerFilter &&
          _canUseOwnerView) {
        final ownerId = (item['owner_id'] ?? '').toString();
        if (ownerId.isEmpty || ownerId != _currentUserId) {
          continue;
        }
      }

      final propertyId = (item['id'] ?? '').toString();
      final contract = contractsByProperty?[propertyId];
      properties.add(
        AvailablePropertyItem(
          property: Property.fromJson(item),
          status: status,
          type: (item['type'] ?? '').toString(),
          description: (item['description'] ?? '').toString(),
          contractId: (contract?['id'] ?? '').toString(),
          contractStatus: (contract?['status'] ?? '').toString(),
          contractSignedByTenant:
              (contract?['signed_by_tenant'] ?? false) == true,
          contractSignedByLandlord:
              (contract?['signed_by_landlord'] ?? false) == true,
          contractEndDate: DateTime.tryParse(
            (contract?['end_date'] ?? '').toString(),
          ),
        ),
      );
    }
    return properties;
  }

  String _buildPropertiesEndpoint() {
    if (_viewMode == PropertyViewMode.mine && _currentUserRole == 'tenant') {
      return '${AppConstants.propertiesEndpoint}?scope=mine';
    }
    final hasSession = (StorageService.getToken() ?? '').isNotEmpty;
    if (_viewMode == PropertyViewMode.available &&
        (_currentUserRole == 'tenant' || (hasSession && _currentUserRole != 'guest'))) {
      return '${AppConstants.propertiesEndpoint}?include_unavailable=1';
    }
    return AppConstants.propertiesEndpoint;
  }

  Future<void> _refreshCounts() async {
    try {
      int availableCount = 0;
      int mineCount = 0;

      if (_currentUserRole == 'tenant') {
        final availableData = await _apiClient.getList(
          '${AppConstants.propertiesEndpoint}?include_unavailable=1',
        );
        availableCount = _toPropertyItems(
          availableData,
          mode: PropertyViewMode.available,
          applyOwnerFilter: false,
        ).length;

        final mineData = await _apiClient.getList(
          '${AppConstants.propertiesEndpoint}?scope=mine',
        );
        mineCount = _toPropertyItems(
          mineData,
          mode: PropertyViewMode.mine,
          applyOwnerFilter: false,
        ).length;
      } else if (_canUseOwnerView) {
        final data = await _apiClient.getList(AppConstants.propertiesEndpoint);
        availableCount = _toPropertyItems(
          data,
          mode: PropertyViewMode.available,
        ).length;
        mineCount = _toPropertyItems(data, mode: PropertyViewMode.mine).length;
      } else {
        final data = await _apiClient.getList(AppConstants.propertiesEndpoint);
        availableCount = _toPropertyItems(
          data,
          mode: PropertyViewMode.available,
          applyOwnerFilter: false,
        ).length;
      }

      if (!mounted) return;
      setState(() {
        _availableCount = availableCount;
        _mineCount = mineCount;
      });
    } catch (_) {
      // Ignore counts refresh failures.
    }
  }

  Future<void> _refresh() async {
    setState(() {
      _propertiesFuture = _loadProperties();
    });
    await _propertiesFuture;
    await _refreshCounts();
  }

  Future<void> _requestRental(BuildContext context, Property property) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      builder: (sheetContext) {
        bool isSubmitting = false;
        String? errorText;
        PlatformFile? signedFile;
        bool acceptedTerms = false;
        return StatefulBuilder(
          builder: (ctx, setStateSheet) => SafeArea(
            child: Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 16,
                bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 16,
              ),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Louer: ${property.title}',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      property.address,
                      style: const TextStyle(color: Colors.black54),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${property.monthlyRent.toStringAsFixed(0)} FCFA / mois',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 14),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.blue.shade100),
                      ),
                      child: const Text(
                        'Procedure:\n'
                        '1. Telechargez le contrat modele.\n'
                        '2. Imprimez et remplissez-le.\n'
                        '3. Scannez/convertissez le contrat signe en PDF.\n'
                        '4. Uploadez le PDF ci-dessous puis envoyez.',
                      ),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: () async {
                        final ok = await _downloadContractTemplate(property.id);
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              ok
                                  ? 'Ouverture du contrat modele...'
                                  : 'Impossible de telecharger le contrat modele',
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.download_outlined),
                      label: const Text('Telecharger le contrat'),
                    ),
                    const SizedBox(height: 10),
                    OutlinedButton.icon(
                      onPressed: () async {
                        final result = await FilePicker.platform.pickFiles(
                          type: FileType.custom,
                          allowedExtensions: ['pdf'],
                          withData: true,
                        );
                        if (result == null || result.files.isEmpty) return;
                        setStateSheet(() {
                          signedFile = result.files.first;
                        });
                      },
                      icon: const Icon(Icons.upload_file),
                      label: Text(
                        signedFile == null
                            ? 'Uploader le contrat rempli (PDF)'
                            : 'PDF: ${signedFile!.name}',
                      ),
                    ),
                    const SizedBox(height: 10),
                    CheckboxListTile(
                      value: acceptedTerms,
                      onChanged: isSubmitting
                          ? null
                          : (value) {
                              setStateSheet(() {
                                acceptedTerms = value == true;
                              });
                            },
                      title: const Text('J\'ai lu et approuve le contrat'),
                      subtitle: const Text(
                        'Cette case est obligatoire avant l\'envoi du PDF signe.',
                      ),
                      contentPadding: EdgeInsets.zero,
                      controlAffinity: ListTileControlAffinity.leading,
                    ),
                    if (errorText != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        errorText!,
                        style: const TextStyle(
                          color: Colors.red,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: isSubmitting
                            ? null
                            : () async {
                                if (signedFile?.bytes == null ||
                                    (signedFile?.bytes?.isEmpty ?? true)) {
                                  setStateSheet(() {
                                    errorText =
                                        'Veuillez uploader le contrat rempli en PDF.';
                                  });
                                  return;
                                }
                                if (!acceptedTerms) {
                                  setStateSheet(() {
                                    errorText =
                                        'Veuillez cocher "J\'ai lu et approuve le contrat" avant l\'envoi.';
                                  });
                                  return;
                                }

                                setStateSheet(() {
                                  isSubmitting = true;
                                  errorText = null;
                                });

                                final submitError = await _submitSignedContract(
                                  property.id,
                                  signedFile!,
                                );

                                if (!mounted) return;
                                if (submitError != null) {
                                  setStateSheet(() {
                                    isSubmitting = false;
                                    errorText = submitError;
                                  });
                                  return;
                                }

                                if (!ctx.mounted) return;
                                Navigator.pop(ctx);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Contrat envoye. Patientez la validation du bailleur avant de passer au paiement.',
                                    ),
                                  ),
                                );
                                await _refresh();
                              },
                        child: isSubmitting
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Text('Envoyer la demande'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Future<bool> _downloadContractTemplate(String propertyId) async {
    try {
      final response = await _apiClient.get(
        '${AppConstants.propertiesEndpoint}/$propertyId/contract-template',
      );
      final url = (response['download_url'] ?? '').toString();
      if (url.isEmpty) return false;
      final uri = Uri.tryParse(url);
      if (uri == null) return false;
      return launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      return false;
    }
  }

  Future<String?> _submitSignedContract(
    String propertyId,
    PlatformFile signedFile,
  ) async {
    try {
      if (signedFile.bytes == null || signedFile.bytes!.isEmpty) {
        return 'Le PDF selectionne est invalide ou vide.';
      }

      final lowerName = signedFile.name.toLowerCase();
      if (!lowerName.endsWith('.pdf')) {
        return 'Fichier invalide: veuillez choisir un document PDF.';
      }

      String? contractId;
      try {
        final created = await _apiClient.post(
          AppConstants.contractsEndpoint,
          body: {'property_id': propertyId},
        );
        contractId = (created['id'] ?? '').toString();
      } catch (e) {
        final msg = e.toString().toLowerCase();
        final isConflict =
            msg.contains('conflit') ||
            msg.contains('already') ||
            msg.contains('deja');
        if (!isConflict) {
          final raw = e.toString().trim();
          if (raw.isNotEmpty) return raw;
          return "Creation de la demande impossible. Verifiez la connexion et reessayez.";
        }

        final contracts = await _apiClient.getList(AppConstants.contractsEndpoint);
        for (final item in contracts) {
          if (item is! Map<String, dynamic>) continue;
          final sameProperty = (item['property_id'] ?? '').toString() == propertyId;
          final status = (item['status'] ?? '').toString().toLowerCase();
          if (sameProperty && status == 'draft') {
            contractId = (item['id'] ?? '').toString();
            break;
          }
        }
      }

      if (contractId == null || contractId.isEmpty) {
        return "Creation de la demande impossible. Reessayez.";
      }

      await _apiClient.uploadFile(
        '${AppConstants.contractsEndpoint}/$contractId/signed-document',
        bytes: signedFile.bytes!,
        filename: signedFile.name,
        mimeType: 'application/pdf',
      );

      return null;
    } catch (e) {
      final raw = e.toString().trim();
      if (raw.isNotEmpty) return raw;
      return "Envoi impossible. Verifiez le PDF ou la connexion.";
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          _viewMode == PropertyViewMode.available
              ? 'Biens disponibles'
              : 'Mes biens',
        ),
      ),
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
                if (_canUseMineView) _buildViewSwitch(),
                if (_canUseMineView) const SizedBox(height: 12),
                if (_viewMode == PropertyViewMode.mine)
                  _buildContractEndAlerts(properties),
                if (_viewMode == PropertyViewMode.mine)
                  const SizedBox(height: 12),
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
          Text(
            _viewMode == PropertyViewMode.available
                ? 'Aucun bien disponible pour le moment'
                : (_currentUserRole == 'tenant'
                      ? 'Aucun bien lie a vos contrats actifs'
                      : 'Aucun bien personnel trouve'),
          ),
        ],
      ),
    );
  }

  Widget _buildViewSwitch() {
    final isMine = _viewMode == PropertyViewMode.mine;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(AppColors.surface),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(AppColors.border)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              'Disponibles ($_availableCount)',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
          Switch(
            value: isMine,
            onChanged: (value) {
              setState(() {
                _viewMode = value
                    ? PropertyViewMode.mine
                    : PropertyViewMode.available;
                _propertiesFuture = _loadProperties();
              });
              _refreshCounts();
            },
          ),
          Expanded(
            child: Align(
              alignment: Alignment.centerRight,
              child: Text(
                'Mes biens ($_mineCount)',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPropertyCard(AvailablePropertyItem item) {
    final property = item.property;
    final status = item.status.toLowerCase();
    final isUnavailable = status.isNotEmpty && status != 'available';
    final isRented = status == 'rented';
    String statusLabel;
    Color statusBgColor;
    Color statusTextColor;
    if (status.isEmpty || status == 'available') {
      statusLabel = 'Disponible';
      statusBgColor = const Color(AppColors.accentLight);
      statusTextColor = const Color(AppColors.accent);
    } else if (status == 'rented') {
      statusLabel = 'Sous contrat';
      statusBgColor = Colors.red.shade100;
      statusTextColor = Colors.red.shade800;
    } else if (status == 'maintenance') {
      statusLabel = 'Maintenance';
      statusBgColor = Colors.orange.shade100;
      statusTextColor = Colors.orange.shade800;
    } else if (status == 'sold') {
      statusLabel = 'Vendu';
      statusBgColor = Colors.grey.shade300;
      statusTextColor = Colors.grey.shade800;
    } else {
      statusLabel = item.status;
      statusBgColor = Colors.grey.shade200;
      statusTextColor = Colors.grey.shade800;
    }
    final rentText = property.monthlyRent > 0
        ? '${property.monthlyRent.toStringAsFixed(0)} FCFA / mois'
        : 'Loyer sur demande';
    final location = '${property.postalCode} ${property.city}'.trim();
    final surfaceText = property.surface > 0
        ? '${property.surface.toStringAsFixed(0)} m2'
        : '';
    final roomsText = property.rooms > 0 ? '${property.rooms} pieces' : '';
    final contractStatusText = _getContractStatusLabel(item);
    final hasContractStatus = contractStatusText.isNotEmpty;

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
                    color: statusBgColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    statusLabel,
                    style: TextStyle(
                      color: statusTextColor,
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
            if (_viewMode == PropertyViewMode.mine && hasContractStatus) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.blue.shade100),
                ),
                child: Text(
                  'Statut contrat: $contractStatusText',
                  style: TextStyle(
                    color: Colors.blue.shade800,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
            if (_viewMode == PropertyViewMode.mine && _currentUserRole == 'tenant') ...[
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _canSubmitPaymentFromContractStatus(item.contractStatus)
                      ? () async {
                          await Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => PaymentsScreen(
                                initialContractId: item.contractId,
                                initialPropertyLabel:
                                    item.property.address.isNotEmpty
                                        ? item.property.address
                                        : item.property.title,
                                initialMonthlyRent: item.property.monthlyRent,
                              ),
                            ),
                          );
                        }
                      : null,
                  icon: const Icon(Icons.receipt_long),
                  label: Text(
                    _canSubmitPaymentFromContractStatus(item.contractStatus)
                        ? 'Payer et envoyer une preuve'
                        : 'Paiement disponible apres validation du contrat',
                  ),
                ),
              ),
              if (!_canSubmitPaymentFromContractStatus(item.contractStatus)) ...[
                const SizedBox(height: 8),
                Text(
                  'Veuillez patienter: le bailleur doit valider le contrat avant le paiement.',
                  style: TextStyle(
                    color: Colors.orange.shade800,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
            if (item.description.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(item.description),
            ],
            if (_viewMode == PropertyViewMode.available) ...[
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: isUnavailable
                      ? null
                      : () => _requestRental(context, property),
                  icon: const Icon(Icons.key),
                  label: Text(isRented ? 'Bien indisponible' : 'Louer ce bien'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isUnavailable
                        ? Colors.red.shade100
                        : const Color(AppColors.accent),
                    foregroundColor: isUnavailable
                        ? Colors.red.shade800
                        : Colors.white,
                    disabledBackgroundColor: Colors.red.shade100,
                    disabledForegroundColor: Colors.red.shade800,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _getContractStatusLabel(AvailablePropertyItem item) {
    final status = item.contractStatus.toLowerCase();

    if (status == 'active') {
      return 'Valide';
    }
    if (status == 'terminated') {
      return 'Rejete ou resilie';
    }
    if (status == 'expired') {
      return 'Expire';
    }
    if (status == 'draft') {
      if (item.contractSignedByTenant && !item.contractSignedByLandlord) {
        return 'En attente de validation du bailleur';
      }
      if (!item.contractSignedByTenant) {
        return 'Brouillon (signature locataire manquante)';
      }
      return 'Brouillon';
    }
    return status.isEmpty ? '' : status;
  }

  bool _canSubmitPaymentFromContractStatus(String contractStatus) {
    final status = contractStatus.toLowerCase();
    return status == 'active';
  }

  Widget _buildContractEndAlerts(List<AvailablePropertyItem> items) {
    final now = DateTime.now();
    final alerts = items.where((item) {
      if (item.contractStatus.toLowerCase() != 'active') return false;
      final end = item.contractEndDate;
      if (end == null) return false;
      final days = end.difference(now).inDays;
      return days <= 30;
    }).toList()
      ..sort((a, b) {
        final aDays = (a.contractEndDate ?? now).difference(now).inDays;
        final bDays = (b.contractEndDate ?? now).difference(now).inDays;
        return aDays.compareTo(bDays);
      });

    if (alerts.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Alertes fin de contrat',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            ...alerts.take(6).map((item) {
              final end = item.contractEndDate!;
              final days = end.difference(now).inDays;
              final expired = days < 0;
              final color = expired ? Colors.red : Colors.orange;
              final label = expired
                  ? 'Contrat expire depuis ${days.abs()} jour(s)'
                  : 'Contrat se termine dans ${days + 1} jour(s)';
              return Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.shade50,
                  border: Border.all(color: color.shade200),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$label - ${item.property.address}',
                  style: TextStyle(
                    color: color.shade800,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}
