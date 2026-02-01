import 'package:shared_preferences/shared_preferences.dart';
import 'constants.dart';

/// Service for handling local storage operations
/// Manages JWT tokens and user preferences
class StorageService {
  static late SharedPreferences _prefs;

  /// Initialize the shared preferences instance
  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  /// Save JWT token to local storage
  static Future<bool> saveToken(String token) async {
    return await _prefs.setString(AppConstants.tokenKey, token);
  }

  /// Get JWT token from local storage
  static String? getToken() {
    return _prefs.getString(AppConstants.tokenKey);
  }

  /// Remove JWT token from local storage (logout)
  static Future<bool> removeToken() async {
    return await _prefs.remove(AppConstants.tokenKey);
  }

  /// Check if user is logged in
  static bool isLoggedIn() {
    return getToken() != null;
  }

  /// Save user ID to local storage
  static Future<bool> saveUserId(String userId) async {
    return await _prefs.setString(AppConstants.userIdKey, userId);
  }

  /// Get user ID from local storage
  static String? getUserId() {
    return _prefs.getString(AppConstants.userIdKey);
  }

  /// Remove user ID from local storage
  static Future<bool> removeUserId() async {
    return await _prefs.remove(AppConstants.userIdKey);
  }

  /// Clear all stored data (complete logout)
  static Future<bool> clearAll() async {
    return await _prefs.clear();
  }
}