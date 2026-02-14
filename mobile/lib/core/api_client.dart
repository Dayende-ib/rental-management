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
        throw ApiException(
          'La reponse du serveur est invalide. Reessayez dans quelques instants.',
          response.statusCode,
        );
      }
    } else {
      String message = _fallbackByStatus(response.statusCode);
      try {
        final body = json.decode(response.body);
        if (body is Map<String, dynamic>) {
          message = _extractErrorMessage(body, response.statusCode);
        }
      } catch (_) {
        message = _fallbackByStatus(response.statusCode);
      }
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
    throw ApiException(
      'Le serveur a renvoye un format inattendu. Rafraichissez puis reessayez.',
      response.statusCode,
    );
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
    throw ApiException(
      'Le serveur a renvoye un format inattendu. Rafraichissez puis reessayez.',
      response.statusCode,
    );
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
      throw ApiException(
        'Le serveur a renvoye un format inattendu. Rafraichissez puis reessayez.',
        response.statusCode,
      );
    } on SocketException {
      throw ApiException(
        'Connexion internet indisponible. Verifiez votre reseau puis reessayez.',
        0,
      );
    } on TimeoutException {
      throw ApiException(
        "Le serveur met trop de temps a repondre. Reessayez dans quelques instants.",
        0,
      );
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(
        "Une erreur reseau est survenue. Verifiez votre connexion puis reessayez.",
        0,
      );
    }
  }

  /// DELETE request with authentication
  Future<dynamic> delete(String endpoint, {bool requiresAuth = true}) async {
    final url = Uri.parse('${AppConstants.baseUrl}$endpoint');
    final headers = requiresAuth ? _authHeaders : <String, String>{};

    try {
      final response = await _client
          .delete(url, headers: headers)
          .timeout(Duration(seconds: AppConstants.apiTimeoutSeconds));
      return await _handleResponse(response);
    } on SocketException {
      throw ApiException(
        'Connexion internet indisponible. Verifiez votre reseau puis reessayez.',
        0,
      );
    } on TimeoutException {
      throw ApiException(
        "Le serveur met trop de temps a repondre. Reessayez dans quelques instants.",
        0,
      );
    } on ApiException {
      rethrow;
    } catch (_) {
      throw ApiException(
        "Une erreur reseau est survenue. Verifiez votre connexion puis reessayez.",
        0,
      );
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
    throw ApiException(
      'Le serveur a renvoye un format inattendu. Rafraichissez puis reessayez.',
      response.statusCode,
    );
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
      throw ApiException(
        'Le serveur a renvoye un format inattendu. Rafraichissez puis reessayez.',
        response.statusCode,
      );
    } on SocketException {
      throw ApiException(
        'Connexion internet indisponible. Verifiez votre reseau puis reessayez.',
        0,
      );
    } on TimeoutException {
      throw ApiException(
        "Le serveur met trop de temps a repondre. Reessayez dans quelques instants.",
        0,
      );
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(
        "Une erreur reseau est survenue. Verifiez votre connexion puis reessayez.",
        0,
      );
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
  String toString() => message;
}

String _extractErrorMessage(Map<String, dynamic> body, int statusCode) {
  final errorValue = body['error'];

  if (errorValue is String && errorValue.trim().isNotEmpty) {
    return _localizeServerMessage(errorValue.trim(), statusCode);
  }

  if (errorValue is Map<String, dynamic>) {
    final nested = errorValue['message'];
    if (nested is String && nested.trim().isNotEmpty) {
      return _localizeServerMessage(nested.trim(), statusCode);
    }
  }

  final messageValue = body['message'];
  if (messageValue is String && messageValue.trim().isNotEmpty) {
    return _localizeServerMessage(messageValue.trim(), statusCode);
  }

  return _fallbackByStatus(statusCode);
}

String _localizeServerMessage(String rawMessage, int statusCode) {
  final lower = rawMessage.toLowerCase();

  if (lower.contains('rls') ||
      lower.contains('payments tenant insert') ||
      lower.contains('policy')) {
    return 'Creation de paiement bloquee par la policy de securite (RLS). Contactez l\'administrateur pour activer la policy tenant insert sur payments.';
  }
  if (lower.contains('session') && lower.contains('expire')) {
    return 'Votre session a expire. Reconnectez-vous pour continuer.';
  }
  if (lower.contains('permission') || lower.contains('forbidden')) {
    return "Action non autorisee pour votre compte. Contactez l'administrateur si besoin.";
  }
  if (lower.contains('introuvable') || lower.contains('not found')) {
    return 'Element introuvable. Rafraichissez la page puis reessayez.';
  }
  if (lower.contains('deja') || lower.contains('already exists')) {
    return 'Cette operation existe deja. Verifiez les informations puis reessayez.';
  }

  if (rawMessage.trim().isEmpty) {
    return _fallbackByStatus(statusCode);
  }
  return rawMessage;
}

String _fallbackByStatus(int statusCode) {
  switch (statusCode) {
    case 400:
      return 'Demande invalide. Verifiez les informations saisies puis reessayez.';
    case 401:
      return 'Session invalide ou expiree. Reconnectez-vous pour continuer.';
    case 403:
      return "Action non autorisee pour votre compte.";
    case 404:
      return 'Element introuvable. Rafraichissez puis reessayez.';
    case 409:
      return "Conflit detecte. L'operation a deja ete effectuee.";
    case 422:
      return 'Donnees invalides. Corrigez les champs puis reessayez.';
    case 429:
      return 'Trop de tentatives. Patientez avant de recommencer.';
    case 500:
      return 'Erreur serveur temporaire. Reessayez dans quelques instants.';
    default:
      return 'Une erreur est survenue. Veuillez reessayer.';
  }
}
