import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'constants.dart';
import 'storage.dart';

/// API Client for handling all HTTP requests
/// Manages authentication headers and common API operations
class ApiClient {
  final http.Client _client = http.Client();
  
  /// Get authorization header with JWT token
  Map<String, String> get _authHeaders {
    final token = StorageService.getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  /// Handle API response and parse JSON
  Future<dynamic> _handleResponse(http.Response response) async {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      try {
        if (response.body.isEmpty) {
          return null;
        }
        return json.decode(response.body);
      } catch (e) {
        throw ApiException('Invalid response format', response.statusCode);
      }
    } else {
      String message = 'Request failed with status ${response.statusCode}';
      try {
        final body = json.decode(response.body);
        if (body is Map<String, dynamic>) {
          message = body['error']?.toString() ?? body['message']?.toString() ?? message;
        }
      } catch (_) {}
      throw ApiException(
        message, 
        response.statusCode
      );
    }
  }

  /// POST request with authentication
  Future<Map<String, dynamic>> post(
    String endpoint, {
    Map<String, dynamic>? body,
    bool requiresAuth = true,
  }) async {
    final url = Uri.parse('${AppConstants.baseUrl}$endpoint');
    final headers = requiresAuth ? _authHeaders : <String, String>{'Content-Type': 'application/json'};
    
    try {
      final response = await _client.post(
        url,
        headers: headers,
        body: body != null ? json.encode(body) : null,
      ).timeout(Duration(seconds: AppConstants.apiTimeoutSeconds));
      
      final data = await _handleResponse(response);
      if (data is Map<String, dynamic>) {
        return data;
      }
      throw ApiException('Unexpected response format', response.statusCode);
    } on SocketException {
      throw ApiException('No internet connection', 0);
    } on TimeoutException {
      throw ApiException('Request timeout', 0);
    } catch (e) {
      throw ApiException('Network error: $e', 0);
    }
  }

  /// GET request with authentication
  Future<Map<String, dynamic>> get(
    String endpoint, {
    bool requiresAuth = true,
  }) async {
    final url = Uri.parse('${AppConstants.baseUrl}$endpoint');
    final headers = requiresAuth ? _authHeaders : <String, String>{};
    
    try {
      final response = await _client.get(
        url,
        headers: headers,
      ).timeout(Duration(seconds: AppConstants.apiTimeoutSeconds));
      
      final data = await _handleResponse(response);
      if (data is Map<String, dynamic>) {
        return data;
      }
      throw ApiException('Unexpected response format', response.statusCode);
    } on SocketException {
      throw ApiException('No internet connection', 0);
    } on TimeoutException {
      throw ApiException('Request timeout', 0);
    } catch (e) {
      throw ApiException('Network error: $e', 0);
    }
  }

  /// PUT request with authentication
  Future<Map<String, dynamic>> put(
    String endpoint, {
    Map<String, dynamic>? body,
    bool requiresAuth = true,
  }) async {
    final url = Uri.parse('${AppConstants.baseUrl}$endpoint');
    final headers =
        requiresAuth ? _authHeaders : <String, String>{'Content-Type': 'application/json'};

    try {
      final response = await _client
          .put(
            url,
            headers: headers,
            body: body != null ? json.encode(body) : null,
          )
          .timeout(Duration(seconds: AppConstants.apiTimeoutSeconds));

      final data = await _handleResponse(response);
      if (data is Map<String, dynamic>) {
        return data;
      }
      throw ApiException('Unexpected response format', response.statusCode);
    } on SocketException {
      throw ApiException('No internet connection', 0);
    } on TimeoutException {
      throw ApiException('Request timeout', 0);
    } catch (e) {
      throw ApiException('Network error: $e', 0);
    }
  }

  /// GET request returning a list
  Future<List<dynamic>> getList(
    String endpoint, {
    bool requiresAuth = true,
  }) async {
    final url = Uri.parse('${AppConstants.baseUrl}$endpoint');
    final headers = requiresAuth ? _authHeaders : <String, String>{};

    try {
      final response = await _client.get(
        url,
        headers: headers,
      ).timeout(Duration(seconds: AppConstants.apiTimeoutSeconds));

      final data = await _handleResponse(response);
      if (data is List<dynamic>) {
        return data;
      }
      throw ApiException('Unexpected response format', response.statusCode);
    } on SocketException {
      throw ApiException('No internet connection', 0);
    } on TimeoutException {
      throw ApiException('Request timeout', 0);
    } catch (e) {
      throw ApiException('Network error: $e', 0);
    }
  }

  /// Close the HTTP client
  void close() {
    _client.close();
  }
}

/// Custom exception for API errors
class ApiException implements Exception {
  final String message;
  final int statusCode;

  ApiException(this.message, this.statusCode);

  @override
  String toString() => 'ApiException: $message (Status: $statusCode)';
}
