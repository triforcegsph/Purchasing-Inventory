import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../models/erp_models.dart';
import '../providers/erp_provider.dart';
import '../widgets/attachment_widgets.dart';
import '../widgets/enterprise_widgets.dart';

class PrFormScreen extends StatefulWidget {
  final PrRecord? existingPr;
  final String? initialPqtoNo;
  final PqtoItem? preselectedItem;

  const PrFormScreen({
    super.key,
    this.existingPr,
    this.initialPqtoNo,
    this.preselectedItem,
  });

  @override
  State<PrFormScreen> createState() => _PrFormScreenState();
}

class _PrFormScreenState extends State<PrFormScreen> {
  late String _selectedPqtoNo;
  late TextEditingController _refDocCtrl;
  late TextEditingController _jobNoCtrl;
  late TextEditingController _spNameCtrl;
  final List<PrLineItem> _items = [];
  final List<FileAttachment> _attachments = [];
  String? _error;

  bool get _isEditing => widget.existingPr != null;

  @override
  void initState() {
    super.initState();
    final erp = context.read<ErpProvider>();
    final existing = widget.existingPr;
    final defaultPqto = existing?.pqtoNo ??
        widget.initialPqtoNo ??
        (erp.pqtos.isNotEmpty ? erp.pqtos.first.pqtoNo : 'PQTO-2026-001');

    _selectedPqtoNo = defaultPqto;
    _refDocCtrl = TextEditingController(
      text: existing?.refDocNo ?? 'REF-PR-${884}-${10 + Random().nextInt(89)}',
    );
    _jobNoCtrl = TextEditingController(
      text: existing?.jobNo ?? erp.activeProject.jobNo,
    );
    _spNameCtrl = TextEditingController(
      text: existing?.spName ?? 'SP-MECH-ALPHA',
    );

    if (existing != null) {
      _items.addAll(existing.items);
      _attachments.addAll(existing.attachments);
    } else if (widget.preselectedItem != null) {
      final p = widget.preselectedItem!;
      _items.add(
        PrLineItem(
          id: 'line-${DateTime.now().millisecondsSinceEpoch}',
          itemCode: p.itemCode,
          description: p.description,
          uom: p.pqtoUom,
          pqtoQty: p.remainingQty,
          currentPqtoRemaining: p.remainingQty,
          requestedQty: p.remainingQty >= 1 ? min(2, p.remainingQty) : 1,
          assignedLocation: p.assignedLocation,
          isNewItem: false,
        ),
      );
    }
  }

  @override
  void dispose() {
    _refDocCtrl.dispose();
    _jobNoCtrl.dispose();
    _spNameCtrl.dispose();
    super.dispose();
  }

  PqtoRecord? _activePqto(ErpProvider erp) {
    if (erp.pqtos.isEmpty) return null;
    return erp.pqtos.firstWhere(
      (p) => p.pqtoNo == _selectedPqtoNo,
      orElse: () => erp.pqtos.first,
    );
  }

  void _addFromPqto(PqtoItem item) {
    setState(() {
      _items.add(
        PrLineItem(
          id: 'line-${DateTime.now().microsecondsSinceEpoch}',
          itemCode: item.itemCode,
          description: item.description,
          uom: item.pqtoUom,
          pqtoQty: item.remainingQty,
          currentPqtoRemaining: item.remainingQty,
          requestedQty: item.remainingQty > 0 ? min(2, item.remainingQty) : 1,
          assignedLocation: item.assignedLocation,
          isNewItem: false,
        ),
      );
    });
  }

