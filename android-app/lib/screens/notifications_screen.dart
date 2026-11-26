import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../models/erp_models.dart';
import '../providers/erp_provider.dart';
import '../widgets/enterprise_widgets.dart';
import 'po_screen.dart';
import 'pqto_screen.dart';
import 'pr_detail_screen.dart';
import 'withdrawal_screen.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  void _openLinkedTransaction(BuildContext context, NotificationItem item) {
    final erp = context.read<ErpProvider>();
    if (!item.read) {
      erp.markNotificationRead(item.id);
    }

    switch (item.docType) {
      case 'PR':
        if (item.docId != null && item.docId!.isNotEmpty) {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => PrDetailScreen(prId: item.docId!)),
          );
        }
        break;
      case 'PO':
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const PoScreen()),
        );
        break;
      case 'WITHDRAWAL':
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const WithdrawalScreen()),
        );
        break;
      case 'PQTO':
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const PqtoScreen()),
        );
        break;
      default:
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final erp = context.watch<ErpProvider>();

    return RefreshIndicator(
      onRefresh: erp.loadNotifications,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border(bottom: BorderSide(color: AppColors.border)),
            ),
            child: Row(
              children: [
                const Icon(Icons.notifications_outlined, size: 18, color: AppColors.primaryBlue),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'NOTIFICATIONS (${erp.unreadNotifications} UNREAD)',
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.4,
                    ),
                  ),
                ),
                if (erp.unreadNotifications > 0)
                  TextButton(
                    onPressed: erp.markAllNotificationsRead,
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      minimumSize: Size.zero,
                    ),
                    child: const Text('Mark All Read', style: TextStyle(fontSize: 12)),
                  ),
              ],
            ),
          ),
          Expanded(
            child: erp.notifications.isEmpty
                ? const EmptyStateView(
                    icon: Icons.notifications_none,
                    title: 'No notifications yet',
                    subtitle: 'Workflow alerts for PRs, approvals, POs, and withdrawals will appear here.',
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: erp.notifications.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final n = erp.notifications[index];
                      return InkWell(
                        onTap: () => _openLinkedTransaction(context, n),
                        borderRadius: BorderRadius.circular(4),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: n.read ? AppColors.surface : AppColors.paleBlueBg,
                            border: Border.all(
                              color: n.read
                                  ? AppColors.border
                                  : const Color(0xFFB3D1FF),
                            ),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                margin: const EdgeInsets.only(top: 4),
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: n.read
                                      ? AppColors.border
                                      : AppColors.primaryBlue,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            n.title,
                                            style: TextStyle(
                                              fontSize: 13,
                                              fontWeight:
                                                  n.read ? FontWeight.w600 : FontWeight.w800,
                                            ),
                                          ),
                                        ),
                                        Text(
                                          n.timestamp,
                                          style: const TextStyle(
                                            fontSize: 10.5,
                                            fontFamily: 'monospace',
                                            color: AppColors.textHint,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      n.message,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.textSecondary,
                                      ),
                                    ),
                                    if (n.docNo != null && n.docNo!.isNotEmpty) ...[
                                      const SizedBox(height: 6),
                                      Row(
                                        children: [
                                          Text(
                                            'Open ${n.docNo}',
                                            style: const TextStyle(
                                              fontSize: 11.5,
                                              fontWeight: FontWeight.w700,
                                              color: AppColors.primaryBlue,
                                            ),
                                          ),
                                          const SizedBox(width: 4),
                                          const Icon(
                                            Icons.arrow_forward,
                                            size: 13,
                                            color: AppColors.primaryBlue,
                                          ),
                                        ],
                                      ),
                                    ],
                                  ],
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
    );
  }
}
