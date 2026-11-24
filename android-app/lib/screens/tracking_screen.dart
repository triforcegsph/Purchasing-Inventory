import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../models/erp_models.dart';
import '../providers/erp_provider.dart';
import '../widgets/attachment_widgets.dart';
import '../widgets/enterprise_widgets.dart';
import '../widgets/status_badge.dart';
import 'pr_detail_screen.dart';

class TrackingScreen extends StatefulWidget {
  const TrackingScreen({super.key});

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen> {
  String _stageFilter = 'ALL';
  String _search = '';

  Future<void> _reload() async {
    await context.read<ErpProvider>().loadTracking(
          stage: _stageFilter,
          search: _search,
        );
  }

  @override
  Widget build(BuildContext context) {
    final erp = context.watch<ErpProvider>();
    final counts = erp.trackingCounts;

    return RefreshIndicator(
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
                const Row(
                  children: [
                    Icon(Icons.alt_route, size: 18, color: AppColors.primaryBlue),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'TRK — END-TO-END PROCUREMENT TRACKING',
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.4,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(
                  onChanged: (v) {
                    setState(() => _search = v);
                    _reload();
                  },
                  decoration: const InputDecoration(
                    hintText: 'Track by PR, PO, GRN, WD, Applicant...',
                    prefixIcon: Icon(Icons.search, size: 18),
                  ),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _StageChip(
                        label: 'All (${counts['ALL'] ?? 0})',
                        selected: _stageFilter == 'ALL',
                        onTap: () {
                          setState(() => _stageFilter = 'ALL');
                          _reload();
                        },
                      ),
                      const SizedBox(width: 6),
                      _StageChip(
                        label: 'REQ (${counts['PR'] ?? 0})',
                        selected: _stageFilter == 'PR',
                        onTap: () {
                          setState(() => _stageFilter = 'PR');
                          _reload();
                        },
                      ),
                      const SizedBox(width: 6),
                      _StageChip(
                        label: 'PO (${counts['PO'] ?? 0})',
                        selected: _stageFilter == 'PO',
                        onTap: () {
                          setState(() => _stageFilter = 'PO');
                          _reload();
                        },
                      ),
                      const SizedBox(width: 6),
                      _StageChip(
                        label: 'Delivery (${counts['DELIVERY'] ?? 0})',
                        selected: _stageFilter == 'DELIVERY',
                        onTap: () {
                          setState(() => _stageFilter = 'DELIVERY');
                          _reload();
                        },
                      ),
                      const SizedBox(width: 6),
                      _StageChip(
                        label: 'Done (${counts['DONE'] ?? 0})',
                        selected: _stageFilter == 'DONE',
                        onTap: () {
                          setState(() => _stageFilter = 'DONE');
                          _reload();
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: erp.trackingChains.isEmpty
                ? const EmptyStateView(
                    icon: Icons.alt_route,
                    title: 'No tracked transactions found',
                    subtitle: 'Transactions from BOQ through Material Withdrawal will appear here.',
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: erp.trackingChains.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final chain = erp.trackingChains[index];
                      return _TrackingChainCard(chain: chain);
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _TrackingChainCard extends StatefulWidget {
  final TrackingChain chain;

  const _TrackingChainCard({required this.chain});

  @override
  State<_TrackingChainCard> createState() => _TrackingChainCardState();
}

class _TrackingChainCardState extends State<_TrackingChainCard> {
  bool _expanded = true;

  @override
  Widget build(BuildContext context) {
    final chain = widget.chain;
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(4),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: const BoxDecoration(
                color: AppColors.headerSurface,
                border: Border(bottom: BorderSide(color: AppColors.border)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${chain.prNo}${chain.linkedPoNos.isNotEmpty ? ' → ${chain.linkedPoNos.first}' : ''}',
                          style: const TextStyle(
                            fontFamily: 'monospace',
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                            color: AppColors.primaryBlueDark,
                          ),
                        ),
                      ),
                      StatusBadge(status: chain.overallStatus, compact: true),
                      const SizedBox(width: 4),
                      Icon(
                        _expanded ? Icons.expand_less : Icons.expand_more,
                        size: 20,
                        color: AppColors.textMuted,
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Applicant: ${chain.applicant} • Job: ${chain.jobNo} • Ref: ${chain.refDocNo}',
                    style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
          ),
          if (_expanded)
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 6-Stage Vertical Mobile Timeline
                  ...List.generate(chain.steps.length, (i) {
                    final step = chain.steps[i];
                    final isLast = i == chain.steps.length - 1;
                    return _VerticalTimelineStep(step: step, isLast: isLast);
                  }),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      if (chain.attachments.isNotEmpty)
                        OutlinedButton.icon(
                          onPressed: () => showAttachmentViewerSheet(
                            context,
                            docNo: chain.prNo,
                            attachments: chain.attachments,
                          ),
                          icon: const Icon(Icons.attach_file, size: 15),
                          label: Text('${chain.attachments.length} File(s)'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            minimumSize: Size.zero,
                          ),
                        ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => PrDetailScreen(prId: chain.id),
                            ),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                          minimumSize: Size.zero,
                        ),
                        child: const Text('Open PR'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _VerticalTimelineStep extends StatelessWidget {
  final TrackingStep step;
  final bool isLast;

  const _VerticalTimelineStep({
    required this.step,
    required this.isLast,
  });

  @override
  Widget build(BuildContext context) {
    final Color nodeColor;
    final IconData icon;
    switch (step.state) {
      case 'done':
        nodeColor = AppColors.success;
        icon = Icons.check;
        break;
      case 'active':
        nodeColor = AppColors.primaryBlue;
        icon = Icons.schedule;
        break;
      case 'rejected':
        nodeColor = AppColors.danger;
        icon = Icons.close;
        break;
      default:
        nodeColor = AppColors.inputBorder;
        icon = Icons.circle_outlined;
    }

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: step.state == 'pending' ? AppColors.surface : nodeColor,
                  shape: BoxShape.circle,
                  border: Border.all(color: nodeColor, width: 2),
                ),
                child: Icon(
                  icon,
                  size: 14,
                  color: step.state == 'pending' ? AppColors.textHint : Colors.white,
                ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2,
                    margin: const EdgeInsets.symmetric(vertical: 2),
                    color: step.state == 'done'
                        ? AppColors.success
                        : AppColors.border,
                  ),
                ),
            ],
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 4 : 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          step.label,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      StatusBadge(status: step.status, compact: true),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${step.docNo}${step.timestamp.isNotEmpty ? ' • ${step.timestamp}' : ''}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.w600,
                      color: AppColors.primaryBlueDark,
                    ),
                  ),
                  if (step.responsibleUser.isNotEmpty)
                    Text(
                      'User: ${step.responsibleUser}',
                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                    ),
                  if (step.remarks.isNotEmpty)
                    Text(
                      step.remarks,
                      style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StageChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _StageChip({
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
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
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
