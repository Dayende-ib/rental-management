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
    await _prefs.remove(AppConstants.refreshTokenKey);
    return await _prefs.remove(AppConstants.tokenKey);
  }

  /// Save refresh token
  static Future<bool> saveRefreshToken(String token) async {
    return await _prefs.setString(AppConstants.refreshTokenKey, token);
  }

  /// Get refresh token
  static String? getRefreshToken() {
    return _prefs.getString(AppConstants.refreshTokenKey);
  }

  /// Check if user is logged in and session is within 30 days
  static bool isLoggedIn() {
    final token = getToken();
    if (token == null || token.isEmpty) return false;

    final loginDateStr = _prefs.getString(AppConstants.lastLoginKey);
    if (loginDateStr == null) return false;

    final loginDate = DateTime.tryParse(loginDateStr);
    if (loginDate == null) return false;

    // Check if session is older than 30 days
    final difference = DateTime.now().difference(loginDate).inDays;
    return difference < 30;
  }

  /// Save current login date
  static Future<bool> saveLoginDate() async {
    return await _prefs.setString(
      AppConstants.lastLoginKey,
      DateTime.now().toIso8601String(),
    );
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

  /// Save user full name
  static Future<bool> saveUserFullName(String fullName) async {
    return await _prefs.setString(AppConstants.userFullNameKey, fullName);
  }

  /// Get user full name
  static String? getUserFullName() {
    return _prefs.getString(AppConstants.userFullNameKey);
  }

  /// Remove user full name
  static Future<bool> removeUserFullName() async {
    return await _prefs.remove(AppConstants.userFullNameKey);
  }

  /// Save user email
  static Future<bool> saveUserEmail(String email) async {
    return await _prefs.setString(AppConstants.userEmailKey, email);
  }

  /// Get user email
  static String? getUserEmail() {
    return _prefs.getString(AppConstants.userEmailKey);
  }

  /// Remove user email
  static Future<bool> removeUserEmail() async {
    return await _prefs.remove(AppConstants.userEmailKey);
  }

  /// Save custom backend URL to local storage
  static Future<bool> saveBaseUrl(String url) async {
    return await _prefs.setString(AppConstants.customBaseUrlKey, url);
  }

  /// Get custom backend URL from local storage
  static String? getBaseUrl() {
    return _prefs.getString(AppConstants.customBaseUrlKey);
  }

  /// Remove custom backend URL from local storage
  static Future<bool> removeBaseUrl() async {
    return await _prefs.remove(AppConstants.customBaseUrlKey);
  }

  /// Clear all stored data (complete logout)
  static Future<bool> clearAll() async {
    return await _prefs.clear();
  }
}
