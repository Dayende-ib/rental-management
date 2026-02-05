import 'package:flutter/material.dart';
import 'auth/auth_service.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/payments_screen.dart';
import 'screens/maintenance_list_screen.dart';
import 'screens/create_maintenance_screen.dart';
import 'screens/profile_screen.dart';
import 'core/constants.dart';

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
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(AppColors.accent),
          brightness: Brightness.light,
          background: const Color(AppColors.background),
          surface: const Color(AppColors.surface),
        ),
        scaffoldBackgroundColor: const Color(AppColors.background),
        textTheme: const TextTheme(
          headlineSmall: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w600,
            color: Color(AppColors.textPrimary),
          ),
          titleMedium: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Color(AppColors.textPrimary),
          ),
          bodyMedium: TextStyle(
            fontSize: 14,
            color: Color(AppColors.textSecondary),
          ),
          bodySmall: TextStyle(
            fontSize: 12,
            color: Color(AppColors.textMuted),
          ),
        ),
        appBarTheme: const AppBarTheme(
          centerTitle: true,
          elevation: 0,
          backgroundColor: Color(AppColors.background),
          foregroundColor: Color(AppColors.textPrimary),
          surfaceTintColor: Colors.transparent,
        ),
        cardTheme: CardThemeData(
          color: const Color(AppColors.surface),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppConstants.cardRadius),
            side: const BorderSide(color: Color(AppColors.border)),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(AppColors.surface),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 14,
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppConstants.inputRadius),
            borderSide: const BorderSide(color: Color(AppColors.border)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppConstants.inputRadius),
            borderSide: const BorderSide(color: Color(AppColors.border)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppConstants.inputRadius),
            borderSide: const BorderSide(color: Color(AppColors.textPrimary)),
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(AppColors.accent),
            foregroundColor: const Color(AppColors.background),
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppConstants.inputRadius),
            ),
            minimumSize: const Size.fromHeight(AppConstants.buttonHeight),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(AppColors.textPrimary),
            side: const BorderSide(color: Color(AppColors.border)),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppConstants.inputRadius),
            ),
            minimumSize: const Size.fromHeight(AppConstants.buttonHeight),
          ),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Color(AppColors.background),
          selectedItemColor: Color(AppColors.textPrimary),
          unselectedItemColor: Color(AppColors.textMuted),
          showUnselectedLabels: true,
          elevation: 0,
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
