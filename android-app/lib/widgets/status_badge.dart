import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  final bool compact;

  const StatusBadge({
    super.key,
    required this.status,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final palette = _paletteFor(status);
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 6 : 8,
        vertical: compact ? 2 : 3,
      ),
      decoration: BoxDecoration(
        color: palette.bg,
        border: Border.all(color: palette.border),
        borderRadius: BorderRadius.circular(3),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          color: palette.text,
          fontSize: compact ? 9.5 : 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.4,
        ),
      ),
    );
  }

  _StatusPalette _paletteFor(String status) {
    switch (status) {
      case 'Approved':
      case 'Completed':
      case 'With Stock':
        return const _StatusPalette(
          bg: AppColors.successBg,
          text: AppColors.success,
          border: AppColors.successBorder,
        );
      case 'Pending Approval':
      case 'Pending Issuance':
      case 'Awaiting PO':
        return const _StatusPalette(
          bg: AppColors.warningBg,
          text: AppColors.warning,
          border: AppColors.warningBorder,
        );
      case 'Rejected':
      case 'Returned to Applicant':
      case 'Without Stock':
        return const _StatusPalette(
          bg: AppColors.dangerBg,
          text: AppColors.dangerText,
          border: AppColors.dangerBorder,
        );
      case 'Partially Received':
        return const _StatusPalette(
          bg: AppColors.orangeBg,
          text: AppColors.orange,
          border: AppColors.orangeBorder,
        );
      case 'Posted':
      case 'Issued':
      case 'Linked to PR':
      case 'Converted to PO':
      case 'In Transit':
        return const _StatusPalette(
          bg: AppColors.softBlueBg,
          text: AppColors.primaryBlueDark,
          border: Color(0xFFB6D4FE),
        );
      default:
        return const _StatusPalette(
          bg: AppColors.draftBg,
          text: AppColors.textSecondary,
          border: AppColors.draftBorder,
        );
    }
  }
}

class _StatusPalette {
  final Color bg;
  final Color text;
  final Color border;

  const _StatusPalette({
    required this.bg,
    required this.text,
    required this.border,
  });
}

String getPoStageDescription(String status) {
  switch (status) {
    case 'Pending Approval':
      return 'Waiting for PO Approver authorization';
    case 'Returned to Applicant':
      return 'Returned to Applicant — Revision needed';
    case 'Approved':
      return 'Sent to Receiver (RCV) • In Transit';
    case 'Partially Received':
      return 'On Delivery — Partially received at warehouse';
    case 'Completed':
      return 'Delivered & received in full';
    default:
      return status;
  }
}
