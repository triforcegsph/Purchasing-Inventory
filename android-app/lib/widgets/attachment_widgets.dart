import 'dart:typed_data';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../models/erp_models.dart';
import '../providers/erp_provider.dart';

class AttachmentUploaderWidget extends StatefulWidget {
  final List<FileAttachment> attachments;
  final bool requiredField;
  final String label;
  final ValueChanged<FileAttachment> onAdded;
  final ValueChanged<String> onRemoved;

  const AttachmentUploaderWidget({
    super.key,
    required this.attachments,
    required this.onAdded,
    required this.onRemoved,
    this.requiredField = true,
    this.label = 'Supporting Attachments (PDF, JPG, PNG, XLSX)',
  });

  @override
  State<AttachmentUploaderWidget> createState() => _AttachmentUploaderWidgetState();
}

class _AttachmentUploaderWidgetState extends State<AttachmentUploaderWidget> {
  bool _uploading = false;
  String? _error;

  Future<void> _pickAndUpload() async {
    setState(() {
      _error = null;
    });
    try {
      final files = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'xlsx'],
      );
      if (files.isEmpty) return;

      final file = files.first;
      final bytes = await file.readAsBytes();
      if (bytes.isEmpty) {
        setState(() => _error = 'Could not read selected file bytes.');
        return;
      }
      if (bytes.length > 10 * 1024 * 1024) {
        setState(() => _error = 'File exceeds 10 MB upload limit.');
        return;
      }

      setState(() => _uploading = true);
      if (!mounted) return;
      final erp = context.read<ErpProvider>();
      final uploaded = await erp.uploadAttachment(
        fileName: file.name,
        bytes: bytes,
      );
      if (!mounted) return;
      if (uploaded.error != null) {
        setState(() => _error = uploaded.error);
      } else if (uploaded.attachment != null) {
        widget.onAdded(uploaded.attachment!);
      }
    } catch (e) {
      setState(() => _error = 'Failed to select file: $e');
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.subtleSurface,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Icon(Icons.attach_file, size: 16, color: AppColors.textMuted),
              const SizedBox(width: 6),
              Expanded(
                child: Text.rich(
                  TextSpan(
                    text: widget.label,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                    children: widget.requiredField
                        ? const [
                            TextSpan(
                              text: ' *',
                              style: TextStyle(color: AppColors.danger),
                            ),
                          ]
                        : const [],
                  ),
                ),
              ),
              OutlinedButton.icon(
                onPressed: _uploading ? null : _pickAndUpload,
                icon: _uploading
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.upload_file, size: 15),
                label: Text(_uploading ? 'Uploading...' : 'Attach File'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  minimumSize: Size.zero,
                  textStyle: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 6),
            Text(
              _error!,
              style: const TextStyle(fontSize: 11.5, color: AppColors.dangerText),
            ),
          ],
          const SizedBox(height: 8),
          if (widget.attachments.isEmpty)
            Text(
              widget.requiredField
                  ? 'No attachment uploaded yet. At least 1 file is required to submit.'
                  : 'No attachment uploaded.',
              style: const TextStyle(fontSize: 11.5, color: AppColors.textHint),
            )
          else
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: widget.attachments.map((att) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    border: Border.all(color: AppColors.border),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        att.type == 'JPG' || att.type == 'PNG'
                            ? Icons.image_outlined
                            : Icons.description_outlined,
                        size: 15,
                        color: att.type == 'JPG' || att.type == 'PNG'
                            ? AppColors.success
                            : AppColors.primaryBlue,
                      ),
                      const SizedBox(width: 6),
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 180),
                        child: Text(
                          att.name,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '(${att.type}${att.size.isNotEmpty ? ', ${att.size}' : ''})',
                        style: const TextStyle(fontSize: 10.5, color: AppColors.textHint),
                      ),
                      const SizedBox(width: 4),
                      InkWell(
                        onTap: () => widget.onRemoved(att.id),
                        child: const Icon(Icons.close, size: 15, color: AppColors.dangerText),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
        ],
      ),
    );
  }
}

Future<void> showAttachmentViewerSheet(
  BuildContext context, {
  required String docNo,
  required List<FileAttachment> attachments,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(8)),
    ),
    builder: (ctx) => _AttachmentViewerSheet(docNo: docNo, attachments: attachments),
  );
}

