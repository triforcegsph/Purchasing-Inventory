import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../models/erp_models.dart';
import '../providers/auth_provider.dart';
import '../providers/erp_provider.dart';
import '../widgets/enterprise_widgets.dart';

class LogsScreen extends StatefulWidget {
  const LogsScreen({super.key});

  @override
  State<LogsScreen> createState() => _LogsScreenState();
}

class _LogsScreenState extends State<LogsScreen> {
  String _search = '';
  String _moduleFilter = 'ALL';
  String _dateFilter = '';

  Future<void> _reload() async {
    await context.read<ErpProvider>().loadLogs(
          search: _search,
          module: _moduleFilter,
          date: _dateFilter,
        );
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2024),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() => _dateFilter = DateFormat('yyyy-MM-dd').format(picked));
      _reload();
    }
  }

  void _showLogDetail(TransactionLog log) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(8)),
      ),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'IMMUTABLE AUDIT LOG ENTRY',
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primaryBlueDark,
                ),
              ),
              const SizedBox(height: 8),
              InfoRow(label: 'Timestamp', value: log.timestamp, mono: true),
              InfoRow(label: 'User', value: log.adminOrUser),
              InfoRow(label: 'User Role', value: log.userRole),
              InfoRow(label: 'Module', value: log.module),
              InfoRow(label: 'Document No.', value: log.docNo, mono: true),
              InfoRow(label: 'Action', value: log.action),
              InfoRow(label: 'SP Name', value: log.spName, mono: true),
              InfoRow(label: 'Comments', value: log.comments),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final erp = context.watch<ErpProvider>();
    final modules = ['ALL', ...erp.allowedLogModules];

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(title: const Text('LOG — Transaction Audit Logs')),
      body: RefreshIndicator(
        onRefresh: _reload,
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: const BoxDecoration(
                color: AppColors.surface,
                border: Border(bottom: BorderSide(color: AppColors.border)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    onChanged: (v) {
                      setState(() => _search = v);
                      _reload();
                    },
                    decoration: const InputDecoration(
                      hintText: 'Search doc no., user, SP name, comments...',
                      prefixIcon: Icon(Icons.search, size: 18),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: modules.contains(_moduleFilter) ? _moduleFilter : 'ALL',
                          decoration: const InputDecoration(labelText: 'Module'),
                          items: modules
                              .map(
                                (m) => DropdownMenuItem(
                                  value: m,
                                  child: Text(m == 'ALL' ? 'All Authorized Modules' : m),
                                ),
                              )
                              .toList(),
                          onChanged: (v) {
                            setState(() => _moduleFilter = v ?? 'ALL');
                            _reload();
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: _pickDate,
                        icon: const Icon(Icons.calendar_today, size: 15),
                        label: Text(_dateFilter.isEmpty ? 'Date' : _dateFilter),
                      ),
                      if (_dateFilter.isNotEmpty)
                        IconButton(
                          onPressed: () {
                            setState(() => _dateFilter = '');
                            _reload();
                          },
                          icon: const Icon(Icons.clear, size: 18),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Immutable audit trail scoped to ${auth.user?.role ?? ''}. Records cannot be modified or deleted.',
                    style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
            Expanded(
              child: erp.logs.isEmpty
                  ? const EmptyStateView(
                      icon: Icons.history,
                      title: 'No audit logs match your filter',
                      subtitle: 'Try clearing the search, module, or date filter.',
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(12),
                      itemCount: erp.logs.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (_, idx) {
                        final log = erp.logs[idx];
                        return InkWell(
                          onTap: () => _showLogDetail(log),
                          borderRadius: BorderRadius.circular(4),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              border: Border.all(color: AppColors.border),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppColors.softBlueBg,
                                        borderRadius: BorderRadius.circular(2),
                                      ),
                                      child: Text(
                                        log.module.toUpperCase(),
                                        style: const TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.deepBlueText,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        log.docNo,
                                        style: const TextStyle(
                                          fontFamily: 'monospace',
                                          fontWeight: FontWeight.w800,
                                          fontSize: 12.5,
                                          color: AppColors.primaryBlueDark,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      log.timestamp,
                                      style: const TextStyle(
                                        fontSize: 10.5,
                                        fontFamily: 'monospace',
                                        color: AppColors.textHint,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 5),
                                Text(
                                  log.action,
                                  style: const TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                if (log.comments.isNotEmpty) ...[
                                  const SizedBox(height: 3),
                                  Text(
                                    log.comments,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 5),
                                Text(
                                  '${log.adminOrUser}${log.userRole.isNotEmpty ? ' (${log.userRole})' : ''}${log.spName.isNotEmpty ? ' • ${log.spName}' : ''}',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: AppColors.textMuted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
