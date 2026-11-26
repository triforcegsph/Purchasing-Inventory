import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/network/api_client.dart';
import 'core/theme/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/erp_provider.dart';
import 'screens/login_screen.dart';
import 'screens/main_shell.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const PurchasingInventoryApp());
}

class PurchasingInventoryApp extends StatefulWidget {
  const PurchasingInventoryApp({super.key});

  @override
  State<PurchasingInventoryApp> createState() => _PurchasingInventoryAppState();
}

class _PurchasingInventoryAppState extends State<PurchasingInventoryApp> {
  late final ApiClient _apiClient;
  late final AuthProvider _authProvider;
  late final ErpProvider _erpProvider;

  @override
  void initState() {
    super.initState();
    _apiClient = ApiClient();
    _authProvider = AuthProvider(apiClient: _apiClient)..initialize();
    _erpProvider = ErpProvider(apiClient: _apiClient);
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: _authProvider),
        ChangeNotifierProvider<ErpProvider>.value(value: _erpProvider),
      ],
      child: MaterialApp(
        title: 'Purchasing & Inventory System',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        home: Consumer<AuthProvider>(
          builder: (context, auth, _) {
            if (auth.isInitializing) {
              return const Scaffold(
                backgroundColor: AppColors.masthead,
                body: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.business,
                        size: 44,
                        color: AppColors.accentLightBlue,
                      ),
                      SizedBox(height: 12),
                      Text(
                        'PURCHASING & INVENTORY SYSTEM',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.6,
                        ),
                      ),
                      SizedBox(height: 16),
                      CircularProgressIndicator(color: AppColors.accentLightBlue),
                    ],
                  ),
                ),
              );
            }
            return auth.isAuthenticated ? const MainShell() : const LoginScreen();
          },
        ),
      ),
    );
  }
}
