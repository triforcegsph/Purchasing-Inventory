import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/network/api_client.dart';
import '../models/erp_models.dart';

class AuthProvider extends ChangeNotifier {
  static const _kTokenKey = 'triforce_auth_token';
  static const _kUserKey = 'triforce_auth_user';
  static const _kBaseUrlKey = 'triforce_api_base_url';

  final ApiClient apiClient;
  final FlutterSecureStorage _secureStorage;

  UserAccount? _user;
  UserPermissions _permissions = const UserPermissions();
  bool _isInitializing = true;
  bool _isLoading = false;
  String? _error;
  String? _sessionNotice;

  AuthProvider({
    required this.apiClient,
    FlutterSecureStorage? secureStorage,
  }) : _secureStorage = secureStorage ?? const FlutterSecureStorage() {
    apiClient.onUnauthorized = _handleSessionExpired;
  }

  UserAccount? get user => _user;
  UserPermissions get permissions => _permissions;
  bool get isAuthenticated => _user != null;
  bool get isInitializing => _isInitializing;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get sessionNotice => _sessionNotice;
  String get apiBaseUrl => apiClient.baseUrl;

  Future<void> initialize() async {
    _isInitializing = true;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedUrl = prefs.getString(_kBaseUrlKey);
      if (savedUrl != null && savedUrl.isNotEmpty) {
        apiClient.setBaseUrl(savedUrl);
      }

      final token = await _secureStorage.read(key: _kTokenKey);
      final userJson = await _secureStorage.read(key: _kUserKey);
      if (token != null && token.isNotEmpty && userJson != null) {
        apiClient.setToken(token);
        try {
          final res = await apiClient.get('/api/auth/me');
          _user = UserAccount.fromJson(res['user'] as Map<String, dynamic>);
          _permissions = UserPermissions.fromJson(
            (res['permissions'] as Map<String, dynamic>?) ?? {},
          );
        } on ApiException catch (e) {
          if (e.isUnauthorized) {
            await _clearLocalSession();
          } else {
            // Keep cached user identity briefly when offline; user will see offline banner
            _user = UserAccount.fromJson(jsonDecode(userJson) as Map<String, dynamic>);
            _permissions = _defaultPermissionsForRole(_user!.role);
          }
        }
      }
    } catch (_) {
      await _clearLocalSession();
    } finally {
      _isInitializing = false;
      notifyListeners();
    }
  }

  Future<void> updateBaseUrl(String newUrl) async {
    final cleaned = newUrl.trim().replaceAll(RegExp(r'/+$'), '');
    if (cleaned.isEmpty) return;
    apiClient.setBaseUrl(cleaned);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kBaseUrlKey, cleaned);
    notifyListeners();
  }

  Future<Map<String, dynamic>> testConnection() async {
    return apiClient.get('/api/health');
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    _sessionNotice = null;
    notifyListeners();

    try {
      final res = await apiClient.post(
        '/api/auth/login',
        body: {
          'email': email.trim(),
          'password': password,
          'client': 'mobile',
        },
      );

      final token = res['token']?.toString() ?? '';
      final userMap = res['user'] as Map<String, dynamic>;
      final account = UserAccount.fromJson(userMap);

      // Client-side defense-in-depth matching server-side 2-role restriction
      if (!account.isApplicant && !account.isReqApprover) {
        _error =
            'Mobile access is restricted to Applicant/Requestor and REQ Approver roles only.';
        return false;
      }

      apiClient.setToken(token);
      _user = account;
      _permissions = UserPermissions.fromJson(
        (res['permissions'] as Map<String, dynamic>?) ?? {},
      );

      await _secureStorage.write(key: _kTokenKey, value: token);
      await _secureStorage.write(key: _kUserKey, value: jsonEncode(account.toJson()));
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      return false;
    } catch (_) {
      _error = 'Sign in failed. Please check your connection and try again.';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    try {
      if (apiClient.authToken != null) {
        await apiClient.post('/api/auth/logout');
      }
    } catch (_) {
      // Proceed with local logout even if offline
    }
    await _clearLocalSession();
    _sessionNotice = null;
    notifyListeners();
  }

  void _handleSessionExpired() {
    _clearLocalSession();
    _sessionNotice = 'Your session has expired. Please sign in again.';
    notifyListeners();
  }

  Future<void> _clearLocalSession() async {
    apiClient.setToken(null);
    _user = null;
    _permissions = const UserPermissions();
    try {
      await _secureStorage.delete(key: _kTokenKey);
      await _secureStorage.delete(key: _kUserKey);
    } catch (_) {}
  }

  UserPermissions _defaultPermissionsForRole(String role) {
    if (role == 'REQ Approver') {
      return const UserPermissions(
        canEditBoq: true,
        canImportBoq: true,
        canPostBoqToPqto: true,
        canApprovePr: true,
        canRejectPr: true,
        canApprovePo: false,
        canAccessWithdrawal: false,
      );
    }
    return const UserPermissions(
      canEditBoq: false,
      canImportBoq: false,
      canPostBoqToPqto: false,
      canApprovePr: false,
      canRejectPr: false,
      canApprovePo: false,
      canAccessWithdrawal: true,
    );
  }
}
