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
}