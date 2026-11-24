import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../models/erp_models.dart';
import '../providers/erp_provider.dart';
import '../widgets/attachment_widgets.dart';
import '../widgets/enterprise_widgets.dart';
import '../widgets/status_badge.dart';

class PoScreen extends StatefulWidget {
  const PoScreen({super.key});

  @override
  State<PoScreen> createState() => _PoScreenState();
}

class _PoScreenState extends State<PoScreen> {
  String _search = '';
  final _currency = NumberFormat.currency(symbol: '₱', decimalDigits: 2);

  @override
  Widget build(BuildContext context) {
    final erp = context.watch<ErpProvider>();
    final filtered = erp.pos.where((po) {
      final q = _search.trim().toLowerCase();
      return q.isEmpty ||
          po.poNo.toLowerCase().contains(q) ||
          po.prNo.toLowerCase().contains(q) ||
          po.refDocNo.toLowerCase().contains(q) ||
          po.iaas2RefNo.toLowerCase().contains(q) ||
          po.vendor.toLowerCase().contains(q) ||
          po.status.toLowerCase().contains(q);
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(title: const Text('PO — Purchase Orders')),
      body: RefreshIndicator(
        onRefresh: erp.loadPos,
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
                    onChanged: (v) => setState(() => _search = v),
                    decoration: const InputDecoration(
                      hintText: 'Search PO No., PR No., Vendor, IAAS2 Ref...',
                      prefixIcon: Icon(Icons.search, size: 18),
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Row(
                    children: [
                      Icon(Icons.info_outline, size: 13, color: AppColors.textMuted),
                      SizedBox(width: 5),
                      Expanded(
                        child: Text(
                          'Read-only procurement progress view. PO approvals are restricted to PO Approver on web.',
                          style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Expanded(
              child: filtered.isEmpty
                  ? const EmptyStateView(
                      icon: Icons.shopping_cart_outlined,
                      title: 'No Purchase Orders found',
                      subtitle: 'Approved PRs converted to Purchase Orders will appear here.',
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(12),
                      itemCount: filtered.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final po = filtered[index];
                        return InkWell(
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => PoDetailScreen(po: po)),
                            );
                          },
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
                                    Expanded(
                                      child: Text(
                                        po.poNo,
                                        style: const TextStyle(
                                          fontFamily: 'monospace',
                                          fontWeight: FontWeight.w800,
                                          fontSize: 13.5,
                                          color: AppColors.primaryBlueDark,
                                        ),
                                      ),
                                    ),
                                    StatusBadge(status: po.status),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  po.vendor,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'PR: ${po.prNo} • IAAS2: ${po.iaas2RefNo} • Ref: ${po.refDocNo}',
                                  style: const TextStyle(
                                    fontSize: 11.5,
                                    fontFamily: 'monospace',
                                    color: AppColors.textMuted,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        getPoStageDescription(po.status),
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      _currency.format(po.totalAmount),
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                  ],
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

class PoDetailScreen extends StatelessWidget {
  final PoRecord po;

  const PoDetailScreen({super.key, required this.po});

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(symbol: '₱', decimalDigits: 2);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: Text(po.poNo),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(child: StatusBadge(status: po.status, compact: true)),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          if (po.rejectionComments != null && po.rejectionComments!.isNotEmpty) ...[
            EnterpriseBanner(message: 'PO Rejection Comments: ${po.rejectionComments}'),
            const SizedBox(height: 10),
          ],
          EnterpriseCard(
            title: 'Purchase Order Summary',
            child: Column(
              children: [
                InfoRow(label: 'PO Number', value: po.poNo, mono: true),
                InfoRow(label: 'Linked PR Number', value: po.prNo, mono: true),
                InfoRow(label: 'Vendor', value: po.vendor),
                InfoRow(label: 'Reference Doc No.', value: po.refDocNo, mono: true),
                InfoRow(label: 'IAAS2 Reference', value: po.iaas2RefNo, mono: true),
                InfoRow(label: 'SP Name', value: po.spName ?? '—', mono: true),
                InfoRow(label: 'Applicant', value: po.applicant),
                InfoRow(label: 'PO Approver', value: po.approver),
                InfoRow(label: 'Created At', value: po.createdAt, mono: true),
                InfoRow(label: 'Stage', value: getPoStageDescription(po.status)),
                const Divider(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'TOTAL ORDER AMOUNT',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    Text(
                      currency.format(po.totalAmount),
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primaryBlueDark,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          EnterpriseCard(
            title: 'Ordered Items (${po.items.length})',
            padding: EdgeInsets.zero,
            child: Column(
              children: po.items.map((item) {
                return Container(
                  padding: const EdgeInsets.all(12),
                  decoration: const BoxDecoration(
                    border: Border(bottom: BorderSide(color: AppColors.divider)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              item.itemCode,
                              style: const TextStyle(
                                fontFamily: 'monospace',
                                fontWeight: FontWeight.w700,
                                fontSize: 12.5,
                              ),
                            ),
                          ),
                          Text(
                            currency.format(item.lineTotal),
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 12.5,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(item.description, style: const TextStyle(fontSize: 12)),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Qty: ${formatQty(item.poQty)} ${item.uom} @ ${currency.format(item.unitPrice)}',
                            style: const TextStyle(
                              fontSize: 11.5,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          Text(
                            'Recv: ${formatQty(item.receivedQty)} / ${formatQty(item.poQty)}',
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: item.receivedQty >= item.poQty
                                  ? AppColors.success
                                  : AppColors.orange,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 12),
          EnterpriseCard(
            title: 'Attachments (${po.attachments.length})',
            child: po.attachments.isEmpty
                ? const Text(
                    'No attachments attached to this PO.',
                    style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                  )
                : Column(
                    children: po.attachments.map((att) {
                      return ListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.description_outlined, color: AppColors.primaryBlue),
                        title: Text(att.name, style: const TextStyle(fontSize: 12.5)),
                        subtitle: Text('${att.type} • ${att.size}', style: const TextStyle(fontSize: 11)),
                        trailing: const Icon(Icons.visibility_outlined, size: 18),
                        onTap: () => showAttachmentViewerSheet(
                          context,
                          docNo: po.poNo,
                          attachments: po.attachments,
                        ),
                      );
                    }).toList(),
                  ),
          ),
        ],
      ),
    );
  }
}
