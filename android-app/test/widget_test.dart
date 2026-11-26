import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:purchasing_inventory_mobile/core/network/api_client.dart';
import 'package:purchasing_inventory_mobile/core/theme/app_theme.dart';
import 'package:purchasing_inventory_mobile/models/erp_models.dart';
import 'package:purchasing_inventory_mobile/providers/auth_provider.dart';
import 'package:purchasing_inventory_mobile/screens/login_screen.dart';
import 'package:purchasing_inventory_mobile/widgets/status_badge.dart';

void main() {
  group('ERP Data Models & Business Logic', () {
    test('UserAccount identifies Applicant and REQ Approver roles', () {
      const applicant = UserAccount(
        id: 'u1',
        username: 'applicant@triforcegs.com.ph',
        fullName: 'Engr. John Doe',
        role: 'Applicant/Requestor',
        department: 'Site Engineering',
      );
      const approver = UserAccount(
        id: 'u2',
        username: 'req.approver@triforcegs.com.ph',
        fullName: 'Engr. Alex Smith',
        role: 'REQ Approver',
        department: 'Engineering Control',
      );

      expect(applicant.isApplicant, isTrue);
      expect(applicant.isReqApprover, isFalse);
      expect(approver.isReqApprover, isTrue);
      expect(approver.isApplicant, isFalse);
    });

    test('PqtoItem computes remaining balance and fully ordered flag accurately', () {
      final available = PqtoItem.fromJson({
        'boqItemId': 'boq-2',
        'itemCode': 'MAT-PIP-100-40',
        'description': 'B.I. Pipe 100mm',
        'boqUom': 'm',
        'boqQty': 120,
        'pqtoUom': 'PC/s',
        'pqtoQty': 20,
        'prOrderedQty': 12,
        'assignedLocation': 'Zone A',
        'costCenter': 'CC-MEPF-01',
      });
      final exhausted = PqtoItem.fromJson({
        'boqItemId': 'boq-fit-1',
        'itemCode': 'MAT-FIT-100-90',
        'description': 'B.I. Elbow 100mm',
        'boqUom': 'lot',
        'boqQty': 1,
        'pqtoUom': 'PC/s',
        'pqtoQty': 12,
        'prOrderedQty': 12,
        'assignedLocation': 'Zone A',
        'costCenter': 'CC-MEPF-01',
      });

      expect(available.remainingQty, 8);
      expect(available.isFullyOrdered, isFalse);
      expect(exhausted.remainingQty, 0);
      expect(exhausted.isFullyOrdered, isTrue);
    });

    test('PrRecord enforces editability only for Draft and Returned requests', () {
      final draftPr = PrRecord.fromJson({
        'id': 'pr-d',
        'prNo': 'PR-2026-0106',
        'pqtoNo': 'PQTO-2026-001',
        'refDocNo': '',
        'jobNo': 'JOB-2026-884',
        'applicant': 'Engr. John Doe',
        'status': 'Draft',
        'createdAt': '2026-11-19 10:00',
        'attachments': [],
        'items': [],
      });
      final returnedPr = PrRecord.fromJson({
        'id': 'pr-r',
        'prNo': 'PR-2026-0107',
        'pqtoNo': 'PQTO-2026-001',
        'refDocNo': 'REF-01',
        'jobNo': 'JOB-2026-884',
        'applicant': 'Engr. John Doe',
        'status': 'Returned to Applicant',
        'createdAt': '2026-11-19 10:00',
        'attachments': [],
        'items': [],
      });
      final approvedPr = PrRecord.fromJson({
        'id': 'pr-a',
        'prNo': 'PR-2026-0104',
        'pqtoNo': 'PQTO-2026-001',
        'refDocNo': 'REF-01',
        'jobNo': 'JOB-2026-884',
        'applicant': 'Engr. John Doe',
        'status': 'Approved',
        'createdAt': '2026-11-19 10:00',
        'attachments': [],
        'items': [],
      });

      expect(draftPr.isEditable, isTrue);
      expect(returnedPr.isEditable, isTrue);
      expect(approvedPr.isEditable, isFalse);
    });

    test('PoRecord computes totalAmount across ordered line items', () {
      final po = PoRecord.fromJson({
        'id': 'po-1',
        'poNo': 'PO-2026-0452',
        'prNo': 'PR-2026-0104',
        'refDocNo': 'REF-01',
        'iaas2RefNo': 'IAAS2-99201',
        'vendor': 'SteelCore Industrial Supply Corp.',
        'applicant': 'Engr. John Doe',
        'approver': 'Dir. Jane Doe',
        'status': 'Partially Received',
        'createdAt': '2026-11-16 14:20',
        'attachments': [],
        'items': [
          {
            'id': 'i1',
            'itemCode': 'MAT-PIP-100-40',
            'description': 'Pipe',
            'uom': 'PC/s',
            'prQty': 10,
            'poQty': 10,
            'receivedQty': 5,
            'unitPrice': 1000,
            'assignedLocation': 'Zone A',
          },
          {
            'id': 'i2',
            'itemCode': 'MAT-FIT-100-90',
            'description': 'Elbow',
            'uom': 'PC/s',
            'prQty': 5,
            'poQty': 5,
            'receivedQty': 5,
            'unitPrice': 200,
            'assignedLocation': 'Zone A',
          },
        ],
      });

      expect(po.totalAmount, 11000);
    });
  });

  group('UI Widget Tests', () {
    testWidgets('LoginScreen renders enterprise branding and validates empty inputs',
        (tester) async {
      final auth = AuthProvider(apiClient: ApiClient());
      await tester.pumpWidget(
        ChangeNotifierProvider<AuthProvider>.value(
          value: auth,
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const LoginScreen(),
          ),
        ),
      );

      expect(find.text('System Sign In'), findsOneWidget);
      expect(find.text('Account Email'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Sign In'), findsOneWidget);

      await tester.tap(find.text('Sign In'));
      await tester.pump();

      expect(find.text('Please enter your account email.'), findsOneWidget);
      expect(find.text('Please enter your password.'), findsOneWidget);
    });

    testWidgets('StatusBadge renders uppercase status label', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatusBadge(status: 'Pending Approval'),
          ),
        ),
      );

      expect(find.text('PENDING APPROVAL'), findsOneWidget);
    });
  });
}
