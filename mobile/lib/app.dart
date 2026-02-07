import 'package:flutter/material.dart';
import 'auth/auth_service.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/payments_screen.dart';
import 'screens/maintenance_list_screen.dart';
import 'screens/create_maintenance_screen.dart';
import 'screens/profile_screen.dart';
import 'core/constants.dart';
import 'package:google_fonts/google_fonts.dart';

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
    final baseTextTheme = GoogleFonts.poppinsTextTheme();
    final textTheme = baseTextTheme.copyWith(
      headlineSmall: baseTextTheme.headlineSmall?.copyWith(
        fontSize: 22,
        fontWeight: FontWeight.w600,
        color: const Color(AppColors.textPrimary),
      ),
      titleMedium: baseTextTheme.titleMedium?.copyWith(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: const Color(AppColors.textPrimary),
      ),
      bodyMedium: baseTextTheme.bodyMedium?.copyWith(
        fontSize: 14,
        color: const Color(AppColors.textSecondary),
      ),
      bodySmall: baseTextTheme.bodySmall?.copyWith(
        fontSize: 12,
        color: const Color(AppColors.textMuted),
      ),
    );

    return MaterialApp(
      title: 'Rental Management',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(AppColors.accent),
          brightness: Brightness.light,
          surface: const Color(AppColors.surface),
        ),
        scaffoldBackgroundColor: const Color(AppColors.background),
        textTheme: textTheme,
        appBarTheme: const AppBarTheme(
          centerTitle: true,
          elevation: 0,
          backgroundColor: Color(AppColors.background),
          foregroundColor: Color(AppColors.accent),
          surfaceTintColor: Colors.transparent,
        ),
        cardTheme: CardThemeData(
          color: const Color(AppColors.surface),
          elevation: 4,
          shadowColor: const Color(0x1A000000), // légère ombre diffuse
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
            borderSide: const BorderSide(color: Color(AppColors.accent)),
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
            minimumSize: const Size(0, AppConstants.buttonHeight),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(AppColors.accent),
            side: const BorderSide(color: Color(AppColors.accent)),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppConstants.inputRadius),
            ),
            minimumSize: const Size(0, AppConstants.buttonHeight),
          ),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Color(AppColors.background),
          selectedItemColor: Color(AppColors.accent),
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
