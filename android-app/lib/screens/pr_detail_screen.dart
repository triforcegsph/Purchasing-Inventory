import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../models/erp_models.dart';
import '../providers/auth_provider.dart';
import '../providers/erp_provider.dart';
import '../widgets/attachment_widgets.dart';
import '../widgets/enterprise_widgets.dart';
import '../widgets/status_badge.dart';
import 'pr_form_screen.dart';

class PrDetailScreen extends StatefulWidget {
  final String prId;

  const PrDetailScreen({super.key, required this.prId});

  @override
  State<PrDetailScreen> createState() => _PrDetailScreenState();
}

class _PrDetailScreenState extends State<PrDetailScreen> {
  Future<void> _confirmApprove(PrRecord pr) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          'Approve ${pr.prNo}?',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
        content: Text(
          'Confirm approval of ${pr.prNo} (${pr.items.length} item(s)) submitted by ${pr.applicant}. Once approved, it will advance to Purchase Order processing.',
          style: const TextStyle(fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Confirm Approve'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;
    final err = await context.read<ErpProvider>().approvePr(pr.id);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(err ?? '${pr.prNo} approved successfully.'),
        backgroundColor: err != null ? AppColors.danger : AppColors.success,
      ),
    );
  }

  Future<void> _confirmReject(PrRecord pr) async {
    final reasonCtrl = TextEditingController();
    String? validationErr;

    final reason = await showDialog<String>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text(
            'Reject ${pr.prNo}',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.dangerText,
            ),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Return to Applicant (${pr.applicant}). A rejection reason is mandatory.',
                style: const TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: reasonCtrl,
                maxLines: 3,
                autofocus: true,
                decoration: InputDecoration(
                  labelText: 'Rejection Reason *',
                  hintText: 'Explain what must be corrected...',
                  errorText: validationErr,
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
              onPressed: () {
                if (reasonCtrl.text.trim().isEmpty) {
                  setDialogState(() {
                    validationErr = 'Rejection reason is required.';
                  });
                  return;
                }
                Navigator.pop(ctx, reasonCtrl.text.trim());
              },
              child: const Text('Confirm Reject'),
            ),
          ],
        ),
      ),
    );

    if (reason == null || !mounted) return;
    final err = await context.read<ErpProvider>().rejectPr(pr.id, reason);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(err ?? '${pr.prNo} returned to Applicant.'),
        backgroundColor: err != null ? AppColors.danger : AppColors.orange,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final erp = context.watch<ErpProvider>();
    final pr = erp.prs.cast<PrRecord?>().firstWhere(
          (p) => p?.id == widget.prId || p?.prNo == widget.prId,
          orElse: () => null,
        );

    if (pr == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Purchase Requisition')),
        body: const EmptyStateView(
          icon: Icons.assignment_late_outlined,
          title: 'Purchase Requisition not found',
          subtitle: 'This record may have been updated or removed.',
        ),
      );
    }

    final user = auth.user;
    final isOwnPr = user != null &&
        ((pr.applicantId != null && pr.applicantId == user.id) ||
            pr.applicant.toLowerCase() == user.fullName.toLowerCase());
    final canActAsApprover =
        auth.permissions.canApprovePr && pr.isPendingApproval && !isOwnPr;
    final canEditAsApplicant =
        pr.isEditable && (user?.isApplicant == true ? isOwnPr || pr.applicantId == null : false);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: Text(pr.prNo),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(child: StatusBadge(status: pr.status, compact: true)),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(12),
              children: [
                if (pr.rejectionComments != null && pr.rejectionComments!.isNotEmpty) ...[
                  EnterpriseBanner(
                    message:
                        'Returned by ${pr.rejectedBy ?? 'REQ Approver'}${pr.rejectedAt != null ? ' (${pr.rejectedAt})' : ''}: ${pr.rejectionComments}',
                  ),
                  const SizedBox(height: 10),
                ],
                if (pr.status == 'Approved' && pr.approvedBy != null) ...[
                  EnterpriseBanner(
                    isError: false,
                    message:
                        'Approved by ${pr.approvedBy}${pr.approvedAt != null ? ' on ${pr.approvedAt}' : ''}. Ready for PO conversion.',
                  ),
                  const SizedBox(height: 10),
                ],

                // 1. Request, Applicant & Project Information
                EnterpriseCard(
                  title: 'Request, Applicant & Project Information',
                  child: Column(
                    children: [
                      InfoRow(label: 'PR Number', value: pr.prNo, mono: true),
                      InfoRow(label: 'Linked PQTO', value: pr.pqtoNo, mono: true),
                      InfoRow(label: 'Reference Doc No.', value: pr.refDocNo, mono: true),
                      InfoRow(label: 'Applicant', value: pr.applicant),
                      InfoRow(label: 'Project Code', value: pr.projectCode, mono: true),
                      InfoRow(label: 'Job / Project No.', value: pr.jobNo, mono: true),
                      InfoRow(label: 'SP Name', value: pr.spName ?? '—', mono: true),
                      InfoRow(label: 'Submission Date', value: pr.createdAt, mono: true),
                      if (pr.requiresBoqApproval)
                        const Padding(
                          padding: EdgeInsets.only(top: 6),
                          child: EnterpriseBanner(
                            message:
                                'Contains Non-BOQ material item(s) requiring explicit REQ Approver review.',
                          ),
                        ),
                    ],
                  ),
                ),

                const SizedBox(height: 12),

                // 2. Requested Materials & PQTO Remaining Balances
                EnterpriseCard(
                  title: 'Requested Materials & PQTO Balances (${pr.items.length})',
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: pr.items.map((item) {
                      final exceeds =
                          !item.isNewItem && item.requestedQty > item.currentPqtoRemaining;
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
                                if (item.isNewItem)
                                  const StatusBadge(status: 'NON-BOQ', compact: true)
                                else
                                  StatusBadge(
                                    status: exceeds ? 'EXCEEDS PQTO' : 'WITHIN BUDGET',
                                    compact: true,
                                  ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              item.description,
                              style: const TextStyle(fontSize: 12.5),
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    'Requested: ${formatQty(item.requestedQty)} ${item.uom}',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.primaryBlueDark,
                                    ),
                                  ),
                                ),
                                Text(
                                  item.isNewItem
                                      ? 'PQTO Rem: N/A'
                                      : 'PQTO Rem: ${formatQty(item.currentPqtoRemaining)} ${item.uom}',
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                    color: exceeds ? AppColors.dangerText : AppColors.success,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 3),
                            Text(
                              'Location: ${item.assignedLocation}',
                              style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),

                const SizedBox(height: 12),

                // 3. Supporting Attachments
                EnterpriseCard(
                  title: 'Supporting Attachments (${pr.attachments.length})',
                  child: pr.attachments.isEmpty
                      ? const Text(
                          'No supporting files attached.',
                          style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                        )
                      : Column(
                          children: pr.attachments.map((att) {
                            return ListTile(
                              dense: true,
                              contentPadding: EdgeInsets.zero,
                              leading: Icon(
                                att.type == 'JPG' || att.type == 'PNG'
                                    ? Icons.image_outlined
                                    : Icons.picture_as_pdf_outlined,
                                color: AppColors.primaryBlue,
                              ),
                              title: Text(
                                att.name,
                                style: const TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              subtitle: Text(
                                '${att.type} • ${att.size} • ${att.uploadedAt}',
                                style: const TextStyle(fontSize: 11),
                              ),
                              trailing: const Icon(Icons.visibility_outlined, size: 18),
                              onTap: () => showAttachmentViewerSheet(
                                context,
                                docNo: pr.prNo,
                                attachments: pr.attachments,
                              ),
                            );
                          }).toList(),
                        ),
                ),

                const SizedBox(height: 20),
              ],
            ),
          ),

          // Role-Gated Action Footer
          if (canActAsApprover)
            SafeArea(
              top: false,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: const BoxDecoration(
                  color: AppColors.surface,
                  border: Border(top: BorderSide(color: AppColors.border)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.danger,
                        ),
                        onPressed: erp.isSubmitting ? null : () => _confirmReject(pr),
                        icon: const Icon(Icons.cancel_outlined, size: 17),
                        label: const Text('REJECT'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.success,
                        ),
                        onPressed: erp.isSubmitting ? null : () => _confirmApprove(pr),
                        icon: const Icon(Icons.check_circle_outline, size: 17),
                        label: const Text('APPROVE'),
                      ),
                    ),
                  ],
                ),
              ),
            )
          else if (canEditAsApplicant)
            SafeArea(
              top: false,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: const BoxDecoration(
                  color: AppColors.surface,
                  border: Border(top: BorderSide(color: AppColors.border)),
                ),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => PrFormScreen(existingPr: pr),
                        ),
                      );
                    },
                    icon: const Icon(Icons.edit_outlined, size: 17),
                    label: Text(
                      pr.status == 'Draft'
                          ? 'Edit & Submit Draft'
                          : 'Edit & Resubmit Returned PR',
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
