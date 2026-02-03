import '../core/api_client.dart';
import '../core/storage.dart';
import '../core/constants.dart';

/// Authentication service handling login, logout, and user session
class AuthService {
  final ApiClient _apiClient = ApiClient();

  /// Login with email and password (DEMO MODE)
  /// Returns true if login successful, false otherwise
  Future<bool> login(String email, String password) async {
    try {
      // DEMO MODE - Accept predefined credentials
      if (email == 'locataire@example.com' && password == 'motdepasse123') {
        // Generate fake token and user ID
        const fakeToken = 'fake_jwt_token_demo_12345';
        const fakeUserId = 'demo_user_123';
        
        // Save to local storage
        await StorageService.saveToken(fakeToken);
        await StorageService.saveUserId(fakeUserId);
        return true;
      }
      
      // Also accept any non-empty credentials for demo purposes
      if (email.isNotEmpty && password.isNotEmpty) {
        const fakeToken = 'fake_jwt_token_demo_any';
        const fakeUserId = 'demo_user_any';
        
        await StorageService.saveToken(fakeToken);
        await StorageService.saveUserId(fakeUserId);
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