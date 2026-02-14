import 'package:flutter/foundation.dart';
import 'storage.dart';

// Constants for the Rental Management Application
class AppConstants {
  // API Configuration
  static const String _defaultAndroidBaseUrl =
      'http://10.0.2.2:5000/api';
  static const String _defaultIosBaseUrl =
      'http://localhost:5000/api';
  static const String _defaultWebBaseUrl =
      'http://localhost:5000/api';
  static const String _defaultOtherBaseUrl =
      'http://localhost:5000/api';

  static String get baseUrl {
    // Check local storage first (manual override)
    final storedUrl = StorageService.getBaseUrl();
    if (storedUrl != null && storedUrl.isNotEmpty) {
      return storedUrl;
    }

    const String envBaseUrl = String.fromEnvironment('API_BASE_URL');
    if (envBaseUrl.isNotEmpty) {
      return envBaseUrl;
    }
    if (kIsWeb) {
      return kDebugMode ? _defaultWebBaseUrl : 'https://rental-management-production-e42c.up.railway.app/api';
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return kDebugMode ? _defaultAndroidBaseUrl : 'https://rental-management-production-e42c.up.railway.app/api';
      case TargetPlatform.iOS:
        return kDebugMode ? _defaultIosBaseUrl : 'https://rental-management-production-e42c.up.railway.app/api';
      default:
        return kDebugMode ? _defaultOtherBaseUrl : 'https://rental-management-production-e42c.up.railway.app/api';
    }
  }

  static const String loginEndpoint = '/auth/login';
  static const String registerEndpoint = '/auth/register';
  static const String logoutEndpoint = '/auth/logout';
  static const String refreshEndpoint = '/auth/refresh-session';
  static const String profileEndpoint = '/auth/profile';
  static const String tenantProfileEndpoint = '/mobile/me';
  static const String paymentsEndpoint = '/mobile/payments';
  static const String maintenanceEndpoint = '/mobile/maintenance';
  static const String propertiesEndpoint = '/mobile/properties';
  static const String contractsEndpoint = '/mobile/contracts';

  // Storage Keys
  static const String tokenKey = 'jwt_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userIdKey = 'user_id';
  static const String userFullNameKey = 'user_full_name';
  static const String userEmailKey = 'user_email';
  static const String customBaseUrlKey = 'custom_base_url';
  static const String lastLoginKey = 'last_login_date';

  // App Configuration
  static const String appName = 'PropiFlow';
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

  static const List<int> gradient = [_emerald, _emeraldSoft, _emeraldLight];
}
