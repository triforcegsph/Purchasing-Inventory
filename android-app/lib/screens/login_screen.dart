import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';
import '../widgets/enterprise_widgets.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthProvider>();
    await auth.login(_emailController.text, _passwordController.text);
  }

  Future<void> _showServerConfigDialog() async {
    final auth = context.read<AuthProvider>();
    final controller = TextEditingController(text: auth.apiBaseUrl);
    String? testStatus;
    bool testing = false;

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text(
            'API Server Configuration',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Set the Purchasing & Inventory backend URL. Use http://10.0.2.2:4000 for Android Emulator or http://<LAN-IP>:4000 for a physical Android device.',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                decoration: const InputDecoration(
                  labelText: 'API Base URL',
                  hintText: 'http://192.168.1.100:4000',
                ),
                keyboardType: TextInputType.url,
              ),
              if (testStatus != null) ...[
                const SizedBox(height: 10),
                Text(
                  testStatus!,
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: testStatus!.startsWith('Connected')
                        ? AppColors.success
                        : AppColors.dangerText,
                  ),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: testing
                  ? null
                  : () async {
                      setDialogState(() {
                        testing = true;
                        testStatus = null;
                      });
                      await auth.updateBaseUrl(controller.text);
                      try {
                        final res = await auth.testConnection();
                        setDialogState(() {
                          testStatus = 'Connected (${res['engine'] ?? 'OK'})';
                        });
                      } catch (e) {
                        setDialogState(() => testStatus = 'Failed: $e');
                      } finally {
                        setDialogState(() => testing = false);
                      }
                    },
              child: Text(testing ? 'Testing...' : 'Test'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                await auth.updateBaseUrl(controller.text);
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        backgroundColor: AppColors.masthead,
        titleSpacing: 14,
        title: const Row(
          children: [
            Icon(Icons.business, size: 18, color: AppColors.accentLightBlue),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'PURCHASING & INVENTORY SYSTEM',
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.6,
                ),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: _showServerConfigDialog,
            tooltip: 'Configure API Server URL',
            icon: const Icon(Icons.dns_outlined, size: 20),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 420),
                    child: Container(
                      padding: const EdgeInsets.all(22),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        border: Border.all(color: AppColors.border),
                        borderRadius: BorderRadius.circular(4),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x14000000),
                            blurRadius: 12,
                            offset: Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text(
                              'PURCHASING & INVENTORY SYSTEM',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primaryBlueDark,
                                letterSpacing: 0.6,
                              ),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'System Sign In',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Sign in with your assigned Applicant/Requestor or REQ Approver account.',
                              style: TextStyle(
                                fontSize: 12.5,
                                color: AppColors.textMuted,
                              ),
                            ),
                            const SizedBox(height: 16),
                            if (auth.sessionNotice != null) ...[
                              EnterpriseBanner(message: auth.sessionNotice!),
                              const SizedBox(height: 12),
                            ],
                            if (auth.error != null) ...[
                              EnterpriseBanner(message: auth.error!),
                              const SizedBox(height: 12),
                            ],
                            const Text(
                              'Account Email',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.next,
                              autofillHints: const [AutofillHints.username],
                              decoration: const InputDecoration(
                                hintText: 'Enter your email address',
                                prefixIcon: Icon(Icons.person_outline, size: 18),
                              ),
                              validator: (val) => (val == null || val.trim().isEmpty)
                                  ? 'Please enter your account email.'
                                  : null,
                            ),
                            const SizedBox(height: 14),
                            const Text(
                              'Password',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: _passwordController,
                              obscureText: _obscurePassword,
                              textInputAction: TextInputAction.done,
                              onFieldSubmitted: (_) => _submit(),
                              decoration: InputDecoration(
                                hintText: 'Enter your password',
                                prefixIcon: const Icon(Icons.lock_outline, size: 18),
                                suffixIcon: IconButton(
                                  onPressed: () => setState(
                                    () => _obscurePassword = !_obscurePassword,
                                  ),
                                  icon: Icon(
                                    _obscurePassword
                                        ? Icons.visibility_outlined
                                        : Icons.visibility_off_outlined,
                                    size: 18,
                                  ),
                                ),
                              ),
                              validator: (val) => (val == null || val.isEmpty)
                                  ? 'Please enter your password.'
                                  : null,
                            ),
                            const SizedBox(height: 18),
                            SizedBox(
                              height: 44,
                              child: ElevatedButton.icon(
                                onPressed: auth.isLoading ? null : _submit,
                                icon: auth.isLoading
                                    ? const SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : const Icon(Icons.login, size: 18),
                                label: Text(auth.isLoading ? 'Signing In...' : 'Sign In'),
                              ),
                            ),
                            const SizedBox(height: 16),
                            const Divider(),
                            const SizedBox(height: 12),
                            const Row(
                              children: [
                                Icon(
                                  Icons.verified_user_outlined,
                                  size: 16,
                                  color: AppColors.success,
                                ),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Role-based segregation of duties enforced. Mobile access limited to Applicant & REQ Approver.',
                                    style: TextStyle(
                                      fontSize: 11.5,
                                      color: AppColors.textMuted,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            InkWell(
                              onTap: _showServerConfigDialog,
                              child: Row(
                                children: [
                                  const Icon(Icons.link, size: 14, color: AppColors.textHint),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      'Server: ${auth.apiBaseUrl}',
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 11,
                                        fontFamily: 'monospace',
                                        color: AppColors.textMuted,
                                      ),
                                    ),
                                  ),
                                  const Text(
                                    'Configure',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.primaryBlue,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: const BoxDecoration(
                color: Color(0xFFDFE3E8),
                border: Border(top: BorderSide(color: AppColors.border)),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Triforce Global Solutions • Android Companion',
                    style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                  ),
                  Text(
                    'RBAC Enabled',
                    style: TextStyle(
                      fontSize: 11,
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
