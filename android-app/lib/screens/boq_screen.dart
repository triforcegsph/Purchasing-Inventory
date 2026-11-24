import 'dart:convert';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../models/erp_models.dart';
import '../providers/auth_provider.dart';
import '../providers/erp_provider.dart';
import '../widgets/enterprise_widgets.dart';
import '../widgets/status_badge.dart';

class BoqScreen extends StatefulWidget {
  final VoidCallback? onPostedToPqto;

  const BoqScreen({super.key, this.onPostedToPqto});

  @override
  State<BoqScreen> createState() => _BoqScreenState();
}

class _BoqScreenState extends State<BoqScreen> {
  final _searchController = TextEditingController();
  String _sortMode = 'boq-order';
  String _filterMode = 'all';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    await context.read<ErpProvider>().loadBoq(
          search: _searchController.text,
          sort: _sortMode,
          filter: _filterMode,
        );
  }

  Future<void> _handleImportCsv() async {
    try {
      final files = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['csv'],
      );
      if (files.isEmpty) return;
      final file = files.first;
      final bytes = await file.readAsBytes();
      if (bytes.isEmpty) return;

      final content = utf8.decode(bytes, allowMalformed: true);
      final lines = content
          .split(RegExp(r'\r?\n'))
          .where((l) => l.trim().isNotEmpty)
          .toList();
      if (lines.length < 2) {
        _showSnack('CSV file must include a header row and at least one item row.', isError: true);
        return;
      }

      final headers = _parseCsvLine(lines.first)
          .map((h) => h.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), ''))
          .toList();

      final rows = <Map<String, dynamic>>[];
      for (int i = 1; i < lines.length; i++) {
        final cols = _parseCsvLine(lines[i]);
        final map = <String, String>{};
        for (int c = 0; c < headers.length && c < cols.length; c++) {
          map[headers[c]] = cols[c].trim();
        }
        final code = map['itemcode'] ?? map['code'] ?? '';
        final desc = map['description'] ?? map['itemdescription'] ?? '';
        if (code.isEmpty && desc.isEmpty) continue;
        rows.add({
          'itemCode': code,
          'description': desc,
          'boqUom': map['boquom'] ?? map['uom'] ?? 'PC/s',
          'boqQty': double.tryParse(map['boqqty'] ?? map['qty'] ?? '1') ?? 1,
          'pqtoUom': map['pqtouom'] ?? map['uom'] ?? 'PC/s',
          'pqtoQty': double.tryParse(map['pqtoqty'] ?? map['boqqty'] ?? '1') ?? 1,
          'assignedLocation': map['assignedlocation'] ?? map['location'] ?? 'Site-Wide',
          'costCenter': map['costcenter'] ?? '',
          'remarks': map['remarks'] ?? '',
        });
      }

      if (!mounted) return;
      final err = await context.read<ErpProvider>().importBoqItems(rows, file.name);
      if (err != null) {
        _showSnack(err, isError: true);
      } else {
        _showSnack('Imported ${rows.length} item(s) from ${file.name}.');
      }
    } catch (e) {
      _showSnack('Failed to parse CSV file: $e', isError: true);
    }
  }

  List<String> _parseCsvLine(String line) {
    final result = <String>[];
    final buffer = StringBuffer();
    bool inQuotes = false;
    for (int i = 0; i < line.length; i++) {
      final ch = line[i];
      if (ch == '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] == '"') {
          buffer.write('"');
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch == ',' && !inQuotes) {
        result.add(buffer.toString());
        buffer.clear();
      } else {
        buffer.write(ch);
      }
    }
    result.add(buffer.toString());
    return result;
  }

  Future<void> _showAddItemDialog() async {
    final codeCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final boqQtyCtrl = TextEditingController(text: '10');
    final pqtoQtyCtrl = TextEditingController(text: '10');
    final locCtrl = TextEditingController(text: 'Zone A - Pump Room');
    final ccCtrl = TextEditingController(text: 'CC-MEPF-01');
    final remarksCtrl = TextEditingController();
    String boqUom = 'm';
    String pqtoUom = 'PC/s';
    bool isNonTxn = false;

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => AlertDialog(
          title: const Text(
            'Add BOQ Item',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: codeCtrl,
                  decoration: const InputDecoration(labelText: 'Item Code *'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: descCtrl,
                  decoration: const InputDecoration(labelText: 'Item Description *'),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: boqUom,
                        decoration: const InputDecoration(labelText: 'BOQ UOM'),
                        items: const ['lot', 'm', 'PC/s']
                            .map((u) => DropdownMenuItem(value: u, child: Text(u)))
                            .toList(),
                        onChanged: (v) => setModalState(() => boqUom = v ?? 'm'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: boqQtyCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'BOQ Qty'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: pqtoUom,
                        decoration: const InputDecoration(labelText: 'PQTO UOM'),
                        items: const ['PC/s', 'lot', 'm']
                            .map((u) => DropdownMenuItem(value: u, child: Text(u)))
                            .toList(),
                        onChanged: (v) => setModalState(() => pqtoUom = v ?? 'PC/s'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: pqtoQtyCtrl,
                        enabled: !isNonTxn,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'PQTO Qty'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: locCtrl,
                  decoration: const InputDecoration(labelText: 'Assigned Location'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: ccCtrl,
                  decoration: const InputDecoration(labelText: 'Cost Center'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: remarksCtrl,
                  decoration: const InputDecoration(labelText: 'Remarks'),
                ),
                const SizedBox(height: 6),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: isNonTxn,
                  title: const Text(
                    'Non-Transactional (Works-Related / NO TXN)',
                    style: TextStyle(fontSize: 12),
                  ),
                  onChanged: (v) => setModalState(() => isNonTxn = v ?? false),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                final err = await context.read<ErpProvider>().addBoqItem(
                      itemCode: codeCtrl.text.trim(),
                      description: descCtrl.text.trim(),
                      boqUom: boqUom,
                      boqQty: double.tryParse(boqQtyCtrl.text) ?? 1,
                      pqtoUom: pqtoUom,
                      pqtoQty: isNonTxn ? 0 : (double.tryParse(pqtoQtyCtrl.text) ?? 1),
                      assignedLocation: locCtrl.text.trim(),
                      costCenter: ccCtrl.text.trim(),
                      remarks: remarksCtrl.text.trim(),
                      isWorksRelated: isNonTxn,
                    );
                if (ctx.mounted) Navigator.pop(ctx);
                if (err != null) {
                  _showSnack(err, isError: true);
                } else {
                  _showSnack('BOQ item added.');
                }
              },
              child: const Text('Add Item'),
            ),
          ],
        ),
      ),
    );
  }

  void _showItemDetails(BoqItem item) {
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
              Row(
                children: [
                  Expanded(
                    child: Text(
                      item.isBlankRow ? '[Blank Spacer Row]' : item.itemCode,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                        color: AppColors.primaryBlueDark,
                      ),
                    ),
                  ),
                  StatusBadge(
                    status: item.isWorksRelated
                        ? 'NO TXN'
                        : item.isLegacyFittingsRow
                            ? 'LEGACY FITTINGS'
                            : item.isItemizedFitting
                                ? 'ITEMIZED FITTING'
                                : 'TRANSACTIONAL',
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                item.description.isEmpty ? 'Blank separator row' : item.description,
                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              const Divider(),
              const SizedBox(height: 8),
              InfoRow(label: 'Line #', value: '${item.lineNo}'),
              InfoRow(
                label: 'BOQ Quantity',
                value: '${formatQty(item.boqQty)} ${item.boqUom}',
              ),
              InfoRow(
                label: 'PQTO Quantity',
                value: item.isWorksRelated
                    ? 'Excluded (NO TXN)'
                    : '${formatQty(item.pqtoQty)} ${item.pqtoUom}',
              ),
              InfoRow(label: 'Assigned Location', value: item.assignedLocation),
              InfoRow(label: 'Cost Center', value: item.costCenter ?? '—', mono: true),
              InfoRow(label: 'Remarks', value: item.remarks ?? '—'),
            ],
          ),
        ),
      ),
    );
  }

  void _showSnack(String msg, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? AppColors.danger : AppColors.success,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final erp = context.watch<ErpProvider>();
    final perms = context.watch<AuthProvider>().permissions;
    final hasLegacy = erp.boqItems.any((i) => i.isLegacyFittingsRow);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Text('BOQ — Bill of Quantities'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(child: StatusBadge(status: erp.boqStatus, compact: true)),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _reload,
        child: Column(
          children: [
            // Search, Filter & Authorized Actions Header
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
                    controller: _searchController,
                    onChanged: (_) => _reload(),
                    decoration: InputDecoration(
                      hintText: 'Search item code, description, location...',
                      prefixIcon: const Icon(Icons.search, size: 18),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              onPressed: () {
                                _searchController.clear();
                                _reload();
                              },
                              icon: const Icon(Icons.clear, size: 16),
                            )
                          : null,
                    ),
                  ),
                  const SizedBox(height: 8),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _FilterPill(
                          label: 'All',
                          selected: _filterMode == 'all',
                          onTap: () {
                            setState(() => _filterMode = 'all');
                            _reload();
                          },
                        ),
                        const SizedBox(width: 6),
                        _FilterPill(
                          label: 'Transactional',
                          selected: _filterMode == 'transactional',
                          onTap: () {
                            setState(() => _filterMode = 'transactional');
                            _reload();
                          },
                        ),
                        const SizedBox(width: 6),
                        _FilterPill(
                          label: 'Non-Txn (NO TXN)',
                          selected: _filterMode == 'non-transactional',
                          onTap: () {
                            setState(() => _filterMode = 'non-transactional');
                            _reload();
                          },
                        ),
                        const SizedBox(width: 10),
                        _FilterPill(
                          label: _sortMode == 'boq-order' ? 'Sort: BOQ Order' : 'Sort: Item Code',
                          selected: true,
                          onTap: () {
                            setState(() {
                              _sortMode =
                                  _sortMode == 'boq-order' ? 'item-code' : 'boq-order';
                            });
                            _reload();
                          },
                        ),
                      ],
                    ),
                  ),
                  if (perms.canEditBoq) ...[
                    const SizedBox(height: 10),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          ElevatedButton.icon(
                            onPressed: erp.isSubmitting ? null : _showAddItemDialog,
                            icon: const Icon(Icons.add, size: 16),
                            label: const Text('Add Item'),
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            ),
                          ),
                          const SizedBox(width: 8),
                          OutlinedButton.icon(
                            onPressed: erp.isSubmitting ? null : _handleImportCsv,
                            icon: const Icon(Icons.upload_file, size: 16, color: AppColors.success),
                            label: const Text('Import CSV'),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            ),
                          ),
                          if (hasLegacy) ...[
                            const SizedBox(width: 8),
                            OutlinedButton.icon(
                              onPressed: erp.isSubmitting
                                  ? null
                                  : () async {
                                      final err = await erp.replaceLegacyFittings();
                                      if (err != null) {
                                        _showSnack(err, isError: true);
                                      } else {
                                        _showSnack('Expanded "Fittings of the above" into 5 itemized fittings.');
                                      }
                                    },
                              icon: const Icon(Icons.layers, size: 16, color: AppColors.warning),
                              label: const Text('Itemize Fittings'),
                              style: OutlinedButton.styleFrom(
                                backgroundColor: AppColors.warningBg,
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              ),
                            ),
                          ],
                          const SizedBox(width: 8),
                          ElevatedButton.icon(
                            onPressed: erp.isSubmitting
                                ? null
                                : () async {
                                    final err = await erp.postBoqToPqto();
                                    if (err != null) {
                                      _showSnack(err, isError: true);
                                    } else {
                                      _showSnack('BOQ posted to PQTO successfully.');
                                      widget.onPostedToPqto?.call();
                                    }
                                  },
                            icon: const Icon(Icons.arrow_forward, size: 16),
                            label: const Text('Post to PQTO'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.success,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ] else
                    const Padding(
                      padding: EdgeInsets.only(top: 8),
                      child: Row(
                        children: [
                          Icon(Icons.lock_outline, size: 13, color: AppColors.textMuted),
                          SizedBox(width: 5),
                          Text(
                            'Read-only view for Applicant/Requestor role.',
                            style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),

            // BOQ Item List
            Expanded(
              child: erp.boqItems.isEmpty
                  ? const EmptyStateView(
                      icon: Icons.table_chart_outlined,
                      title: 'No BOQ items found',
                      subtitle: 'Try clearing your search or filter.',
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(12),
                      itemCount: erp.boqItems.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final item = erp.boqItems[index];
                        if (item.isBlankRow) {
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: AppColors.draftBg,
                              border: Border.all(color: AppColors.border),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              '#${item.lineNo}  [Blank Line Row]',
                              style: const TextStyle(
                                fontSize: 11.5,
                                fontStyle: FontStyle.italic,
                                color: AppColors.textMuted,
                              ),
                            ),
                          );
                        }

                        final bgColor = item.isWorksRelated
                            ? AppColors.headerSurface
                            : item.isLegacyFittingsRow
                                ? AppColors.warningBg
                                : AppColors.surface;

                        return InkWell(
                          onTap: () => _showItemDetails(item),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: bgColor,
                              border: Border.all(color: AppColors.border),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: AppColors.masthead,
                                        borderRadius: BorderRadius.circular(2),
                                      ),
                                      child: Text(
                                        '#${item.lineNo}',
                                        style: const TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        item.itemCode,
                                        style: const TextStyle(
                                          fontFamily: 'monospace',
                                          fontWeight: FontWeight.w700,
                                          fontSize: 13,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                    ),
                                    if (item.isWorksRelated)
                                      const StatusBadge(status: 'NO TXN', compact: true)
                                    else if (item.isLegacyFittingsRow)
                                      const StatusBadge(status: 'LEGACY', compact: true)
                                    else if (item.isItemizedFitting)
                                      const StatusBadge(status: 'FITTING', compact: true),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  item.description,
                                  style: const TextStyle(
                                    fontSize: 12.5,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    _QtyChip(
                                      label: 'BOQ',
                                      value: '${formatQty(item.boqQty)} ${item.boqUom}',
                                      highlight: false,
                                    ),
                                    const SizedBox(width: 8),
                                    _QtyChip(
                                      label: 'PQTO',
                                      value: item.isWorksRelated
                                          ? '0 (Excluded)'
                                          : '${formatQty(item.pqtoQty)} ${item.pqtoUom}',
                                      highlight: !item.isWorksRelated,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    const Icon(Icons.place_outlined, size: 13, color: AppColors.textMuted),
                                    const SizedBox(width: 4),
                                    Expanded(
                                      child: Text(
                                        item.assignedLocation,
                                        style: const TextStyle(
                                          fontSize: 11.5,
                                          color: AppColors.textMuted,
                                        ),
                                      ),
                                    ),
                                    if (item.costCenter != null && item.costCenter!.isNotEmpty)
                                      Text(
                                        item.costCenter!,
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontFamily: 'monospace',
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.textSecondary,
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

class _FilterPill extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterPill({
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

class _QtyChip extends StatelessWidget {
  final String label;
  final String value;
  final bool highlight;

  const _QtyChip({
    required this.label,
    required this.value,
    required this.highlight,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: highlight ? AppColors.paleBlueBg : AppColors.headerSurface,
        border: Border.all(
          color: highlight ? const Color(0xFFB3D1FF) : AppColors.divider,
        ),
        borderRadius: BorderRadius.circular(3),
      ),
      child: Text(
        '$label: $value',
        style: TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
          color: highlight ? AppColors.deepBlueText : AppColors.textSecondary,
        ),
      ),
    );
  }
}
