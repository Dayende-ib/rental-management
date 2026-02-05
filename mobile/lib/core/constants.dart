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
  static const int _black = 0xFF0E0E0E;
  static const int _white = 0xFFFFFFFF;
  static const int _gray50 = 0xFFF7F7F7;
  static const int _gray100 = 0xFFF0F0F0;
  static const int _gray200 = 0xFFE4E4E4;
  static const int _gray500 = 0xFF8A8A8A;
  static const int _gray700 = 0xFF4A4A4A;

  static const int background = _white;
  static const int surface = _gray50;
  static const int border = _gray200;
  static const int textPrimary = _black;
  static const int textSecondary = _gray700;
  static const int textMuted = _gray500;
  static const int accent = _black;
}
