import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';
import '../providers/erp_provider.dart';
import '../widgets/enterprise_widgets.dart';
import '../widgets/status_badge.dart';
import 'pr_form_screen.dart';

class PqtoScreen extends StatefulWidget {
  const PqtoScreen({super.key});

  @override
  State<PqtoScreen> createState() => _PqtoScreenState();
}

class _PqtoScreenState extends State<PqtoScreen> {
  String? _selectedPqtoId;
  String _search = '';
  String _availabilityFilter = 'ALL'; // ALL | AVAILABLE | FULL

  @override
  Widget build(BuildContext context) {
    final erp = context.watch<ErpProvider>();
    final perms = context.watch<AuthProvider>().permissions;
    final pqtos = erp.pqtos;
    final activePqto = pqtos.isEmpty
        ? null
        : pqtos.firstWhere(
            (p) => p.id == _selectedPqtoId,
            orElse: () => pqtos.first,
          );

    final filteredItems = (activePqto?.items ?? []).where((it) {
      final q = _search.trim().toLowerCase();
      final matchesSearch = q.isEmpty ||
          it.itemCode.toLowerCase().includes(q) ||
          it.description.toLowerCase().includes(q) ||
          it.assignedLocation.toLowerCase().includes(q) ||
          it.costCenter.toLowerCase().includes(q);
      final matchesFilter = _availabilityFilter == 'ALL' ||
          (_availabilityFilter == 'AVAILABLE' && !it.isFullyOrdered) ||
          (_availabilityFilter == 'FULL' && it.isFullyOrdered);
      return matchesSearch && matchesFilter;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Text('PQTO — Project Qty Take-Off'),
        actions: [
          if (activePqto != null)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Center(child: StatusBadge(status: activePqto.status, compact: true)),
            ),
        ],
      ),
      floatingActionButton: (activePqto != null && perms.canCreatePr)
          ? FloatingActionButton.extended(
              backgroundColor: AppColors.primaryBlue,
              foregroundColor: Colors.white,
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => PrFormScreen(initialPqtoNo: activePqto.pqtoNo),
                  ),
                );
              },
              icon: const Icon(Icons.note_add_outlined),
              label: const Text('Create PR'),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: erp.loadPqtos,
        child: activePqto == null
            ? const EmptyStateView(
                icon: Icons.calculate_outlined,
                title: 'No PQTO records available',
                subtitle: 'Post a BOQ to PQTO to generate project purchasing limits.',
              )
            : Column(
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
                        DropdownButtonFormField<String>(
                          initialValue: activePqto.id,
                          decoration: const InputDecoration(
                            labelText: 'Active PQTO Document',
                          ),
                          items: pqtos
                              .map(
                                (p) => DropdownMenuItem(
                                  value: p.id,
                                  child: Text(
                                    '${p.pqtoNo} — ${p.jobNo} (${p.items.length} items)',
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 12.5),
                                  ),
                                ),
                              )
                              .toList(),
                          onChanged: (v) => setState(() => _selectedPqtoId = v),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          onChanged: (v) => setState(() => _search = v),
                          decoration: const InputDecoration(
                            hintText: 'Search item code, description, location...',
                            prefixIcon: Icon(Icons.search, size: 18),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            _PqtoTab(
                              label: 'All (${activePqto.items.length})',
                              selected: _availabilityFilter == 'ALL',
                              onTap: () => setState(() => _availabilityFilter = 'ALL'),
                            ),
                            const SizedBox(width: 6),
                            _PqtoTab(
                              label:
                                  'Available (${activePqto.items.where((i) => !i.isFullyOrdered).length})',
                              selected: _availabilityFilter == 'AVAILABLE',
                              onTap: () => setState(() => _availabilityFilter = 'AVAILABLE'),
                            ),
                            const SizedBox(width: 6),
                            _PqtoTab(
                              label:
                                  'Fully Ordered (${activePqto.items.where((i) => i.isFullyOrdered).length})',
                              selected: _availabilityFilter == 'FULL',
                              onTap: () => setState(() => _availabilityFilter = 'FULL'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: filteredItems.isEmpty
                        ? const EmptyStateView(
                            icon: Icons.filter_list_off,
                            title: 'No matching PQTO items',
                            subtitle: 'Adjust your search or filter selection.',
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.fromLTRB(12, 12, 12, 84),
                            itemCount: filteredItems.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final item = filteredItems[index];
                              final progress = item.pqtoQty <= 0
                                  ? 1.0
                                  : (item.prOrderedQty / item.pqtoQty).clamp(0.0, 1.0);
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
                                            item.itemCode,
                                            style: const TextStyle(
                                              fontFamily: 'monospace',
                                              fontWeight: FontWeight.w800,
                                              fontSize: 13,
                                              color: AppColors.primaryBlueDark,
                                            ),
                                          ),
                                        ),
                                        StatusBadge(
                                          status: item.isFullyOrdered
                                              ? 'FULLY ORDERED'
                                              : 'AVAILABLE',
                                          compact: true,
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      item.description,
                                      style: const TextStyle(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    // Conversion & Budget Metrics
                                    Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: AppColors.subtleSurface,
                                        border: Border.all(color: AppColors.divider),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          _MetricCol(
                                            label: 'BOQ Qty',
                                            value: '${formatQty(item.boqQty)} ${item.boqUom}',
                                          ),
                                          _MetricCol(
                                            label: 'PQTO Limit',
                                            value: '${formatQty(item.pqtoQty)} ${item.pqtoUom}',
                                            color: AppColors.deepBlueText,
                                          ),
                                          _MetricCol(
                                            label: 'Ordered',
                                            value: formatQty(item.prOrderedQty),
                                          ),
                                          _MetricCol(
                                            label: 'Remaining',
                                            value: '${formatQty(item.remainingQty)} ${item.pqtoUom}',
                                            color: item.isFullyOrdered
                                                ? AppColors.textHint
                                                : AppColors.success,
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(2),
                                      child: LinearProgressIndicator(
                                        value: progress,
                                        minHeight: 6,
                                        backgroundColor: AppColors.draftBg,
                                        valueColor: AlwaysStoppedAnimation<Color>(
                                          item.isFullyOrdered
                                              ? AppColors.textMuted
                                              : AppColors.primaryBlue,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        const Icon(
                                          Icons.place_outlined,
                                          size: 13,
                                          color: AppColors.textMuted,
                                        ),
                                        const SizedBox(width: 4),
                                        Expanded(
                                          child: Text(
                                            '${item.assignedLocation} • ${item.costCenter}',
                                            style: const TextStyle(
                                              fontSize: 11.5,
                                              color: AppColors.textMuted,
                                            ),
                                          ),
                                        ),
                                        if (!item.isFullyOrdered && perms.canCreatePr)
                                          TextButton.icon(
                                            onPressed: () {
                                              Navigator.push(
                                                context,
                                                MaterialPageRoute(
                                                  builder: (_) => PrFormScreen(
                                                    initialPqtoNo: activePqto.pqtoNo,
                                                    preselectedItem: item,
                                                  ),
                                                ),
                                              );
                                            },
                                            icon: const Icon(Icons.add_circle_outline, size: 15),
                                            label: const Text('Request PR'),
                                            style: TextButton.styleFrom(
                                              padding: const EdgeInsets.symmetric(horizontal: 8),
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
      ),
    );
  }
}

extension _StringIncludes on String {
  bool includes(String query) => contains(query);
}

class _PqtoTab extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _PqtoTab({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(3),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? AppColors.primaryBlue : AppColors.surface,
            border: Border.all(
              color: selected ? AppColors.primaryBlue : AppColors.inputBorder,
            ),
            borderRadius: BorderRadius.circular(3),
          ),
          child: Text(
            label,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: selected ? Colors.white : AppColors.textPrimary,
            ),
          ),
        ),
      ),
    );
  }
}

class _MetricCol extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;

  const _MetricCol({
    required this.label,
    required this.value,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w700,
            color: color ?? AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
}
