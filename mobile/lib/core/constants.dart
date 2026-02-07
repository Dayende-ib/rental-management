// Constants for the Rental Management Application
class AppConstants {
  // API Configuration
  static const String baseUrl = 'https://api.rental-management.com/api';
  static const String loginEndpoint = '/auth/login';
  static const String tenantProfileEndpoint = '/tenants/me';
  static const String paymentsEndpoint = '/payments';
  static const String maintenanceEndpoint = '/maintenance';
  
  // Storage Keys
  static const String tokenKey = 'jwt_token';
  static const String userIdKey = 'user_id';
  
  // App Configuration
  static const String appName = 'Rental Management';
  static const int apiTimeoutSeconds = 30;
  
  // UI Constants
  static const double defaultPadding = 16.0;
  static const double smallPadding = 8.0;
  static const double largePadding = 24.0;
  static const double cardRadius = 16.0;
  static const double inputRadius = 12.0;
  static const double buttonHeight = 48.0;
}

class AppColors {
  static const int _emerald = 0xFF0F795C; // primaire
  static const int _emeraldSoft = 0xFF2FA67D;
  static const int _emeraldLight = 0xFF6BD3B1;
  static const int _background = 0xFFF5F7FA; // gris clair / beige
  static const int _white = 0xFFFFFFFF;
  static const int _black = 0xFF1F1F1F;
  static const int _gray500 = 0xFF8E95A3;
  static const int _gray300 = 0xFFDCE2EA;

  static const int background = _background;
  static const int surface = _white;
  static const int border = _gray300;
  static const int textPrimary = _black;
  static const int textSecondary = _gray500;
  static const int textMuted = _gray500;
  static const int accent = _emerald;
  static const int accentSoft = _emeraldSoft;
  static const int accentLight = _emeraldLight;

  static const List<int> gradient = [
    _emerald,
    _emeraldSoft,
    _emeraldLight,
  ];
}
