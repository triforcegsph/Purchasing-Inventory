import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../models/erp_models.dart';
import '../providers/auth_provider.dart';
import '../providers/erp_provider.dart';
import '../widgets/enterprise_widgets.dart';
import '../widgets/status_badge.dart';

class DashboardScreen extends StatelessWidget {
  final VoidCallback onOpenRequests;
  final VoidCallback onOpenNewPr;
  final VoidCallback onOpenBoq;
  final VoidCallback onOpenPqto;
  final VoidCallback onOpenPo;
  final VoidCallback onOpenWithdrawal;
  final VoidCallback onOpenTracking;
  final ValueChanged<PrRecord> onOpenPrDetail;

  const DashboardScreen({
    super.key,
    required this.onOpenRequests,
    required this.onOpenNewPr,
    required this.onOpenBoq,
    required this.onOpenPqto,
    required this.onOpenPo,
    required this.onOpenWithdrawal,
    required this.onOpenTracking,
    required this.onOpenPrDetail,
  });

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final erp = context.watch<ErpProvider>();
    final user = auth.user;
    final dashboard = erp.dashboard;
    final isApprover = user?.isReqApprover == true;

    return RefreshIndicator(
      onRefresh: () => erp.loadInitialData(
        canAccessWithdrawal: auth.permissions.canAccessWithdrawal,
      ),
      child: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          if (erp.error != null) ...[
            EnterpriseBanner(
              message: erp.error!,
              onRetry: () => erp.loadDashboard(),
            ),
            const SizedBox(height: 10),
          ],

          // Role & Project Context Header Card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.masthead,
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: AppColors.mastheadBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        isApprover ? 'REQ APPROVER DASHBOARD' : 'APPLICANT DASHBOARD',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.7,
                          color: AppColors.accentLightBlue,
                        ),
                      ),
                    ),
                    StatusBadge(
                      status: dashboard?.boqStatus ?? erp.boqStatus,
                      compact: true,
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  user?.fullName ?? '',
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${erp.activeProject.name} • ${erp.activeProject.jobNo}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontFamily: 'monospace',
                    color: Color(0xFFCBD5E1),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  erp.activeProject.description,
                  style: const TextStyle(
                    fontSize: 11.5,
                    color: Color(0xFF94A3B8),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // KPI Grid (Role-Adaptive)
          if (isApprover) _buildApproverKpis(dashboard) else _buildApplicantKpis(dashboard),

          const SizedBox(height: 12),

          // Visual Status Breakdown Chart
          EnterpriseCard(
            title: isApprover ? 'Requisition Review Breakdown' : 'Purchase Requisition Summary',
            child: StatusDistributionBar(
              segments: isApprover
                  ? [
                      (
                        label: 'Pending',
                        count: dashboard?.metrics['pendingApproval'] ?? 0,
                        color: const Color(0xFFD97706),
                      ),
                      (
                        label: 'Approved',
                        count: dashboard?.metrics['approved'] ?? 0,
                        color: AppColors.success,
                      ),
                      (
                        label: 'Rejected',
                        count: dashboard?.metrics['rejected'] ?? 0,
                        color: AppColors.danger,
                      ),
                    ]
                  : [
                      (
                        label: 'Pending',
                        count: dashboard?.metrics['pending'] ?? 0,
                        color: const Color(0xFFD97706),
                      ),
                      (
                        label: 'Approved',
                        count: dashboard?.metrics['approved'] ?? 0,
                        color: AppColors.success,
                      ),
                      (
                        label: 'Returned',
                        count: dashboard?.metrics['rejected'] ?? 0,
                        color: AppColors.danger,
                      ),
                      (
                        label: 'Drafts',
                        count: dashboard?.metrics['drafts'] ?? 0,
                        color: AppColors.textMuted,
                      ),
                    ],
            ),
          ),

          const SizedBox(height: 12),

          // Quick Actions
          EnterpriseCard(
            title: 'Quick Actions',
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: isApprover
                  ? [
                      _QuickActionButton(
                        icon: Icons.fact_check_outlined,
                        label: 'Approval Queue',
                        primary: true,
                        onTap: onOpenRequests,
                      ),
                      _QuickActionButton(
                        icon: Icons.table_chart_outlined,
                        label: 'View BOQ',
                        onTap: onOpenBoq,
                      ),
                      _QuickActionButton(
                        icon: Icons.calculate_outlined,
                        label: 'View PQTO',
                        onTap: onOpenPqto,
                      ),
                      _QuickActionButton(
                        icon: Icons.shopping_cart_outlined,
                        label: 'Purchase Orders',
                        onTap: onOpenPo,
                      ),
                      _QuickActionButton(
                        icon: Icons.alt_route,
                        label: 'Tracking',
                        onTap: onOpenTracking,
                      ),
                    ]
                  : [
                      _QuickActionButton(
                        icon: Icons.note_add_outlined,
                        label: 'New PR',
                        primary: true,
                        onTap: onOpenNewPr,
                      ),
                      _QuickActionButton(
                        icon: Icons.outbox_outlined,
                        label: 'Withdrawal',
                        onTap: onOpenWithdrawal,
                      ),
                      _QuickActionButton(
                        icon: Icons.table_chart_outlined,
                        label: 'BOQ',
                        onTap: onOpenBoq,
                      ),
                      _QuickActionButton(
                        icon: Icons.calculate_outlined,
                        label: 'PQTO',
                        onTap: onOpenPqto,
                      ),
                      _QuickActionButton(
                        icon: Icons.shopping_cart_outlined,
                        label: 'View POs',
                        onTap: onOpenPo,
                      ),
                      _QuickActionButton(
                        icon: Icons.alt_route,
                        label: 'Tracking',
                        onTap: onOpenTracking,
                      ),
                    ],
            ),
          ),

          const SizedBox(height: 12),

          // Recently Submitted PRs (for Approver) or Recent PRs (for Applicant)
          EnterpriseCard(
            title: isApprover
                ? 'Pending Approval Queue'
                : 'Recent Purchase Requisitions',
            trailing: TextButton(
              onPressed: onOpenRequests,
              style: TextButton.styleFrom(
                padding: EdgeInsets.zero,
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: const Text('View All', style: TextStyle(fontSize: 11.5)),
            ),
            padding: EdgeInsets.zero,
            child: (dashboard?.recentPrs.isEmpty ?? true)
                ? Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      isApprover
                          ? 'No pending Purchase Requisitions waiting for approval.'
                          : 'No Purchase Requisitions yet. Tap "New PR" to create one.',
                      style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                    ),
                  )
                : Column(
                    children: dashboard!.recentPrs.map((pr) {
                      return InkWell(
                        onTap: () => onOpenPrDetail(pr),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: const BoxDecoration(
                            border: Border(bottom: BorderSide(color: AppColors.divider)),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Text(
                                          pr.prNo,
                                          style: const TextStyle(
                                            fontFamily: 'monospace',
                                            fontWeight: FontWeight.w700,
                                            fontSize: 12.5,
                                            color: AppColors.primaryBlueDark,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        StatusBadge(status: pr.status, compact: true),
                                      ],
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      '${pr.applicant} • ${pr.items.length} item(s) • ${pr.pqtoNo}',
                                      style: const TextStyle(
                                        fontSize: 11.5,
                                        color: AppColors.textMuted,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(
                                Icons.chevron_right,
                                size: 18,
                                color: AppColors.textHint,
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
          ),

          const SizedBox(height: 12),

          // Recent Activities
          EnterpriseCard(
            title: isApprover ? 'Recent Approval Activities' : 'Recent Activities',
            padding: EdgeInsets.zero,
            child: (dashboard?.recentActivities.isEmpty ?? true)
                ? const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text(
                      'No recent activity recorded.',
                      style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                    ),
                  )
                : Column(
                    children: dashboard!.recentActivities.map((log) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                        decoration: const BoxDecoration(
                          border: Border(bottom: BorderSide(color: AppColors.divider)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: AppColors.softBlueBg,
                                    borderRadius: BorderRadius.circular(2),
                                  ),
                                  child: Text(
                                    log.module,
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.deepBlueText,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    '${log.docNo} — ${log.action}',
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 3),
                            Text(
                              log.comments,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 11.5,
                                color: AppColors.textMuted,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${log.adminOrUser} • ${log.timestamp}',
                              style: const TextStyle(
                                fontSize: 10.5,
                                fontFamily: 'monospace',
                                color: AppColors.textHint,
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
          ),

          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildApplicantKpis(DashboardData? d) {
    final m = d?.metrics ?? {};
    return Column(
      children: [
        GridView.count(
          crossAxisCount: 2,
          crossAxisSpacing: 8,
          mainAxisSpacing: 8,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 1.75,
          children: [
            KpiCard(
              label: 'Total Purchase Requisitions',
              value: m['totalPrs'] ?? 0,
              accentColor: AppColors.primaryBlue,
              icon: Icons.assignment_outlined,
              onTap: onOpenRequests,
            ),
            KpiCard(
              label: 'Pending Approval',
              value: m['pending'] ?? 0,
              accentColor: const Color(0xFFD97706),
              icon: Icons.hourglass_top,
              onTap: onOpenRequests,
            ),
            KpiCard(
              label: 'Approved Requests',
              value: m['approved'] ?? 0,
              accentColor: AppColors.success,
              icon: Icons.check_circle_outline,
              onTap: onOpenRequests,
            ),
            KpiCard(
              label: 'Returned / Rejected',
              value: m['rejected'] ?? 0,
              accentColor: AppColors.danger,
              icon: Icons.undo,
              onTap: onOpenRequests,
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: KpiCard(
                label: 'Draft Requests',
                value: m['drafts'] ?? 0,
                accentColor: AppColors.textSecondary,
                icon: Icons.edit_note,
                onTap: onOpenRequests,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: KpiCard(
                label: 'Withdrawals',
                value: m['totalWithdrawals'] ?? 0,
                accentColor: AppColors.primaryBlueDark,
                icon: Icons.outbox_outlined,
                onTap: onOpenWithdrawal,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildApproverKpis(DashboardData? d) {
    final m = d?.metrics ?? {};
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 8,
      mainAxisSpacing: 8,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.75,
      children: [
        KpiCard(
          label: 'Pending Approval Queue',
          value: m['pendingApproval'] ?? 0,
          accentColor: const Color(0xFFD97706),
          icon: Icons.pending_actions,
          onTap: onOpenRequests,
        ),
        KpiCard(
          label: 'Total Reviewed',
          value: m['totalReviewed'] ?? 0,
          accentColor: AppColors.primaryBlue,
          icon: Icons.fact_check_outlined,
          onTap: onOpenRequests,
        ),
        KpiCard(
          label: 'Approved Requests',
          value: m['approved'] ?? 0,
          accentColor: AppColors.success,
          icon: Icons.check_circle_outline,
          onTap: onOpenRequests,
        ),
        KpiCard(
          label: 'Rejected / Returned',
          value: m['rejected'] ?? 0,
          accentColor: AppColors.danger,
          icon: Icons.cancel_outlined,
          onTap: onOpenRequests,
        ),
      ],
    );
  }
}

class _QuickActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool primary;
  final VoidCallback onTap;

  const _QuickActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.primary = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(4),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        decoration: BoxDecoration(
          color: primary ? AppColors.primaryBlue : AppColors.headerSurface,
          border: Border.all(
            color: primary ? AppColors.primaryBlue : AppColors.inputBorder,
          ),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 16,
              color: primary ? Colors.white : AppColors.primaryBlueDark,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: primary ? Colors.white : AppColors.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