  Future<void> _showAddNonBoqItemDialog() async {
    final sysCode = 'SYS-NEW-${100 + Random().nextInt(899)}';
    final codeCtrl = TextEditingController(text: sysCode);
    final descCtrl = TextEditingController();
    final qtyCtrl = TextEditingController(text: '1');
    final uomCtrl = TextEditingController(text: 'PC/s');
    final locCtrl = TextEditingController(text: 'Zone A - Pump Room');

    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text(
          'Add Non-BOQ Material Item',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Items not in the original BOQ/PQTO will be flagged for REQ Approver review.',
                style: TextStyle(fontSize: 11.5, color: AppColors.textMuted),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: codeCtrl,
                decoration: const InputDecoration(labelText: 'System / Item Code *'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: descCtrl,
                decoration: const InputDecoration(labelText: 'Material Description *'),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: qtyCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Requested Qty *'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: uomCtrl,
                      decoration: const InputDecoration(labelText: 'UOM *'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextField(
                controller: locCtrl,
                decoration: const InputDecoration(labelText: 'Assigned Location *'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              final qty = double.tryParse(qtyCtrl.text) ?? 0;
              if (codeCtrl.text.trim().isEmpty ||
                  descCtrl.text.trim().isEmpty ||
                  qty <= 0) {
                return;
              }
              setState(() {
                _items.add(
                  PrLineItem(
                    id: 'new-${DateTime.now().microsecondsSinceEpoch}',
                    itemCode: codeCtrl.text.trim(),
                    description: descCtrl.text.trim(),
                    uom: uomCtrl.text.trim().isEmpty ? 'PC/s' : uomCtrl.text.trim(),
                    pqtoQty: 0,
                    currentPqtoRemaining: 0,
                    requestedQty: qty,
                    assignedLocation: locCtrl.text.trim().isEmpty
                        ? 'Site-Wide'
                        : locCtrl.text.trim(),
                    isNewItem: true,
                    systemAssignedCode: codeCtrl.text.trim(),
                  ),
                );
              });
              Navigator.pop(ctx);
            },
            child: const Text('Add Item'),
          ),
        ],
      ),
    );
  }

