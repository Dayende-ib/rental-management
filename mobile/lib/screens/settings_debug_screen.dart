import 'package:flutter/material.dart';
import '../core/constants.dart';
import '../core/storage.dart';
import '../core/api_client.dart';

class SettingsDebugScreen extends StatefulWidget {
  const SettingsDebugScreen({super.key});

  @override
  State<SettingsDebugScreen> createState() => _SettingsDebugScreenState();
}

class _SettingsDebugScreenState extends State<SettingsDebugScreen> {
  final TextEditingController _urlController = TextEditingController();
  bool _isTesting = false;
  String? _testResult;
  bool _isSuccess = false;

  @override
  void initState() {
    super.initState();
    _urlController.text = AppConstants.baseUrl;
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _testConnection() async {
    setState(() {
      _isTesting = true;
      _testResult = null;
    });

    try {
      final client = ApiClient();
      // Test with a simple public endpoint or just checking if server responds
      // We'll try to fetch properties which might be public or return 401 (still means active)
      await client.get('/properties', requiresAuth: false);

      setState(() {
        _isSuccess = true;
        _testResult = 'Connecté avec succès !';
      });
    } on ApiException catch (e) {
      // 401 or 404 still means the server is active
      if (e.statusCode != 0) {
        setState(() {
          _isSuccess = true;
          _testResult = 'Serveur actif (Réponse: ${e.statusCode})';
        });
      } else {
        setState(() {
          _isSuccess = false;
          _testResult = 'Erreur: ${e.message}';
        });
      }
    } catch (e) {
      setState(() {
        _isSuccess = false;
        _testResult = 'Erreur de connexion: $e';
      });
    } finally {
      setState(() {
        _isTesting = false;
      });
    }
  }

  Future<void> _saveUrl() async {
    final url = _urlController.text.trim();
    if (url.isEmpty) return;

    await StorageService.saveBaseUrl(url);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('URL du backend mise à jour')),
      );
    }
  }

  Future<void> _resetUrl() async {
    await StorageService.removeBaseUrl();
    setState(() {
      _urlController.text = AppConstants.baseUrl;
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('URL réinitialisée par défaut')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Paramètres Debug')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Configuration du Backend',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _urlController,
              decoration: const InputDecoration(
                labelText: 'URL de l\'API',
                hintText: 'https://votre-api.com/api',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.link),
              ),
              keyboardType: TextInputType.url,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _isTesting ? null : _testConnection,
                    icon: _isTesting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.network_check),
                    label: const Text('Tester'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _saveUrl,
                    icon: const Icon(Icons.save),
                    label: const Text('Enregistrer'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: _resetUrl,
              icon: const Icon(Icons.restore),
              label: const Text('Réinitialiser par défaut'),
            ),
            if (_testResult != null) ...[
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: _isSuccess
                      ? Colors.green.withValues(alpha: 0.1)
                      : Colors.red.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: _isSuccess ? Colors.green : Colors.red,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      _isSuccess ? Icons.check_circle : Icons.error,
                      color: _isSuccess ? Colors.green : Colors.red,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _testResult!,
                        style: TextStyle(
                          color: _isSuccess
                              ? Colors.green.shade900
                              : Colors.red.shade900,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const Spacer(),
            const Text(
              'Note: Redémarrez l\'application pour garantir que tous les services utilisent la nouvelle URL.',
              style: TextStyle(
                fontStyle: FontStyle.italic,
                color: Colors.grey,
                fontSize: 12,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
