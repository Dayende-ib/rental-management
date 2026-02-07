import 'package:flutter/material.dart';
import 'package:rental_management/auth/auth_service.dart';
import 'package:rental_management/screens/login_screen.dart';
import 'package:rental_management/screens/home_screen.dart';
import 'package:rental_management/screens/payments_screen.dart';
import 'package:rental_management/screens/maintenance_list_screen.dart';
import 'package:rental_management/screens/create_maintenance_screen.dart';
import 'package:rental_management/screens/profile_screen.dart';
import 'package:rental_management/screens/register_screen.dart';
import 'package:rental_management/screens/guest_properties_screen.dart';
import 'package:rental_management/core/constants.dart';
import 'package:google_fonts/google_fonts.dart';

/// Main application widget with routing configuration
class RentalApp extends StatefulWidget {
  const RentalApp({super.key});

  @override
  State<RentalApp> createState() => _RentalAppState();
}

class _RentalAppState extends State<RentalApp> {
  final AuthService _authService = AuthService();
  final Set<String> _publicRoutes = const {
    '/login',
    '/register',
    '/guest-properties',
  };

  Route<dynamic> _onGenerateRoute(RouteSettings settings) {
    final name = settings.name ?? '/';
    final isAuthed = _authService.isAuthenticated();
    final isPublic = _publicRoutes.contains(name);

    if (!isAuthed && !isPublic) {
      return MaterialPageRoute(
        builder: (_) => const LoginScreen(),
        settings: const RouteSettings(name: '/login'),
      );
    }

    switch (name) {
      case '/login':
        return MaterialPageRoute(builder: (_) => const LoginScreen(), settings: settings);
      case '/register':
        return MaterialPageRoute(builder: (_) => const RegisterScreen(), settings: settings);
      case '/guest-properties':
        return MaterialPageRoute(builder: (_) => const GuestPropertiesScreen(), settings: settings);
      case '/home':
        return MaterialPageRoute(builder: (_) => const HomeScreen(), settings: settings);
      case '/payments':
        return MaterialPageRoute(builder: (_) => const PaymentsScreen(), settings: settings);
      case '/maintenance':
        return MaterialPageRoute(builder: (_) => const MaintenanceListScreen(), settings: settings);
      case '/create-maintenance':
        return MaterialPageRoute(builder: (_) => const CreateMaintenanceScreen(), settings: settings);
      case '/profile':
        return MaterialPageRoute(builder: (_) => const ProfileScreen(), settings: settings);
      default:
        return MaterialPageRoute(builder: (_) => const LoginScreen(), settings: settings);
    }
  }

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
      onGenerateRoute: _onGenerateRoute,
    );
  }
}
