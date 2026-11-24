import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';
import '../providers/erp_provider.dart';
import '../widgets/enterprise_widgets.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late TextEditingController _urlCtrl;
  String? _connStatus;
  bool _testing = false;

  @override
  void initState() {
    super.initState();
    _urlCtrl = TextEditingController(
      text: context.read<AuthProvider>().apiBaseUrl,
    );
  }

  @override
  void dispose() {
    _urlCtrl.dispose();
    super.dispose();
  }

  Future<void> _saveAndTestUrl() async {
    final auth = context.read<AuthProvider>();
    setState(() {
      _testing = true;
      _connStatus = null;
    });
    await auth.updateBaseUrl(_urlCtrl.text);
    try {
      final res = await auth.testConnection();
      setState(() {
        _connStatus = 'Connected to backend (${res['engine'] ?? 'OK'}).';
      });
    } catch (e) {
      setState(() => _connStatus = 'Connection failed: $e');
    } finally {
      if (mounted) setState(() => _testing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final erp = context.watch<ErpProvider>();
    final user = auth.user;
    final perms = auth.permissions;

    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        // User Identity Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.masthead,
            borderRadius: BorderRadius.circular(4),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: AppColors.primaryBlue,
                child: Text(
                  (user?.fullName.isNotEmpty == true)
                      ? user!.fullName.substring(0, 1).toUpperCase()
                      : 'U',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user?.fullName ?? '',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      user?.username ?? '',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFFCBD5E1),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.primaryBlue.withValues(alpha: 0.25),
                        border: Border.all(
                          color: AppColors.primaryBlue.withValues(alpha: 0.6),
                        ),
                        borderRadius: BorderRadius.circular(3),
                      ),
                      child: Text(
                        user?.role ?? '',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.accentLightBlue,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 12),

        EnterpriseCard(
          title: 'Account & Project Details',
          child: Column(
            children: [
              InfoRow(label: 'Department', value: user?.department ?? ''),
              InfoRow(label: 'Active Project', value: erp.activeProject.name),
              InfoRow(label: 'Job Number', value: erp.activeProject.jobNo, mono: true),
              InfoRow(label: 'Access Scope', value: 'Android Mobile Companion'),
            ],
          ),
        ),

        const SizedBox(height: 12),

        EnterpriseCard(
          title: 'Role Access Matrix (Enforced by API)',
          child: Column(
            children: [
              _PermRow(label: 'View BOQ & PQTO', allowed: perms.canViewBoq),
              _PermRow(label: 'Edit / Import BOQ & Post to PQTO', allowed: perms.canEditBoq),
              _PermRow(label: 'Create & Submit Purchase Requisitions', allowed: perms.canCreatePr),
              _PermRow(label: 'Approve / Reject Purchase Requisitions', allowed: perms.canApprovePr),
              _PermRow(label: 'View Purchase Orders (Read-Only)', allowed: perms.canViewPo),
              _PermRow(label: 'Approve / Reject Purchase Orders', allowed: perms.canApprovePo),
              _PermRow(label: 'Material Withdrawal Requests', allowed: perms.canAccessWithdrawal),
              _PermRow(label: 'End-to-End Tracking & Audit Logs', allowed: perms.canViewTracking),
            ],
          ),
        ),

        const SizedBox(height: 12),

        EnterpriseCard(
          title: 'Backend API Configuration',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _urlCtrl,
                decoration: const InputDecoration(
                  labelText: 'API Base URL',
                  hintText: 'http://10.0.2.2:4000',
                ),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: _testing ? null : _saveAndTestUrl,
                icon: _testing
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.network_check, size: 16),
                label: Text(_testing ? 'Testing Connection...' : 'Save & Test Connection'),
              ),
              if (_connStatus != null) ...[
                const SizedBox(height: 8),
                Text(
                  _connStatus!,
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: _connStatus!.startsWith('Connected')
                        ? AppColors.success
                        : AppColors.dangerText,
                  ),
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 16),

        ElevatedButton.icon(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.danger,
            padding: const EdgeInsets.symmetric(vertical: 13),
          ),
          onPressed: () async {
            final confirm = await showDialog<bool>(
              context: context,
              builder: (ctx) => AlertDialog(
                title: const Text('Sign Out'),
                content: const Text('Are you sure you want to end your session?'),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('Cancel'),
                  ),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('Sign Out'),
                  ),
                ],
              ),
            );
            if (confirm == true && context.mounted) {
              context.read<ErpProvider>().clearState();
              await context.read<AuthProvider>().logout();
            }
          },
          icon: const Icon(Icons.logout, size: 18),
          label: const Text('Sign Out'),
        ),
        const SizedBox(height: 24),
      ],
    );
  }
}

class _PermRow extends StatelessWidget {
  final String label;
  final bool allowed;

  const _PermRow({required this.label, required this.allowed});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(
            allowed ? Icons.check_circle : Icons.block,
            size: 16,
            color: allowed ? AppColors.success : AppColors.dangerText,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: allowed ? AppColors.textPrimary : AppColors.textMuted,
              ),
            ),
          ),
          Text(
            allowed ? 'ALLOWED' : 'DENIED',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: allowed ? AppColors.success : AppColors.dangerText,
            ),
          ),
        ],
      ),
    );
  }
}