class _AttachmentViewerSheet extends StatefulWidget {
  final String docNo;
  final List<FileAttachment> attachments;

  const _AttachmentViewerSheet({
    required this.docNo,
    required this.attachments,
  });

  @override
  State<_AttachmentViewerSheet> createState() => _AttachmentViewerSheetState();
}

class _AttachmentViewerSheetState extends State<_AttachmentViewerSheet> {
  int _selectedIdx = 0;
  Uint8List? _loadedBytes;
  bool _loading = false;
  String? _loadMessage;

  @override
  void initState() {
    super.initState();
    if (widget.attachments.isNotEmpty) {
      _loadSelected(widget.attachments.first);
    }
  }

  Future<void> _loadSelected(FileAttachment att) async {
    setState(() {
      _loadedBytes = null;
      _loadMessage = null;
    });
    if (att.downloadUrl == null || att.downloadUrl!.isEmpty) {
      setState(() {
        _loadMessage =
            'Seeded document metadata (${att.type}, ${att.size}). Upload a file via Attach File to preview live content.';
      });
      return;
    }
    setState(() => _loading = true);
    try {
      final api = context.read<ErpProvider>().apiClient;
      final bytes = await api.downloadBytes(att.downloadUrl!);
      if (!mounted) return;
      setState(() {
        _loadedBytes = Uint8List.fromList(bytes);
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadMessage = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final active =
        widget.attachments.isNotEmpty ? widget.attachments[_selectedIdx] : null;
    return SafeArea(
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.72,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              color: AppColors.masthead,
              child: Row(
                children: [
                  const Icon(Icons.attach_file, size: 18, color: AppColors.accentLightBlue),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'ATTACHMENTS — ${widget.docNo} (${widget.attachments.length})',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close, color: Colors.white, size: 20),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
            ),
            if (widget.attachments.isNotEmpty)
              Container(
                padding: const EdgeInsets.all(10),
                decoration: const BoxDecoration(
                  color: AppColors.headerSurface,
                  border: Border(bottom: BorderSide(color: AppColors.border)),
                ),
                child: Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: List.generate(widget.attachments.length, (i) {
                    final att = widget.attachments[i];
                    final selected = i == _selectedIdx;
                    return ChoiceChip(
                      label: Text('${att.name} (${att.type})'),
                      selected: selected,
                      selectedColor: AppColors.softBlueBg,
                      labelStyle: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: selected ? AppColors.deepBlueText : AppColors.textPrimary,
                      ),
                      onSelected: (_) {
                        setState(() => _selectedIdx = i);
                        _loadSelected(att);
                      },
                    );
                  }),
                ),
              ),
            Expanded(
              child: Container(
                color: AppColors.canvas,
                padding: const EdgeInsets.all(16),
                child: active == null
                    ? const Center(child: Text('No attachments available.'))
                    : _loading
                        ? const Center(child: CircularProgressIndicator())
                        : _loadedBytes != null &&
                                (active.type == 'JPG' || active.type == 'PNG')
                            ? InteractiveViewer(
                                child: Center(
                                  child: Image.memory(
                                    _loadedBytes!,
                                    fit: BoxFit.contain,
                                  ),
                                ),
                              )
                            : Center(
                                child: Container(
                                  padding: const EdgeInsets.all(20),
                                  decoration: BoxDecoration(
                                    color: AppColors.surface,
                                    border: Border.all(color: AppColors.border),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        active.type == 'PDF'
                                            ? Icons.picture_as_pdf
                                            : Icons.insert_drive_file_outlined,
                                        size: 42,
                                        color: active.type == 'PDF'
                                            ? AppColors.danger
                                            : AppColors.primaryBlue,
                                      ),
                                      const SizedBox(height: 10),
                                      Text(
                                        active.name,
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                          fontSize: 13.5,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Type: ${active.type} • Size: ${active.size} • Uploaded: ${active.uploadedAt}',
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                          fontSize: 11.5,
                                          color: AppColors.textMuted,
                                        ),
                                      ),
                                      const SizedBox(height: 10),
                                      Text(
                                        _loadMessage ??
                                            'File verified on backend server (${_loadedBytes?.length ?? 0} bytes downloaded).',
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                          fontSize: 11.5,
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
