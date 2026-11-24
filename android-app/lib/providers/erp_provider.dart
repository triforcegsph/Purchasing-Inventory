import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../core/network/api_client.dart';
import '../models/erp_models.dart';

class ErpProvider extends ChangeNotifier {
  final ApiClient apiClient;

  ErpProvider({required this.apiClient});

  List<ProjectInfo> _projects = const [
    ProjectInfo(
      code: 'PROJ-TWRB',
      name: 'PROJ-TWRB (Tower B)',
      jobNo: 'JOB-2026-884',
      description: 'Chilled Water & Fire Protection Piping — Tower B',
    ),
    ProjectInfo(
      code: 'PROJ-CIVIL1',
      name: 'PROJ-CIVIL1 (Site Infra)',
      jobNo: 'PROJ-CIVIL1',
      description: 'Site Infrastructure, Drainage & Retaining Wall',
    ),
  ];
  String _activeProjectCode = 'PROJ-TWRB';
  RequiredFieldConfig _config = const RequiredFieldConfig();

  DashboardData? _dashboard;
  List<BoqItem> _boqItems = [];
  String _boqStatus = 'Draft';
  List<PqtoRecord> _pqtos = [];
  List<PrRecord> _prs = [];
  List<PoRecord> _pos = [];
  List<WarehouseStock> _stock = [];
  List<String> _stockSystems = [];
  List<WithdrawalRecord> _withdrawals = [];
  List<TrackingChain> _trackingChains = [];
  Map<String, int> _trackingCounts = const {
    'ALL': 0,
    'PR': 0,
    'PO': 0,
    'DELIVERY': 0,
    'DONE': 0,
  };
  List<TransactionLog> _logs = [];
  List<String> _allowedLogModules = [];
  List<NotificationItem> _notifications = [];
  int _unreadNotifications = 0;

  bool _isLoading = false;
  bool _isSubmitting = false;
  String? _error;

  // Getters
  List<ProjectInfo> get projects => _projects;
  String get activeProjectCode => _activeProjectCode;
  ProjectInfo get activeProject => _projects.firstWhere(
        (p) => p.code == _activeProjectCode,
        orElse: () => _projects.first,
      );
  RequiredFieldConfig get config => _config;
  DashboardData? get dashboard => _dashboard;
  List<BoqItem> get boqItems => _boqItems;
  String get boqStatus => _boqStatus;
  List<PqtoRecord> get pqtos => _pqtos;
  List<PrRecord> get prs => _prs;
  List<PoRecord> get pos => _pos;
  List<WarehouseStock> get stock => _stock;
  List<String> get stockSystems => _stockSystems;
  List<WithdrawalRecord> get withdrawals => _withdrawals;
  List<TrackingChain> get trackingChains => _trackingChains;
  Map<String, int> get trackingCounts => _trackingCounts;
  List<TransactionLog> get logs => _logs;
  List<String> get allowedLogModules => _allowedLogModules;
  List<NotificationItem> get notifications => _notifications;
  int get unreadNotifications => _unreadNotifications;
  bool get isLoading => _isLoading;
  bool get isSubmitting => _isSubmitting;
  String? get error => _error;

  void clearState() {
    _dashboard = null;
    _boqItems = [];
    _pqtos = [];
    _prs = [];
    _pos = [];
    _stock = [];
    _withdrawals = [];
    _trackingChains = [];
    _logs = [];
    _notifications = [];
    _unreadNotifications = 0;
    _error = null;
    notifyListeners();
  }

  Future<void> switchProject(String projectCode) async {
    if (_activeProjectCode == projectCode) return;
    _activeProjectCode = projectCode;
    notifyListeners();
    await Future.wait([
      loadDashboard(),
      loadBoq(),
      loadPqtos(),
    ]);
  }

