import 'package:flutter/material.dart';
import '../maintenance/maintenance_service.dart';
import '../core/constants.dart';

/// Screen for creating new maintenance requests
class CreateMaintenanceScreen extends StatefulWidget {
  const CreateMaintenanceScreen({super.key});

  @override
  State<CreateMaintenanceScreen> createState() => _CreateMaintenanceScreenState();
}

class _CreateMaintenanceScreenState extends State<CreateMaintenanceScreen> {
  final MaintenanceService _maintenanceService = MaintenanceService();
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  /// Handle submit button press
  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final success = await _maintenanceService.createMaintenanceRequest(
        _descriptionController.text.trim(),
      );

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Demande de maintenance créée avec succès'),
            backgroundColor: Colors.green,
          ),
        );
        
        // Navigate back to maintenance list
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Erreur lors de la création de la demande'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erreur: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nouvelle Demande'),
      ),
      body: Padding(
        padding: EdgeInsets.all(AppConstants.defaultPadding),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Décrivez votre problème de maintenance',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 20),

              // Description input
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description détaillée',
                  hintText: 'Ex: Fuite d\'eau dans la cuisine, prise électrique défectueuse...',
                  alignLabelWithHint: true,
                ),
                maxLines: 6,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Veuillez décrire votre problème';
                  }
                  if (value.length < 10) {
                    return 'La description doit contenir au moins 10 caractères';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),

              // Tips
              Container(
                padding: EdgeInsets.all(AppConstants.smallPadding),
                decoration: BoxDecoration(
                  color: const Color(AppColors.surface),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(AppColors.border)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Conseils pour une bonne description:',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text('• Soyez précis sur l\'emplacement', style: Theme.of(context).textTheme.bodySmall),
                    Text('• Décrivez quand le problème est apparu', style: Theme.of(context).textTheme.bodySmall),
                    Text('• Indiquez si c\'est urgent', style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Submit button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _handleSubmit,
                  child: _isLoading
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          'Envoyer la demande',
                          style: TextStyle(fontSize: 16),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
