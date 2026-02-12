import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'constants.dart';
import 'storage.dart';

/// API Client for handling all HTTP requests
/// Manages authentication headers and common API operations
class ApiClient {
  final http.Client _client = http.Client();
  static bool _isRefreshing = false;
  static Completer<bool>? _refreshCompleter;

  /// Get authorization header with JWT token
  Map<String, String> get _authHeaders {
    final token = StorageService.getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  Map<String, String> get _authOnlyHeaders {
    final token = StorageService.getToken();
    return {
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
          message =
              body['error']?.toString() ??
              body['message']?.toString() ??
              message;
        }
      } catch (_) {}
      throw ApiException(message, response.statusCode);
    }
  }

  /// POST request with authentication
  Future<Map<String, dynamic>> post(
    String endpoint, {
    Map<String, dynamic>? body,
    bool requiresAuth = true,
  }) async {
    try {
      return await _performPost(endpoint, body, requiresAuth);
    } on ApiException catch (e) {
      if (e.statusCode == 401 && requiresAuth) {
        final refreshed = await _refreshSession();
        if (refreshed) {
          return await _performPost(endpoint, body, requiresAuth);
        }
      }
      rethrow;
    }
  }

  Future<Map<String, dynamic>> _performPost(
    String endpoint,
    Map<String, dynamic>? body,
    bool requiresAuth,
  ) async {
    final url = Uri.parse('${AppConstants.baseUrl}$endpoint');
    final headers = requiresAuth
        ? _authHeaders
        : <String, String>{'Content-Type': 'application/json'};

    final response = await _client
        .post(
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
  }

  /// GET request with authentication
  Future<Map<String, dynamic>> get(
    String endpoint, {
    bool requiresAuth = true,
  }) async {
    try {
      return await _performGet(endpoint, requiresAuth);
    } on ApiException catch (e) {
      if (e.statusCode == 401 && requiresAuth) {
        final refreshed = await _refreshSession();
        if (refreshed) {
          return await _performGet(endpoint, requiresAuth);
        }
      }
      rethrow;
    }
  }

  Future<Map<String, dynamic>> _performGet(
    String endpoint,
    bool requiresAuth,
  ) async {
    final url = Uri.parse('${AppConstants.baseUrl}$endpoint');
    final headers = requiresAuth ? _authHeaders : <String, String>{};

    final response = await _client
        .get(url, headers: headers)
        .timeout(Duration(seconds: AppConstants.apiTimeoutSeconds));

    final data = await _handleResponse(response);
    if (data is Map<String, dynamic>) {
      return data;
    }
    throw ApiException('Unexpected response format', response.statusCode);
  }

  /// PUT request with authentication
  Future<Map<String, dynamic>> put(
    String endpoint, {
    Map<String, dynamic>? body,
    bool requiresAuth = true,
  }) async {
    final url = Uri.parse('${AppConstants.baseUrl}$endpoint');
    final headers = requiresAuth
        ? _authHeaders
        : <String, String>{'Content-Type': 'application/json'};

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
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Network error: $e', 0);
    }
  }

  /// GET request returning a list with authentication support and retry
  Future<List<dynamic>> getList(
    String endpoint, {
    bool requiresAuth = true,
  }) async {
    try {
      return await _performGetList(endpoint, requiresAuth);
    } on ApiException catch (e) {
      if (e.statusCode == 401 && requiresAuth) {
        final refreshed = await _refreshSession();
        if (refreshed) {
          return await _performGetList(endpoint, requiresAuth);
        }
      }
      rethrow;
    }
  }

  Future<List<dynamic>> _performGetList(
    String endpoint,
    bool requiresAuth,
  ) async {
    final url = Uri.parse('${AppConstants.baseUrl}$endpoint');
    final headers = requiresAuth ? _authHeaders : <String, String>{};

    final response = await _client
        .get(url, headers: headers)
        .timeout(Duration(seconds: AppConstants.apiTimeoutSeconds));

    final data = await _handleResponse(response);
    if (data is List<dynamic>) {
      return data;
    }
    if (data is Map<String, dynamic>) {
      final fromData = data['data'];
      if (fromData is List<dynamic>) {
        return fromData;
      }
      final fromItems = data['items'];
      if (fromItems is List<dynamic>) {
        return fromItems;
      }
    }
    throw ApiException('Unexpected response format', response.statusCode);
  }

  /// POST multipart request with file upload
  Future<Map<String, dynamic>> uploadFile(
    String endpoint, {
    required List<int> bytes,
    required String filename,
    String? mimeType,
    Map<String, String>? fields,
    bool requiresAuth = true,
  }) async {
    final url = Uri.parse('${AppConstants.baseUrl}$endpoint');
    final headers = requiresAuth ? _authOnlyHeaders : <String, String>{};

    try {
      final request = http.MultipartRequest('POST', url);
      request.headers.addAll(headers);
      if (fields != null) {
        request.fields.addAll(fields);
      }
      request.files.add(
        http.MultipartFile.fromBytes(
          'file',
          bytes,
          filename: filename,
          contentType: mimeType != null ? MediaType.parse(mimeType) : null,
        ),
      );

      final streamed = await request.send().timeout(
        Duration(seconds: AppConstants.apiTimeoutSeconds),
      );
      final response = await http.Response.fromStream(streamed);
      final data = await _handleResponse(response);
      if (data is Map<String, dynamic>) {
        return data;
      }
      throw ApiException('Unexpected response format', response.statusCode);
    } on SocketException {
      throw ApiException('No internet connection', 0);
    } on TimeoutException {
      throw ApiException('Request timeout', 0);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Network error: $e', 0);
    }
  }

  /// Session refresh logic
  Future<bool> _refreshSession() async {
    if (_isRefreshing) {
      return _refreshCompleter?.future ?? Future.value(false);
    }

    _isRefreshing = true;
    _refreshCompleter = Completer<bool>();

    try {
      final refreshToken = StorageService.getRefreshToken();
      if (refreshToken == null) {
        _refreshCompleter!.complete(false);
        return false;
      }

      final url = Uri.parse(
        '${AppConstants.baseUrl}${AppConstants.refreshEndpoint}',
      );
      final response = await _client
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: json.encode({'refresh_token': refreshToken}),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final session = data['session'];
        if (session != null) {
          await StorageService.saveToken(session['access_token']);
          await StorageService.saveRefreshToken(session['refresh_token']);
          // Optional: update login date to extend another 30 days from now
          await StorageService.saveLoginDate();
          _refreshCompleter!.complete(true);
          return true;
        }
      }

      // Token refresh failed, likely refresh token expired or revoked
      await StorageService.removeToken();
      _refreshCompleter!.complete(false);
      return false;
    } catch (e) {
      _refreshCompleter!.complete(false);
      return false;
    } finally {
      _isRefreshing = false;
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
