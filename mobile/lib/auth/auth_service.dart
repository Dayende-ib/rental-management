import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import '../core/storage.dart';
import '../core/constants.dart';
import '../core/models.dart';
import '../core/database/database_helper.dart';

/// Authentication service handling login, logout, and user session
class AuthService {
  final ApiClient _apiClient = ApiClient();

  /// Login with email and password
  /// Returns true if login successful, false otherwise
  Future<bool> login(String email, String password) async {
    try {
      final normalizedEmail = email.trim().toLowerCase();
      final response = await _apiClient.post(
        AppConstants.loginEndpoint,
        body: {'email': normalizedEmail, 'password': password},
        requiresAuth: false,
      );

      final token = _extractToken(response);
      if (token == null || token.isEmpty) {
        return false;
      }

      await StorageService.saveToken(token);
      await StorageService.saveLoginDate();

      final refreshToken = _extractRefreshToken(response);
      if (refreshToken != null) {
        await StorageService.saveRefreshToken(refreshToken);
      }

      final userId = _extractUserId(response);
      if (userId != null && userId.isNotEmpty) {
        await StorageService.saveUserId(userId);
      }

      // Mobile app is tenant-only.
      final profile = await _apiClient.get(AppConstants.profileEndpoint);
      final role = (profile['role'] ?? '').toString();
      if (role.isNotEmpty && role != 'tenant') {
        await logout();
        return false;
      }
      await _persistProfileIdentity(profile, fallbackEmail: normalizedEmail);

      // Ensure previous user's offline cache is never reused across sessions.
      await DatabaseHelper.instance.clearAll();

      return true;
    } catch (e) {
      debugPrint('Login error: $e');
      return false;
    }
  }

  /// Register a new user
  Future<bool> register(String fullName, String email, String password) async {
    try {
      final normalizedEmail = email.trim().toLowerCase();
      final response = await _apiClient.post(
        AppConstants.registerEndpoint,
        body: {
          'email': normalizedEmail,
          'password': password,
          'full_name': fullName,
          'role': 'tenant',
        },
        requiresAuth: false,
      );
      final token = _extractToken(response);
      if (token != null && token.isNotEmpty) {
        await StorageService.saveToken(token);
        await StorageService.saveLoginDate();
        await StorageService.saveUserFullName(fullName.trim());
        await StorageService.saveUserEmail(normalizedEmail);

        final refreshToken = _extractRefreshToken(response);
        if (refreshToken != null) {
          await StorageService.saveRefreshToken(refreshToken);
        }

        final userId = _extractUserId(response);
        if (userId != null && userId.isNotEmpty) {
          await StorageService.saveUserId(userId);
        }
        return true;
      }

      // If backend doesn't return a session, try logging in
      return await login(normalizedEmail, password);
    } catch (e) {
      debugPrint('Register error: $e');
      return false;
    }
  }

  /// Logout current user
  /// Clears all stored data and returns to login screen
  Future<void> logout() async {
    try {
      await _apiClient.post(AppConstants.logoutEndpoint);
    } catch (_) {}
    await DatabaseHelper.instance.clearAll();
    await StorageService.removeToken();
    await StorageService.removeUserId();
    await StorageService.removeUserFullName();
    await StorageService.removeUserEmail();
  }

  /// Check if user is currently authenticated
  bool isAuthenticated() {
    return StorageService.isLoggedIn();
  }

  /// Get current user ID
  String? getCurrentUserId() {
    return StorageService.getUserId();
  }

  /// Validate current session by fetching user profile
  Future<bool> validateSession() async {
    try {
      await _apiClient.get(AppConstants.profileEndpoint);
      return true;
    } catch (e) {
      // Session invalid, logout
      await logout();
      return false;
    }
  }

