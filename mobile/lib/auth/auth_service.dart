import '../core/api_client.dart';
import '../core/storage.dart';
import '../core/constants.dart';

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
        requiresAuth: false, // Login doesn't require auth token
      );

      // Extract token and user info from response
      final token = response['token'] as String?;
      final userId = response['user']?['id'] as String?;

      if (token != null && userId != null) {
        // Save token and user ID to local storage
        await StorageService.saveToken(token);
        await StorageService.saveUserId(userId);
        return true;
      }

      return false;
    } catch (e) {
      print('Login error: $e');
      return false;
    }
  }

  /// Logout current user
  /// Clears all stored data and returns to login screen
  Future<void> logout() async {
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
      await _apiClient.get(AppConstants.tenantProfileEndpoint);
      return true;
    } catch (e) {
      // Session invalid, logout
      await logout();
      return false;
    }
  }
}