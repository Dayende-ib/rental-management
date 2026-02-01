import 'package:flutter/material.dart';
import 'auth/auth_service.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/payments_screen.dart';
import 'screens/maintenance_list_screen.dart';
import 'screens/create_maintenance_screen.dart';
import 'screens/profile_screen.dart';

/// Main application widget with routing configuration
class RentalApp extends StatefulWidget {
  const RentalApp({super.key});

  @override
  State<RentalApp> createState() => _RentalAppState();
}

class _RentalAppState extends State<RentalApp> {
  final AuthService _authService = AuthService();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Rental Management',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.blue,
          foregroundColor: Colors.white,
        ),
      ),
      home: _authService.isAuthenticated() 
          ? const HomeScreen() 
          : const LoginScreen(),
      routes: {
        '/login': (context) => const LoginScreen(),
        '/home': (context) => const HomeScreen(),
        '/payments': (context) => const PaymentsScreen(),
        '/maintenance': (context) => const MaintenanceListScreen(),
        '/create-maintenance': (context) => const CreateMaintenanceScreen(),
        '/profile': (context) => const ProfileScreen(),
      },
    );
  }
}