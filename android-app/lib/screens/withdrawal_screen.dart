import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../models/erp_models.dart';
import '../providers/auth_provider.dart';
import '../providers/erp_provider.dart';
import '../widgets/attachment_widgets.dart';
import '../widgets/enterprise_widgets.dart';
import '../widgets/status_badge.dart';

class WithdrawalScreen extends StatefulWidget {
  const WithdrawalScreen({super.key});

  @override
  State<WithdrawalScreen> createState() => _WithdrawalScreenState();
}

class _WithdrawalScreenState extends State<WithdrawalScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _systemFilter = 'ALL';
  String _search = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _openCreateWithdrawalSheet(WarehouseStock stockItem) async {
    final auth = context.read<AuthProvider>();
    final erp = context.read<ErpProvider>();
    final qtyCtrl = TextEditingController(text: '1');
    final requesterCtrl = TextEditingController(text: auth.user?.fullName ?? '');
    final jobNoCtrl = TextEditingController(text: erp.activeProject.jobNo);
    final remarksCtrl = TextEditingController();
    final attachments = <FileAttachment>[];
    String? formError;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(8)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          final enteredQty = double.tryParse(qtyCtrl.text) ?? 0;
          final exceedsStock = enteredQty > stockItem.availableStock;

          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom,
            ),
            child: SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Request Withdrawal — ${stockItem.itemCode}',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(ctx),
                          icon: const Icon(Icons.close),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${stockItem.description}\nSystem: ${stockItem.systemTag} • Location: ${stockItem.assignedLocation}',
                      style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: stockItem.availableStock > 0
                            ? AppColors.successBg
                            : AppColors.dangerBg,
                        border: Border.all(
                          color: stockItem.availableStock > 0
                              ? AppColors.successBorder
                              : AppColors.dangerBorder,
                        ),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'Available Warehouse Stock: ${formatQty(stockItem.availableStock)} ${stockItem.uom} (Reserved: ${formatQty(stockItem.reservedStock)})',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: stockItem.availableStock > 0
                              ? AppColors.success
                              : AppColors.dangerText,
                        ),
                      ),
                    ),
                    if (formError != null) ...[
                      const SizedBox(height: 8),
                      EnterpriseBanner(message: formError!),
                    ],
                    const SizedBox(height: 12),
                    TextField(
                      controller: qtyCtrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      onChanged: (_) => setSheetState(() {}),
                      decoration: InputDecoration(
                        labelText: 'Requested Quantity (${stockItem.uom}) *',
                      ),
                    ),
                    if (exceedsStock) ...[
                      const SizedBox(height: 6),
                      const Text(
                        'Warning: Requested qty exceeds available stock. It will be logged as "Without Stock" — negative inventory is never permitted.',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: AppColors.orange,
                        ),
                      ),
                    ],
                    const SizedBox(height: 10),
                    TextField(
                      controller: requesterCtrl,
                      decoration: const InputDecoration(labelText: 'Requester Name *'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: jobNoCtrl,
                      decoration: const InputDecoration(labelText: 'Job Number *'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: remarksCtrl,
                      decoration: const InputDecoration(labelText: 'Remarks (Optional)'),
                    ),
                    const SizedBox(height: 12),
                    AttachmentUploaderWidget(
                      attachments: attachments,
                      requiredField: erp.config.attachments,
                      label: 'Supporting Issuance Slip (PDF, JPG, PNG)',
                      onAdded: (att) => setSheetState(() => attachments.add(att)),
                      onRemoved: (id) => setSheetState(
                        () => attachments.removeWhere((a) => a.id == id),
                      ),
                    ),
                    const SizedBox(height: 14),
                    ElevatedButton.icon(
                      onPressed: erp.isSubmitting
                          ? null
                          : () async {
                              final qty = double.tryParse(qtyCtrl.text) ?? 0;
                              if (qty <= 0) {
                                setSheetState(
                                  () => formError = 'Quantity must be greater than 0.',
                                );
                                return;
                              }
                              if (erp.config.attachments && attachments.isEmpty) {
                                setSheetState(
                                  () => formError =
                                      'At least 1 supporting issuance slip is required.',
                                );
                                return;
                              }
                              final res = await erp.submitWithdrawal(
                                stockId: stockItem.id,
                                requestedQty: qty,
                                requestedBy: requesterCtrl.text.trim(),
                                jobNo: jobNoCtrl.text.trim(),
                                attachments: attachments,
                                remarks: remarksCtrl.text.trim(),
                              );
                              if (!ctx.mounted) return;
                              if (res.error != null) {
                                setSheetState(() => formError = res.error);
                                return;
                              }
                              Navigator.pop(ctx);
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      '${res.withdrawal?.wdNo} submitted (${res.withdrawal?.status}).',
                                    ),
                                    backgroundColor: AppColors.success,
                                  ),
                                );
                                _tabController.animateTo(1);
                              }
                            },
                      icon: const Icon(Icons.outbox_outlined, size: 18),
                      label: const Text('Submit Withdrawal Request'),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final erp = context.watch<ErpProvider>();

    if (!auth.permissions.canAccessWithdrawal) {
      return Scaffold(
        appBar: AppBar(title: const Text('Material Withdrawal')),
        body: const EmptyStateView(
          icon: Icons.lock_outline,
          title: 'Access Restricted',
          subtitle: 'Material Withdrawal requests are not authorized for REQ Approver.',
        ),
      );
    }

    final filteredStock = erp.stock.where((s) {
      final matchesSys = _systemFilter == 'ALL' || s.systemTag == _systemFilter;
      final q = _search.trim().toLowerCase();
      final matchesSearch = q.isEmpty ||
          s.itemCode.toLowerCase().contains(q) ||
          s.description.toLowerCase().contains(q) ||
          s.assignedLocation.toLowerCase().contains(q);
      return matchesSys && matchesSearch;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Text('WD — Material Withdrawal'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: const Color(0xFF94A3B8),
          indicatorColor: AppColors.accentLightBlue,
          tabs: [
            Tab(text: 'Warehouse Stock (${erp.stock.length})'),
            Tab(text: 'Withdrawal History (${erp.withdrawals.length})'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Inventory Lookup & Request
          RefreshIndicator(
            onRefresh: erp.loadStockAndWithdrawals,
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: const BoxDecoration(
                    color: AppColors.surface,
                    border: Border(bottom: BorderSide(color: AppColors.border)),
                  ),
                  child: Column(
                    children: [
                      TextField(
                        onChanged: (v) => setState(() => _search = v),
                        decoration: const InputDecoration(
                          hintText: 'Search item code, description, location...',
                          prefixIcon: Icon(Icons.search, size: 18),
                        ),
                      ),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        initialValue: _systemFilter,
                        decoration: const InputDecoration(labelText: 'System Tag'),
                        items: [
                          const DropdownMenuItem(value: 'ALL', child: Text('All Systems')),
                          ...erp.stockSystems.map(
                            (sys) => DropdownMenuItem(value: sys, child: Text(sys)),
                          ),
                        ],
                        onChanged: (v) => setState(() => _systemFilter = v ?? 'ALL'),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: filteredStock.isEmpty
                      ? const EmptyStateView(
                          icon: Icons.inventory_2_outlined,
                          title: 'No inventory items found',
                          subtitle: 'Try clearing your search or system filter.',
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(12),
                          itemCount: filteredStock.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 8),
                          itemBuilder: (_, idx) {
                            final s = filteredStock[idx];
                            final inStock = s.availableStock > 0;
                            return Container(
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
                                      Expanded(
                                        child: Text(
                                          s.itemCode,
                                          style: const TextStyle(
                                            fontFamily: 'monospace',
                                            fontWeight: FontWeight.w800,
                                            fontSize: 13,
                                            color: AppColors.primaryBlueDark,
                                          ),
                                        ),
                                      ),
                                      StatusBadge(
                                        status: inStock ? 'With Stock' : 'Without Stock',
                                        compact: true,
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(s.description, style: const TextStyle(fontSize: 12.5)),
                                  const SizedBox(height: 6),
                                  Text(
                                    '${s.systemTag} • ${s.assignedLocation}',
                                    style: const TextStyle(
                                      fontSize: 11.5,
                                      color: AppColors.textMuted,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'Available: ${formatQty(s.availableStock)} ${s.uom}',
                                        style: TextStyle(
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w800,
                                          color: inStock
                                              ? AppColors.success
                                              : AppColors.dangerText,
                                        ),
                                      ),
                                      ElevatedButton(
                                        onPressed: () => _openCreateWithdrawalSheet(s),
                                        style: ElevatedButton.styleFrom(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 12,
                                            vertical: 7,
                                          ),
                                          minimumSize: Size.zero,
                                        ),
                                        child: const Text('Request Withdrawal'),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
          ),

          // Tab 2: Withdrawal History
          RefreshIndicator(
            onRefresh: erp.loadStockAndWithdrawals,
            child: erp.withdrawals.isEmpty
                ? const EmptyStateView(
                    icon: Icons.history,
                    title: 'No withdrawal requests yet',
                    subtitle: 'Select an item from Warehouse Stock to request materials.',
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: erp.withdrawals.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (_, idx) {
                      final w = erp.withdrawals[idx];
                      final firstItem = w.items.isNotEmpty ? w.items.first : null;
                      return Container(
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
                                Expanded(
                                  child: Text(
                                    w.wdNo,
                                    style: const TextStyle(
                                      fontFamily: 'monospace',
                                      fontWeight: FontWeight.w800,
                                      fontSize: 13.5,
                                      color: AppColors.primaryBlueDark,
                                    ),
                                  ),
                                ),
                                StatusBadge(status: w.status),
                              ],
                            ),
                            const SizedBox(height: 6),
                            if (firstItem != null)
                              Text(
                                '${firstItem.itemCode} — ${firstItem.description}',
                                style: const TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            const SizedBox(height: 4),
                            Text(
                              'Qty: ${firstItem != null ? '${formatQty(firstItem.requestedQty)} ${firstItem.uom}' : '—'} • Job: ${w.jobNo}',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'By: ${w.requestedBy} • ${w.performedAt}',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: AppColors.textMuted,
                                  ),
                                ),
                                if (w.attachments.isNotEmpty)
                                  TextButton.icon(
                                    onPressed: () => showAttachmentViewerSheet(
                                      context,
                                      docNo: w.wdNo,
                                      attachments: w.attachments,
                                    ),
                                    icon: const Icon(Icons.attach_file, size: 14),
                                    label: Text('${w.attachments.length} file(s)'),
                                    style: TextButton.styleFrom(
                                      padding: EdgeInsets.zero,
                                      minimumSize: Size.zero,
                                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    ),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
