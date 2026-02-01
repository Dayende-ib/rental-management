import 'package:flutter/material.dart';
import 'core/storage.dart';
import 'app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize shared preferences
  await StorageService.init();
  
  runApp(const RentalManagementApp());
}

class RentalManagementApp extends StatelessWidget {
  const RentalManagementApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const RentalApp();
  }
}