  Future<void> loadInitialData({required bool canAccessWithdrawal}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      await _loadProjects();
      final futures = <Future<void>>[
        loadDashboard(),
        loadBoq(),
        loadPqtos(),
        loadPrs(),
        loadPos(),
        loadTracking(),
        loadLogs(),
        loadNotifications(),
      ];
      if (canAccessWithdrawal) {
        futures.add(loadStockAndWithdrawals());
      }
      await Future.wait(futures);
    } on ApiException catch (e) {
      _error = e.message;
    } catch (_) {
      _error = 'Failed to load workspace data.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _loadProjects() async {
    final res = await apiClient.get('/api/projects');
    final raw = res['projects'] as List<dynamic>? ?? [];
    if (raw.isNotEmpty) {
      _projects = raw
          .map((e) => ProjectInfo.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (res['config'] is Map<String, dynamic>) {
      _config = RequiredFieldConfig.fromJson(res['config'] as Map<String, dynamic>);
    }
  }

  Future<void> loadDashboard() async {
    try {
      final res = await apiClient.get(
        '/api/dashboard',
        query: {'project': _activeProjectCode},
      );
      _dashboard = DashboardData.fromJson(res);
      _unreadNotifications = _dashboard!.unreadNotifications;
      _error = null;
    } on ApiException catch (e) {
      _error = e.message;
    }
    notifyListeners();
  }

  Future<void> loadBoq({String search = '', String sort = 'boq-order', String filter = 'all'}) async {
    try {
      final res = await apiClient.get(
        '/api/boq',
        query: {
          'project': _activeProjectCode,
          'search': search,
          'sort': sort,
          'filter': filter,
        },
      );
      _boqStatus = res['boqStatus']?.toString() ?? 'Draft';
      _boqItems = (res['items'] as List<dynamic>? ?? [])
          .map((e) => BoqItem.fromJson(e as Map<String, dynamic>))
          .toList();
      _error = null;
    } on ApiException catch (e) {
      _error = e.message;
    }
    notifyListeners();
  }

  Future<String?> addBoqItem({
    required String itemCode,
    required String description,
    required String boqUom,
    required double boqQty,
    required String pqtoUom,
    required double pqtoQty,
    required String assignedLocation,
    String? costCenter,
    String? remarks,
    bool isWorksRelated = false,
  }) async {
    _isSubmitting = true;
    notifyListeners();
    try {
      await apiClient.post(
        '/api/boq/items',
        body: {
          'projectCode': _activeProjectCode,
          'itemCode': itemCode,
          'description': description,
          'boqUom': boqUom,
          'boqQty': boqQty,
          'pqtoUom': pqtoUom,
          'pqtoQty': pqtoQty,
          'assignedLocation': assignedLocation,
          'costCenter': costCenter,
          'remarks': remarks,
          'isWorksRelated': isWorksRelated,
        },
      );
      await loadBoq();
      await loadLogs();
      return null;
    } on ApiException catch (e) {
      return e.message;
    } finally {
      _isSubmitting = false;
      notifyListeners();
    }
  }

  Future<String?> importBoqItems(List<Map<String, dynamic>> rows, String fileName) async {
    _isSubmitting = true;
    notifyListeners();
    try {
      await apiClient.post(
        '/api/boq/import',
        body: {
          'projectCode': _activeProjectCode,
          'fileName': fileName,
          'items': rows,
        },
      );
      await loadBoq();
      await loadLogs();
      return null;
    } on ApiException catch (e) {
      return e.message;
    } finally {
      _isSubmitting = false;
      notifyListeners();
    }
  }

  Future<String?> replaceLegacyFittings() async {
    _isSubmitting = true;
    notifyListeners();
    try {
      await apiClient.post(
        '/api/boq/replace-fittings',
        body: {'projectCode': _activeProjectCode},
      );
      await loadBoq();
      await loadLogs();
      return null;
    } on ApiException catch (e) {
      return e.message;
    } finally {
      _isSubmitting = false;
      notifyListeners();
    }
  }

  Future<String?> postBoqToPqto() async {
    _isSubmitting = true;
    notifyListeners();
    try {
      await apiClient.post(
        '/api/boq/post-to-pqto',
        body: {'projectCode': _activeProjectCode},
      );
      await Future.wait([loadBoq(), loadPqtos(), loadDashboard(), loadLogs()]);
      return null;
    } on ApiException catch (e) {
      return e.message;
    } finally {
      _isSubmitting = false;
      notifyListeners();
    }
  }

  Future<void> loadPqtos() async {
    try {
      final res = await apiClient.get(
        '/api/pqtos',
        query: {'project': _activeProjectCode},
      );
      _pqtos = (res['pqtos'] as List<dynamic>? ?? [])
          .map((e) => PqtoRecord.fromJson(e as Map<String, dynamic>))
          .toList();
      _error = null;
    } on ApiException catch (e) {
      _error = e.message;
    }
    notifyListeners();
  }

  Future<void> loadPrs({String status = '', String search = ''}) async {
    try {
      final res = await apiClient.get(
        '/api/prs',
        query: {'status': status, 'search': search},
      );
      _prs = (res['prs'] as List<dynamic>? ?? [])
          .map((e) => PrRecord.fromJson(e as Map<String, dynamic>))
          .toList();
      if (res['config'] is Map<String, dynamic>) {
        _config = RequiredFieldConfig.fromJson(res['config'] as Map<String, dynamic>);
      }
      _error = null;
    } on ApiException catch (e) {
      _error = e.message;
    }
    notifyListeners();
  }

  Future<({PrRecord? pr, String? error})> savePr({
    String? existingPrId,
    required String pqtoNo,
    required String refDocNo,
    required String jobNo,
    required String spName,
    required List<PrLineItem> items,
    required List<FileAttachment> attachments,
    required bool asDraft,
  }) async {
    _isSubmitting = true;
    notifyListeners();
    try {
      final body = {
        'pqtoNo': pqtoNo,
        'refDocNo': refDocNo,
        'jobNo': jobNo,
        'projectCode': _activeProjectCode,
        'spName': spName,
        'asDraft': asDraft,
        'items': items.map((i) => i.toJson()).toList(),
        'attachments': attachments.map((a) => a.toJson()).toList(),
      };
      final res = existingPrId != null
          ? await apiClient.put('/api/prs/$existingPrId', body: body)
          : await apiClient.post('/api/prs', body: body);
      final saved = PrRecord.fromJson(res['pr'] as Map<String, dynamic>);
      await Future.wait([
        loadPrs(),
        loadPqtos(),
        loadDashboard(),
        loadTracking(),
        loadLogs(),
        loadNotifications(),
      ]);
      return (pr: saved, error: null);
    } on ApiException catch (e) {
      return (pr: null, error: e.message);
    } finally {
      _isSubmitting = false;
      notifyListeners();
    }
  }

  Future<String?> approvePr(String prId) async {
    _isSubmitting = true;
    notifyListeners();
    try {
      await apiClient.post('/api/prs/$prId/approve');
      await Future.wait([
        loadPrs(),
        loadDashboard(),
        loadTracking(),
        loadLogs(),
        loadNotifications(),
      ]);
      return null;
    } on ApiException catch (e) {
      return e.message;
    } finally {
      _isSubmitting = false;
      notifyListeners();
    }
  }

  Future<String?> rejectPr(String prId, String reason) async {
    _isSubmitting = true;
    notifyListeners();
    try {
      await apiClient.post(
        '/api/prs/$prId/reject',
        body: {'comments': reason},
      );
      await Future.wait([
        loadPrs(),
        loadPqtos(),
        loadDashboard(),
        loadTracking(),
        loadLogs(),
        loadNotifications(),
      ]);
      return null;
    } on ApiException catch (e) {
      return e.message;
    } finally {
      _isSubmitting = false;
      notifyListeners();
    }
  }

  Future<void> loadPos({String search = ''}) async {
    try {
      final res = await apiClient.get('/api/pos', query: {'search': search});
      _pos = (res['pos'] as List<dynamic>? ?? [])
          .map((e) => PoRecord.fromJson(e as Map<String, dynamic>))
          .toList();
      _error = null;
    } on ApiException catch (e) {
      _error = e.message;
    }
    notifyListeners();
  }

  Future<void> loadStockAndWithdrawals({String search = '', String systemTag = 'ALL'}) async {
    try {
      final results = await Future.wait([
        apiClient.get('/api/stock', query: {'search': search, 'systemTag': systemTag}),
        apiClient.get('/api/withdrawals'),
      ]);
      final stockRes = results[0];
      final wdRes = results[1];
      _stock = (stockRes['stock'] as List<dynamic>? ?? [])
          .map((e) => WarehouseStock.fromJson(e as Map<String, dynamic>))
          .toList();
      _stockSystems = (stockRes['systems'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList();
      _withdrawals = (wdRes['withdrawals'] as List<dynamic>? ?? [])
          .map((e) => WithdrawalRecord.fromJson(e as Map<String, dynamic>))
          .toList();
      _error = null;
    } on ApiException catch (e) {
      _error = e.message;
    }
    notifyListeners();
  }

  Future<({WithdrawalRecord? withdrawal, String? error})> submitWithdrawal({
    required String stockId,
    required double requestedQty,
    required String requestedBy,
    required String jobNo,
    required List<FileAttachment> attachments,
    String remarks = '',
  }) async {
    _isSubmitting = true;
    notifyListeners();
    try {
      final res = await apiClient.post(
        '/api/withdrawals',
        body: {
          'stockId': stockId,
          'requestedQty': requestedQty,
          'requestedBy': requestedBy,
          'jobNo': jobNo,
          'projectCode': _activeProjectCode,
          'remarks': remarks,
          'attachments': attachments.map((a) => a.toJson()).toList(),
        },
      );
      final wd = WithdrawalRecord.fromJson(res['withdrawal'] as Map<String, dynamic>);
      await Future.wait([
        loadStockAndWithdrawals(),
        loadDashboard(),
        loadTracking(),
        loadLogs(),
        loadNotifications(),
      ]);
      return (withdrawal: wd, error: null);
    } on ApiException catch (e) {
      return (withdrawal: null, error: e.message);
    } finally {
      _isSubmitting = false;
      notifyListeners();
    }
  }

  Future<void> loadTracking({String stage = 'ALL', String search = ''}) async {
    try {
      final res = await apiClient.get(
        '/api/tracking',
        query: {'stage': stage, 'search': search},
      );
      _trackingChains = (res['chains'] as List<dynamic>? ?? [])
          .map((e) => TrackingChain.fromJson(e as Map<String, dynamic>))
          .toList();
      final rawCounts = res['counts'] as Map<String, dynamic>? ?? {};
      _trackingCounts = rawCounts.map(
        (k, v) => MapEntry(k, (v is num) ? v.toInt() : int.tryParse(v.toString()) ?? 0),
      );
      _error = null;
    } on ApiException catch (e) {
      _error = e.message;
    }
    notifyListeners();
  }

  Future<void> loadLogs({
    String search = '',
    String module = 'ALL',
    String user = '',
    String date = '',
  }) async {
    try {
      final res = await apiClient.get(
        '/api/logs',
        query: {
          'search': search,
          'module': module,
          'user': user,
          'date': date,
        },
      );
      _allowedLogModules = (res['allowedModules'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList();
      _logs = (res['logs'] as List<dynamic>? ?? [])
          .map((e) => TransactionLog.fromJson(e as Map<String, dynamic>))
          .toList();
      _error = null;
    } on ApiException catch (e) {
      _error = e.message;
    }
    notifyListeners();
  }

  Future<void> loadNotifications() async {
    try {
      final res = await apiClient.get('/api/notifications');
      _notifications = (res['notifications'] as List<dynamic>? ?? [])
          .map((e) => NotificationItem.fromJson(e as Map<String, dynamic>))
          .toList();
      _unreadNotifications = (res['unreadCount'] as num?)?.toInt() ?? 0;
      _error = null;
    } on ApiException catch (e) {
      _error = e.message;
    }
    notifyListeners();
  }

  Future<void> markNotificationRead(String id) async {
    try {
      await apiClient.post('/api/notifications/$id/read');
      await loadNotifications();
    } catch (_) {}
  }

  Future<void> markAllNotificationsRead() async {
    try {
      await apiClient.post('/api/notifications/read-all');
      await loadNotifications();
    } catch (_) {}
  }

  Future<({FileAttachment? attachment, String? error})> uploadAttachment({
    required String fileName,
    required Uint8List bytes,
    String? mimeType,
  }) async {
    try {
      final res = await apiClient.post(
        '/api/attachments',
        body: {
          'fileName': fileName,
          'base64Data': base64Encode(bytes),
          'mimeType': mimeType ?? _guessMimeType(fileName),
        },
      );
      final att = FileAttachment.fromJson(res['attachment'] as Map<String, dynamic>);
      return (attachment: att, error: null);
    } on ApiException catch (e) {
      return (attachment: null, error: e.message);
    }
  }

  String _guessMimeType(String name) {
    final lower = name.toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.xlsx')) {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    return 'application/octet-stream';
  }
}
