import '../core/api_client.dart';
import '../core/storage.dart';
import '../core/constants.dart';
import '../core/models.dart';

/// Authentication service handling login, logout, and user session
class AuthService {
  final ApiClient _apiClient = ApiClient();

  /// Login with email and password
  /// Returns true if login successful, false otherwise
  Future<bool> login(String email, String password) async {
    try {
      final response = await _apiClient.post(
        AppConstants.loginEndpoint,
        body: {
          'email': email,
          'password': password,
        },
        requiresAuth: false,
      );

      final token = _extractToken(response);
      if (token == null || token.isEmpty) {
        return false;
      }

      await StorageService.saveToken(token);
      final userId = _extractUserId(response);
      if (userId != null && userId.isNotEmpty) {
        await StorageService.saveUserId(userId);
      }
      return true;
    } catch (e) {
      print('Login error: $e');
      return false;
    }
  }

  /// Logout current user
  /// Clears all stored data and returns to login screen
  Future<void> logout() async {
    try {
      await _apiClient.post(AppConstants.logoutEndpoint);
    } catch (_) {}
    await StorageService.removeToken();
    await StorageService.removeUserId();
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
      final data = await _apiClient.get(AppConstants.tenantProfileEndpoint);
      return Tenant.fromJson(data);
    } catch (_) {
      final data = await _apiClient.get(AppConstants.profileEndpoint);
      return Tenant.fromJson(data);
    }
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
}
