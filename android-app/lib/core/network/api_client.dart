import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final int statusCode;
  final String message;

  const ApiException(this.statusCode, this.message);

  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;
  bool get isOffline => statusCode == 0;

  @override
  String toString() => message;
}

class ApiClient {
  /// Default Android Emulator loopback to host machine Express server (port 4000).
  /// Configurable in-app on Login and Profile screens for physical Android devices on LAN.
  static const String defaultBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:4000',
  );

  String _baseUrl = defaultBaseUrl;
  String? _authToken;
  VoidCallback? onUnauthorized;
  final http.Client _http;

  ApiClient({http.Client? httpClient}) : _http = httpClient ?? http.Client();

  String get baseUrl => _baseUrl;
  String? get authToken => _authToken;

  void setBaseUrl(String url) {
    final cleaned = url.trim().replaceAll(RegExp(r'/+$'), '');
    if (cleaned.isNotEmpty) {
      _baseUrl = cleaned;
    }
  }

  void setToken(String? token) {
    _authToken = token;
  }

  Map<String, String> _headers() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (_authToken != null && _authToken!.isNotEmpty)
        'Authorization': 'Bearer $_authToken',
    };
  }

  Uri _uri(String path, [Map<String, String>? query]) {
    final normalizedPath = path.startsWith('/') ? path : '/$path';
    final uri = Uri.parse('$_baseUrl$normalizedPath');
    if (query != null && query.isNotEmpty) {
      final filtered = Map<String, String>.fromEntries(
        query.entries.where((e) => e.value.isNotEmpty),
      );
      if (filtered.isNotEmpty) {
        return uri.replace(queryParameters: filtered);
      }
    }
    return uri;
  }

  Future<Map<String, dynamic>> get(String path, {Map<String, String>? query}) async {
    return _execute(() => _http.get(_uri(path, query), headers: _headers()));
  }

  Future<Map<String, dynamic>> post(String path, {Object? body}) async {
    return _execute(
      () => _http.post(
        _uri(path),
        headers: _headers(),
        body: body != null ? jsonEncode(body) : null,
      ),
    );
  }

  Future<Map<String, dynamic>> put(String path, {Object? body}) async {
    return _execute(
      () => _http.put(
        _uri(path),
        headers: _headers(),
        body: body != null ? jsonEncode(body) : null,
      ),
    );
  }

  Future<List<int>> downloadBytes(String path) async {
    try {
      final response = await _http
          .get(_uri(path), headers: _headers())
          .timeout(const Duration(seconds: 20));
      if (response.statusCode == 401) {
        onUnauthorized?.call();
        throw const ApiException(401, 'Session expired. Please sign in again.');
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw ApiException(response.statusCode, 'Failed to download attachment.');
      }
      return response.bodyBytes;
    } on SocketException {
      throw const ApiException(0, 'Unable to connect to server. Check network or API URL.');
    } on TimeoutException {
      throw const ApiException(0, 'Connection timed out while downloading file.');
    }
  }

  Future<Map<String, dynamic>> _execute(Future<http.Response> Function() request) async {
    try {
      final response = await request().timeout(const Duration(seconds: 15));
      Map<String, dynamic> decoded = {};
      if (response.body.isNotEmpty) {
        try {
          final parsed = jsonDecode(response.body);
          if (parsed is Map<String, dynamic>) {
            decoded = parsed;
          } else {
            decoded = {'data': parsed};
          }
        } catch (_) {
          decoded = {'message': response.body};
        }
      }

      if (response.statusCode == 401) {
        final msg = decoded['error']?.toString() ??
            'Session expired or unauthorized. Please sign in again.';
        if (_authToken != null) {
          onUnauthorized?.call();
        }
        throw ApiException(401, msg);
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        final msg = decoded['error']?.toString() ??
            decoded['message']?.toString() ??
            'Server returned error (${response.statusCode}).';
        throw ApiException(response.statusCode, msg);
      }

      return decoded;
    } on ApiException {
      rethrow;
    } on SocketException {
      throw ApiException(
        0,
        'Cannot reach server at $_baseUrl. Verify internet connection and API Server URL.',
      );
    } on TimeoutException {
      throw ApiException(
        0,
        'Request timed out contacting $_baseUrl. Please try again.',
      );
    } on FormatException {
      throw const ApiException(0, 'Invalid server URL or malformed response.');
    } catch (_) {
      throw const ApiException(0, 'Unexpected network error occurred.');
    }
  }
}

typedef VoidCallback = void Function();