  /// Fetch current tenant profile
  Future<Tenant> getCurrentTenant() async {
    try {
      final tenantData = await _apiClient.get(
        AppConstants.tenantProfileEndpoint,
      );
      Map<String, dynamic>? profileData;
      try {
        profileData = await _apiClient.get(AppConstants.profileEndpoint);
      } catch (_) {}

      final tenant = _mergeTenantData(tenantData, profileData);
      await _persistProfileIdentity(
        profileData ?? tenantData,
        fallbackName: tenant.name,
        fallbackEmail: tenant.email,
      );
      return tenant;
    } catch (_) {
      final profileData = await _apiClient.get(AppConstants.profileEndpoint);
      final tenant = _mergeTenantData(profileData, null);
      await _persistProfileIdentity(
        profileData,
        fallbackName: tenant.name,
        fallbackEmail: tenant.email,
      );
      return tenant;
    }
  }

  /// Update current authenticated profile
  Future<void> updateProfile({required String fullName, String? phone}) async {
    final sanitizedFullName = fullName.trim();
    if (sanitizedFullName.length < 3) {
      throw Exception('Le nom doit contenir au moins 3 caracteres');
    }

    final payload = <String, dynamic>{
      'full_name': sanitizedFullName,
      'phone': (phone ?? '').trim().isEmpty ? null : phone!.trim(),
    };

    await _apiClient.put(AppConstants.profileEndpoint, body: payload);
    await StorageService.saveUserFullName(sanitizedFullName);
  }

  String? _extractToken(Map<String, dynamic> data) {
    final direct = data['access_token'] ?? data['accessToken'];
    if (direct is String && direct.isNotEmpty) return direct;
    final session = data['session'];
    if (session is Map<String, dynamic>) {
      final token = session['access_token'] ?? session['accessToken'];
      if (token is String && token.isNotEmpty) return token;
    }
    return null;
  }

  String? _extractRefreshToken(Map<String, dynamic> data) {
    final session = data['session'];
    if (session is Map<String, dynamic>) {
      final token = session['refresh_token'] ?? session['refreshToken'];
      if (token is String && token.isNotEmpty) return token;
    }
    return data['refresh_token'] ?? data['refreshToken'];
  }

  String? _extractUserId(Map<String, dynamic> data) {
    final user = data['user'];
    if (user is Map<String, dynamic> && user['id'] is String) {
      return user['id'] as String;
    }
    final session = data['session'];
    if (session is Map<String, dynamic>) {
      final sessionUser = session['user'];
      if (sessionUser is Map<String, dynamic> && sessionUser['id'] is String) {
        return sessionUser['id'] as String;
      }
    }
    return null;
  }

  Tenant _mergeTenantData(
    Map<String, dynamic> primary,
    Map<String, dynamic>? secondary,
  ) {
    final merged = <String, dynamic>{...?secondary, ...primary};

    final primaryName = (primary['full_name'] ?? primary['name'] ?? '')
        .toString()
        .trim();
    final secondaryName = (secondary?['full_name'] ?? secondary?['name'] ?? '')
        .toString()
        .trim();
    if (primaryName.isEmpty && secondaryName.isNotEmpty) {
      merged['full_name'] = secondaryName;
    }

    final primaryEmail = (primary['email'] ?? '').toString().trim();
    final secondaryEmail = (secondary?['email'] ?? '').toString().trim();
    if (primaryEmail.isEmpty && secondaryEmail.isNotEmpty) {
      merged['email'] = secondaryEmail;
    }

    return Tenant.fromJson(merged);
  }

  Future<void> _persistProfileIdentity(
    Map<String, dynamic> profile, {
    String? fallbackName,
    String? fallbackEmail,
  }) async {
    final fullName =
        (profile['full_name'] ?? profile['name'] ?? fallbackName ?? '')
            .toString()
            .trim();
    final email = (profile['email'] ?? fallbackEmail ?? '').toString().trim();

    if (fullName.isNotEmpty) {
      await StorageService.saveUserFullName(fullName);
    }
    if (email.isNotEmpty) {
      await StorageService.saveUserEmail(email);
    }
  }
}
