import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../models/erp_models.dart';
import '../providers/auth_provider.dart';
import '../providers/erp_provider.dart';
import '../widgets/enterprise_widgets.dart';
import '../widgets/status_badge.dart';
import 'pr_detail_screen.dart';
import 'pr_form_screen.dart';

class PrListScreen extends StatefulWidget {
  const PrListScreen({super.key});

  @override
  State<PrListScreen> createState() => _PrListScreenState();
}

class _PrListScreenState extends State<PrListScreen> {
  String _statusFilter = 'ALL';
  String _search = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final isApprover = context.read<AuthProvider>().user?.isReqApprover == true;
      if (isApprover) {
        setState(() => _statusFilter = 'Pending Approval');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final erp = context.watch<ErpProvider>();
    final isApprover = auth.user?.isReqApprover == true;

    final allPrs = erp.prs;
    final pendingCount = allPrs.where((p) => p.status == 'Pending Approval').length;
    final approvedCount =
        allPrs.where((p) => p.status == 'Approved' || p.status == 'Converted to PO').length;
    final returnedCount =
        allPrs.where((p) => p.status == 'Returned to Applicant' || p.status == 'Rejected').length;
    final draftCount = allPrs.where((p) => p.status == 'Draft').length;

    final filtered = allPrs.where((pr) {
      final q = _search.trim().toLowerCase();
      final matchesQuery = q.isEmpty ||
          pr.prNo.toLowerCase().contains(q) ||
          pr.pqtoNo.toLowerCase().contains(q) ||
          pr.refDocNo.toLowerCase().contains(q) ||
          pr.applicant.toLowerCase().contains(q) ||
          pr.jobNo.toLowerCase().contains(q);

      if (!matchesQuery) return false;
      if (_statusFilter == 'ALL') return true;
      if (_statusFilter == 'Returned') {
        return pr.status == 'Returned to Applicant' || pr.status == 'Rejected';
      }
      if (_statusFilter == 'Approved') {
        return pr.status == 'Approved' || pr.status == 'Converted to PO';
      }
      return pr.status == _statusFilter;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.canvas,
      floatingActionButton: auth.permissions.canCreatePr
          ? FloatingActionButton.extended(
              backgroundColor: AppColors.primaryBlue,
              foregroundColor: Colors.white,
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const PrFormScreen()),
                );
              },
              icon: const Icon(Icons.add),
              label: const Text('New PR'),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: erp.loadPrs,
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
                  Row(
                    children: [
                      Icon(
                        isApprover ? Icons.fact_check_outlined : Icons.assignment_outlined,
                        size: 18,
                        color: AppColors.primaryBlue,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          isApprover
                              ? 'PR APPROVAL QUEUE & REGISTER'
                              : 'PURCHASE REQUISITIONS (PR)',
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.4,
                          ),
                        ),
                      ),
                      if (isApprover && pendingCount > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.warningBg,
                            border: Border.all(color: AppColors.warningBorder),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '$pendingCount Pending Review',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.warning,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    onChanged: (v) => setState(() => _search = v),
                    decoration: const InputDecoration(
                      hintText: 'Search PR No., PQTO, Ref Doc, Applicant...',
                      prefixIcon: Icon(Icons.search, size: 18),
                    ),
                  ),
                  const SizedBox(height: 8),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        if (isApprover) ...[
                          _StatusChip(
                            label: 'Pending ($pendingCount)',
                            selected: _statusFilter == 'Pending Approval',
                            onTap: () => setState(() => _statusFilter = 'Pending Approval'),
                          ),
                          const SizedBox(width: 6),
                          _StatusChip(
                            label: 'Approved ($approvedCount)',
                            selected: _statusFilter == 'Approved',
                            onTap: () => setState(() => _statusFilter = 'Approved'),
                          ),
                          const SizedBox(width: 6),
                          _StatusChip(
                            label: 'Returned ($returnedCount)',
                            selected: _statusFilter == 'Returned',
                            onTap: () => setState(() => _statusFilter = 'Returned'),
                          ),
                          const SizedBox(width: 6),
                          _StatusChip(
                            label: 'All (${allPrs.length})',
                            selected: _statusFilter == 'ALL',
                            onTap: () => setState(() => _statusFilter = 'ALL'),
                          ),
                        ] else ...[
                          _StatusChip(
                            label: 'All (${allPrs.length})',
                            selected: _statusFilter == 'ALL',
                            onTap: () => setState(() => _statusFilter = 'ALL'),
                          ),
                          const SizedBox(width: 6),
                          _StatusChip(
                            label: 'Pending ($pendingCount)',
                            selected: _statusFilter == 'Pending Approval',
                            onTap: () => setState(() => _statusFilter = 'Pending Approval'),
                          ),
                          const SizedBox(width: 6),
                          _StatusChip(
                            label: 'Drafts ($draftCount)',
                            selected: _statusFilter == 'Draft',
                            onTap: () => setState(() => _statusFilter = 'Draft'),
                          ),
                          const SizedBox(width: 6),
                          _StatusChip(
                            label: 'Approved ($approvedCount)',
                            selected: _statusFilter == 'Approved',
                            onTap: () => setState(() => _statusFilter = 'Approved'),
                          ),
                          const SizedBox(width: 6),
                          _StatusChip(
                            label: 'Returned ($returnedCount)',
                            selected: _statusFilter == 'Returned',
                            onTap: () => setState(() => _statusFilter = 'Returned'),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: filtered.isEmpty
                  ? EmptyStateView(
                      icon: isApprover ? Icons.check_circle_outline : Icons.assignment_outlined,
                      title: _statusFilter == 'Pending Approval'
                          ? 'No pending requests'
                          : 'No Purchase Requisitions found',
                      subtitle: isApprover
                          ? 'All submitted Purchase Requisitions have been reviewed.'
                          : 'Tap "New PR" to initiate a material requisition.',
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(12, 12, 12, 84),
                      itemCount: filtered.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final pr = filtered[index];
                        return _PrCard(
                          pr: pr,
                          isApprover: isApprover,
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => PrDetailScreen(prId: pr.id),
                              ),
                            );
                          },
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

class _PrCard extends StatelessWidget {
  final PrRecord pr;
  final bool isApprover;
  final VoidCallback onTap;

  const _PrCard({
    required this.pr,
    required this.isApprover,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(4),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: Border.all(
            color: pr.isPendingApproval && isApprover
                ? AppColors.warningBorder
                : AppColors.border,
          ),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    pr.prNo,
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.w800,
                      fontSize: 13.5,
                      color: AppColors.primaryBlueDark,
                    ),
                  ),
                ),
                StatusBadge(status: pr.status),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.person_outline, size: 14, color: AppColors.textMuted),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    pr.applicant,
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                Text(
                  pr.createdAt,
                  style: const TextStyle(
                    fontSize: 11,
                    fontFamily: 'monospace',
                    color: AppColors.textHint,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 10,
              runSpacing: 4,
              children: [
                _MetaTag(icon: Icons.work_outline, text: pr.jobNo),
                _MetaTag(icon: Icons.calculate_outlined, text: pr.pqtoNo),
                if (pr.refDocNo.isNotEmpty)
                  _MetaTag(icon: Icons.tag, text: pr.refDocNo),
                _MetaTag(icon: Icons.list_alt, text: '${pr.items.length} item(s)'),
                _MetaTag(
                  icon: Icons.attach_file,
                  text: '${pr.attachments.length} file(s)',
                ),
              ],
            ),
            if (pr.rejectionComments != null && pr.rejectionComments!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.dangerBg,
                  border: Border.all(color: AppColors.dangerBorder),
                  borderRadius: BorderRadius.circular(3),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.feedback_outlined, size: 14, color: AppColors.dangerText),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Returned Reason: ${pr.rejectionComments}',
                        style: const TextStyle(
                          fontSize: 11.5,
                          color: AppColors.dangerText,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (isApprover && pr.isPendingApproval) ...[
              const SizedBox(height: 8),
              const Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    'Tap to Review & Approve / Reject',
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryBlue,
                    ),
                  ),
                  SizedBox(width: 4),
                  Icon(Icons.arrow_forward, size: 14, color: AppColors.primaryBlue),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _MetaTag extends StatelessWidget {
  final IconData icon;
  final String text;

  const _MetaTag({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: AppColors.textMuted),
        const SizedBox(width: 3),
        Text(
          text,
          style: const TextStyle(fontSize: 11.5, color: AppColors.textSecondary),
        ),
      ],
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _StatusChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(3),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.primaryBlue : AppColors.surface,
          border: Border.all(
            color: selected ? AppColors.primaryBlue : AppColors.inputBorder,
          ),
          borderRadius: BorderRadius.circular(3),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : AppColors.textPrimary,
          ),
        ),
      ),
    );
  }
}
