import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';
import '../providers/erp_provider.dart';
import 'boq_screen.dart';
import 'dashboard_screen.dart';
import 'logs_screen.dart';
import 'notifications_screen.dart';
import 'po_screen.dart';
import 'pqto_screen.dart';
import 'pr_detail_screen.dart';
import 'pr_form_screen.dart';
import 'pr_list_screen.dart';
import 'profile_screen.dart';
import 'tracking_screen.dart';
import 'withdrawal_screen.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _tabIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final auth = context.read<AuthProvider>();
      context.read<ErpProvider>().loadInitialData(
            canAccessWithdrawal: auth.permissions.canAccessWithdrawal,
          );
    });
  }

  void _openModule(Widget screen) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final erp = context.watch<ErpProvider>();
    final user = auth.user;
    final perms = auth.permissions;
    final isApprover = user?.isReqApprover == true;

    final pages = [
      DashboardScreen(
        onOpenRequests: () => setState(() => _tabIndex = 1),
        onOpenNewPr: () => _openModule(const PrFormScreen()),
        onOpenBoq: () => _openModule(
          BoqScreen(
            onPostedToPqto: () => _openModule(const PqtoScreen()),
          ),
        ),
        onOpenPqto: () => _openModule(const PqtoScreen()),
        onOpenPo: () => _openModule(const PoScreen()),
        onOpenWithdrawal: () => _openModule(const WithdrawalScreen()),
        onOpenTracking: () => setState(() => _tabIndex = 2),
        onOpenPrDetail: (pr) => _openModule(PrDetailScreen(prId: pr.id)),
      ),
      const PrListScreen(),
      const TrackingScreen(),
      const NotificationsScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        backgroundColor: AppColors.masthead,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'PURCHASING & INVENTORY',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.4,
              ),
            ),
            Text(
              '${erp.activeProjectCode} • ${user?.role ?? ''}',
              style: const TextStyle(
                fontSize: 10.5,
                fontFamily: 'monospace',
                color: AppColors.accentLightBlue,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Switch Project',
            icon: const Icon(Icons.apartment_outlined, size: 20),
            onSelected: (code) => erp.switchProject(code),
            itemBuilder: (_) => erp.projects
                .map(
                  (p) => PopupMenuItem<String>(
                    value: p.code,
                    child: Row(
                      children: [
                        Icon(
                          p.code == erp.activeProjectCode
                              ? Icons.radio_button_checked
                              : Icons.radio_button_off,
                          size: 16,
                          color: AppColors.primaryBlue,
                        ),
                        const SizedBox(width: 8),
                        Text(p.name, style: const TextStyle(fontSize: 13)),
                      ],
                    ),
                  ),
                )
                .toList(),
          ),
          IconButton(
            tooltip: 'Refresh Data',
            onPressed: () => erp.loadInitialData(
              canAccessWithdrawal: perms.canAccessWithdrawal,
            ),
            icon: const Icon(Icons.refresh, size: 20),
          ),
        ],
      ),
      drawer: Drawer(
        backgroundColor: AppColors.sidebar,
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(
                  color: AppColors.masthead,
                  border: Border(bottom: BorderSide(color: AppColors.sidebarDivider)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'FUNCTIONS',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.8,
                            color: Color(0xFF94A3B8),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.darkInput,
                            border: Border.all(color: const Color(0xFF3C414A)),
                            borderRadius: BorderRadius.circular(3),
                          ),
                          child: Text(
                            isApprover ? 'REQ APPR' : 'APPLICANT',
                            style: const TextStyle(
                              fontSize: 10,
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.w700,
                              color: AppColors.accentLightBlue,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      user?.fullName ?? '',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      user?.username ?? '',
                      style: const TextStyle(fontSize: 11.5, color: Color(0xFF94A3B8)),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  children: [
                    const _DrawerGroupLabel('PROJECT & TAKE-OFF'),
                    _DrawerItem(
                      code: 'BOQ',
                      label: 'Bill of Quantities',
                      icon: Icons.table_chart_outlined,
                      onTap: () {
                        Navigator.pop(context);
                        _openModule(
                          BoqScreen(
                            onPostedToPqto: () => _openModule(const PqtoScreen()),
                          ),
                        );
                      },
                    ),
                    _DrawerItem(
                      code: 'PQTO',
                      label: 'Project Qty Take-Off',
                      icon: Icons.calculate_outlined,
                      onTap: () {
                        Navigator.pop(context);
                        _openModule(const PqtoScreen());
                      },
                    ),
                    const _DrawerGroupLabel('PURCHASING MANAGEMENT'),
                    _DrawerItem(
                      code: 'PR',
                      label: isApprover ? 'PR Approval Queue' : 'Purchase Requisition',
                      icon: isApprover
                          ? Icons.fact_check_outlined
                          : Icons.assignment_outlined,
                      onTap: () {
                        Navigator.pop(context);
                        setState(() => _tabIndex = 1);
                      },
                    ),
                    _DrawerItem(
                      code: 'PO',
                      label: 'Purchase Order',
                      icon: Icons.shopping_cart_outlined,
                      onTap: () {
                        Navigator.pop(context);
                        _openModule(const PoScreen());
                      },
                    ),
                    if (perms.canAccessWithdrawal) ...[
                      const _DrawerGroupLabel('INVENTORY & WAREHOUSE'),
                      _DrawerItem(
                        code: 'WD',
                        label: 'Material Withdrawal',
                        icon: Icons.outbox_outlined,
                        onTap: () {
                          Navigator.pop(context);
                          _openModule(const WithdrawalScreen());
                        },
                      ),
                    ],
                    const _DrawerGroupLabel('TRACKING & AUDIT'),
                    _DrawerItem(
                      code: 'TRK',
                      label: 'End-to-End Tracking',
                      icon: Icons.alt_route,
                      onTap: () {
                        Navigator.pop(context);
                        setState(() => _tabIndex = 2);
                      },
                    ),
                    _DrawerItem(
                      code: 'LOG',
                      label: 'Transaction Logs',
                      icon: Icons.history,
                      onTap: () {
                        Navigator.pop(context);
                        _openModule(const LogsScreen());
                      },
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: const BoxDecoration(
                  border: Border(top: BorderSide(color: AppColors.sidebarDivider)),
                ),
                child: ListTile(
                  dense: true,
                  leading: const Icon(Icons.logout, color: Color(0xFFF87171), size: 20),
                  title: const Text(
                    'Sign Out',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                  ),
                  onTap: () async {
                    Navigator.pop(context);
                    erp.clearState();
                    await auth.logout();
                  },
                ),
              ),
            ],
          ),
        ),
      ),
      body: erp.isLoading && erp.dashboard == null
          ? const Center(child: CircularProgressIndicator())
          : IndexedStack(
              index: _tabIndex,
              children: pages,
            ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tabIndex,
        onDestinationSelected: (idx) => setState(() => _tabIndex = idx),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(
              isApprover ? Icons.fact_check_outlined : Icons.assignment_outlined,
            ),
            selectedIcon: Icon(
              isApprover ? Icons.fact_check : Icons.assignment,
            ),
            label: isApprover ? 'Approvals' : 'Requests',
          ),
          const NavigationDestination(
            icon: Icon(Icons.alt_route_outlined),
            selectedIcon: Icon(Icons.alt_route),
            label: 'Tracking',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: erp.unreadNotifications > 0,
              label: Text('${erp.unreadNotifications}'),
              child: const Icon(Icons.notifications_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: erp.unreadNotifications > 0,
              label: Text('${erp.unreadNotifications}'),
              child: const Icon(Icons.notifications),
            ),
            label: 'Alerts',
          ),
          const NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

class _DrawerGroupLabel extends StatelessWidget {
  final String text;

  const _DrawerGroupLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.8,
          color: Color(0xFF94A3B8),
        ),
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  final String code;
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  const _DrawerItem({
    required this.code,
    required this.label,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      leading: Icon(icon, size: 19, color: const Color(0xFFCBD5E1)),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
            decoration: BoxDecoration(
              color: AppColors.darkInput,
              border: Border.all(color: const Color(0xFF3C414A)),
              borderRadius: BorderRadius.circular(2),
            ),
            child: Text(
              code,
              style: const TextStyle(
                fontSize: 10.5,
                fontFamily: 'monospace',
                color: Color(0xFFCBD5E1),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 13,
                color: Colors.white,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
      onTap: onTap,
    );
  }
}