  Future<void> _showPqtoPickerSheet(PqtoRecord pqto) async {
    String query = '';
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(8)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          final filtered = pqto.items.where((it) {
            final q = query.trim().toLowerCase();
            return q.isEmpty ||
                it.itemCode.toLowerCase().contains(q) ||
                it.description.toLowerCase().contains(q);
          }).toList();
          return SafeArea(
            child: SizedBox(
              height: MediaQuery.of(context).size.height * 0.7,
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    color: AppColors.masthead,
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            'SELECT FROM PQTO (${pqto.pqtoNo})',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(ctx),
                          icon: const Icon(Icons.close, color: Colors.white, size: 20),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(10),
                    child: TextField(
                      onChanged: (v) => setSheetState(() => query = v),
                      decoration: const InputDecoration(
                        hintText: 'Search PQTO item code or description...',
                        prefixIcon: Icon(Icons.search, size: 18),
                      ),
                    ),
                  ),
                  Expanded(
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      itemCount: filtered.length,
                      separatorBuilder: (_, _) => const Divider(),
                      itemBuilder: (_, idx) {
                        final it = filtered[idx];
                        return ListTile(
                          dense: true,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          title: Text(
                            it.itemCode,
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                          subtitle: Text(
                            '${it.description}\n${it.assignedLocation}',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 11.5),
                          ),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                'Rem: ${formatQty(it.remainingQty)} ${it.pqtoUom}',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                  color: it.isFullyOrdered
                                      ? AppColors.dangerText
                                      : AppColors.success,
                                ),
                              ),
                              Text(
                                it.isFullyOrdered ? 'Exhausted' : 'Tap to add',
                                style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                              ),
                            ],
                          ),
                          onTap: () {
                            _addFromPqto(it);
                            Navigator.pop(ctx);
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _submit({required bool asDraft}) async {
    setState(() => _error = null);
    final erp = context.read<ErpProvider>();
    final cfg = erp.config;

    if (!asDraft) {
      if (_jobNoCtrl.text.trim().isEmpty) {
        setState(() => _error = 'Job / Project Number is required.');
        return;
      }
      if (cfg.refDocNo && _refDocCtrl.text.trim().isEmpty) {
        setState(() => _error = 'Reference Document Number is required.');
        return;
      }
      if (_items.isEmpty) {
        setState(() => _error = 'Please add at least one line item.');
        return;
      }
      for (final item in _items) {
        if (item.requestedQty <= 0) {
          setState(() => _error = 'Requested qty for ${item.itemCode} must be > 0.');
          return;
        }
        if (cfg.blockExceedPqto &&
            !item.isNewItem &&
            item.requestedQty > item.currentPqtoRemaining) {
          setState(
            () => _error =
                'Blocked: Requested qty (${formatQty(item.requestedQty)}) for ${item.itemCode} exceeds PQTO remaining (${formatQty(item.currentPqtoRemaining)}).',
          );
          return;
        }
      }
      if (cfg.attachments && _attachments.isEmpty) {
        setState(
          () => _error = 'At least 1 supporting attachment (PDF, JPG, PNG, XLSX) is required.',
        );
        return;
      }
    }

    final result = await erp.savePr(
      existingPrId: widget.existingPr?.id,
      pqtoNo: _selectedPqtoNo,
      refDocNo: _refDocCtrl.text.trim(),
      jobNo: _jobNoCtrl.text.trim(),
      spName: _spNameCtrl.text.trim(),
      items: _items,
      attachments: _attachments,
      asDraft: asDraft,
    );

    if (!mounted) return;
    if (result.error != null) {
      setState(() => _error = result.error);
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          asDraft
              ? '${result.pr?.prNo} saved as Draft.'
              : '${result.pr?.prNo} submitted for REQ Approval.',
        ),
        backgroundColor: AppColors.success,
      ),
    );
    Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    final erp = context.watch<ErpProvider>();
    final activePqto = _activePqto(erp);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: Text(
          _isEditing
              ? 'Edit ${widget.existingPr!.prNo}'
              : 'New Purchase Requisition',
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(12),
              children: [
                if (_error != null) ...[
                  EnterpriseBanner(message: _error!),
                  const SizedBox(height: 10),
                ],
                if (widget.existingPr?.rejectionComments != null &&
                    widget.existingPr!.rejectionComments!.isNotEmpty) ...[
                  EnterpriseBanner(
                    message:
                        'Returned by Approver: ${widget.existingPr!.rejectionComments}',
                  ),
                  const SizedBox(height: 10),
                ],

                // Header Fields
                EnterpriseCard(
                  title: 'Requisition Header',
                  child: Column(
                    children: [
                      DropdownButtonFormField<String>(
                        initialValue: erp.pqtos.any((p) => p.pqtoNo == _selectedPqtoNo)
                            ? _selectedPqtoNo
                            : (erp.pqtos.isNotEmpty ? erp.pqtos.first.pqtoNo : null),
                        decoration: const InputDecoration(labelText: 'Linked PQTO *'),
                        items: erp.pqtos
                            .map(
                              (p) => DropdownMenuItem(
                                value: p.pqtoNo,
                                child: Text('${p.pqtoNo} (${p.jobNo})'),
                              ),
                            )
                            .toList(),
                        onChanged: (v) {
                          if (v != null) setState(() => _selectedPqtoNo = v);
                        },
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _refDocCtrl,
                        decoration: InputDecoration(
                          labelText:
                              'Reference Document No.${erp.config.refDocNo ? ' *' : ''}',
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _jobNoCtrl,
                        decoration: const InputDecoration(labelText: 'Job / Project No. *'),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _spNameCtrl,
                        decoration: const InputDecoration(labelText: 'SP Name (Addtl Header)'),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 12),

                // Requested Line Items
                EnterpriseCard(
                  title: 'Requested Materials (${_items.length})',
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (activePqto != null)
                        TextButton.icon(
                          onPressed: () => _showPqtoPickerSheet(activePqto),
                          icon: const Icon(Icons.playlist_add, size: 16),
                          label: const Text('From PQTO', style: TextStyle(fontSize: 11.5)),
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 6),
                            minimumSize: Size.zero,
                          ),
                        ),
                      TextButton.icon(
                        onPressed: _showAddNonBoqItemDialog,
                        icon: const Icon(Icons.add_box_outlined, size: 15),
                        label: const Text('Non-BOQ', style: TextStyle(fontSize: 11.5)),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          minimumSize: Size.zero,
                        ),
                      ),
                    ],
                  ),
                  child: _items.isEmpty
                      ? const Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: Text(
                            'No materials added yet. Tap "From PQTO" or "Non-BOQ" above.',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                          ),
                        )
                      : Column(
                          children: List.generate(_items.length, (idx) {
                            final item = _items[idx];
                            final exceeds = !item.isNewItem &&
                                item.requestedQty > item.currentPqtoRemaining;
                            return Container(
                              margin: EdgeInsets.only(bottom: idx == _items.length - 1 ? 0 : 10),
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: exceeds
                                    ? AppColors.dangerBg
                                    : AppColors.subtleSurface,
                                border: Border.all(
                                  color: exceeds ? AppColors.dangerBorder : AppColors.border,
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
                                          item.itemCode,
                                          style: const TextStyle(
                                            fontFamily: 'monospace',
                                            fontWeight: FontWeight.w700,
                                            fontSize: 12.5,
                                          ),
                                        ),
                                      ),
                                      if (item.isNewItem)
                                        const Text(
                                          'NON-BOQ (Approval Req)',
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w700,
                                            color: AppColors.primaryBlueDark,
                                          ),
                                        )
                                      else
                                        Text(
                                          'PQTO Rem: ${formatQty(item.currentPqtoRemaining)} ${item.uom}',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                            color: exceeds
                                                ? AppColors.dangerText
                                                : AppColors.success,
                                          ),
                                        ),
                                      const SizedBox(width: 6),
                                      InkWell(
                                        onTap: () => setState(() => _items.removeAt(idx)),
                                        child: const Icon(
                                          Icons.delete_outline,
                                          size: 18,
                                          color: AppColors.dangerText,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    item.description,
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Expanded(
                                        flex: 2,
                                        child: TextFormField(
                                          initialValue: item.assignedLocation,
                                          decoration: const InputDecoration(
                                            labelText: 'Assigned Location',
                                          ),
                                          onChanged: (v) {
                                            _items[idx] = item.copyWith(assignedLocation: v);
                                          },
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: TextFormField(
                                          initialValue: formatQty(item.requestedQty),
                                          keyboardType: const TextInputType.numberWithOptions(
                                            decimal: true,
                                          ),
                                          decoration: InputDecoration(
                                            labelText: 'Qty (${item.uom})',
                                          ),
                                          onChanged: (v) {
                                            setState(() {
                                              _items[idx] = item.copyWith(
                                                requestedQty: double.tryParse(v) ?? 0,
                                              );
                                            });
                                          },
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (exceeds) ...[
                                    const SizedBox(height: 6),
                                    const Text(
                                      'Exceeds PQTO remaining balance — over-ordering is blocked.',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.dangerText,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            );
                          }),
                        ),
                ),

                const SizedBox(height: 12),

                // Attachments
                AttachmentUploaderWidget(
                  attachments: _attachments,
                  requiredField: erp.config.attachments,
                  onAdded: (att) => setState(() => _attachments.add(att)),
                  onRemoved: (id) =>
                      setState(() => _attachments.removeWhere((a) => a.id == id)),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),

          // Sticky Action Bar
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
                    child: OutlinedButton(
                      onPressed: erp.isSubmitting ? null : () => _submit(asDraft: true),
                      child: const Text('Save Draft'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton.icon(
                      onPressed: erp.isSubmitting ? null : () => _submit(asDraft: false),
                      icon: erp.isSubmitting
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.send, size: 16),
                      label: Text(_isEditing ? 'Resubmit PR' : 'Submit PR'),
                    ),
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
