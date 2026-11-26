class UserAccount {
  final String id;
  final String username;
  final String fullName;
  final String role;
  final String department;

  const UserAccount({
    required this.id,
    required this.username,
    required this.fullName,
    required this.role,
    required this.department,
  });

  bool get isApplicant => role == 'Applicant/Requestor';
  bool get isReqApprover => role == 'REQ Approver';

  factory UserAccount.fromJson(Map<String, dynamic> json) {
    return UserAccount(
      id: json['id']?.toString() ?? '',
      username: json['username']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? '',
      role: json['role']?.toString() ?? '',
      department: json['department']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'username': username,
        'fullName': fullName,
        'role': role,
        'department': department,
      };
}

class UserPermissions {
  final bool canViewDashboard;
  final bool canViewBoq;
  final bool canEditBoq;
  final bool canImportBoq;
  final bool canPostBoqToPqto;
  final bool canViewPqto;
  final bool canCreatePr;
  final bool canApprovePr;
  final bool canRejectPr;
  final bool canViewPo;
  final bool canApprovePo;
  final bool canAccessWithdrawal;
  final bool canViewTracking;
  final bool canViewLogs;

  const UserPermissions({
    this.canViewDashboard = true,
    this.canViewBoq = true,
    this.canEditBoq = false,
    this.canImportBoq = false,
    this.canPostBoqToPqto = false,
    this.canViewPqto = true,
    this.canCreatePr = true,
    this.canApprovePr = false,
    this.canRejectPr = false,
    this.canViewPo = true,
    this.canApprovePo = false,
    this.canAccessWithdrawal = false,
    this.canViewTracking = true,
    this.canViewLogs = true,
  });

  factory UserPermissions.fromJson(Map<String, dynamic> json) {
    return UserPermissions(
      canViewDashboard: json['canViewDashboard'] == true,
      canViewBoq: json['canViewBoq'] == true,
      canEditBoq: json['canEditBoq'] == true,
      canImportBoq: json['canImportBoq'] == true,
      canPostBoqToPqto: json['canPostBoqToPqto'] == true,
      canViewPqto: json['canViewPqto'] == true,
      canCreatePr: json['canCreatePr'] == true,
      canApprovePr: json['canApprovePr'] == true,
      canRejectPr: json['canRejectPr'] == true,
      canViewPo: json['canViewPo'] == true,
      canApprovePo: json['canApprovePo'] == true,
      canAccessWithdrawal: json['canAccessWithdrawal'] == true,
      canViewTracking: json['canViewTracking'] == true,
      canViewLogs: json['canViewLogs'] == true,
    );
  }
}

class ProjectInfo {
  final String code;
  final String name;
  final String jobNo;
  final String description;

  const ProjectInfo({
    required this.code,
    required this.name,
    required this.jobNo,
    required this.description,
  });

  factory ProjectInfo.fromJson(Map<String, dynamic> json) {
    return ProjectInfo(
      code: json['code']?.toString() ?? 'PROJ-TWRB',
      name: json['name']?.toString() ?? 'PROJ-TWRB (Tower B)',
      jobNo: json['jobNo']?.toString() ?? 'JOB-2026-884',
      description: json['description']?.toString() ?? '',
    );
  }
}

class RequiredFieldConfig {
  final bool refDocNo;
  final bool iaas2RefNo;
  final bool attachments;
  final bool drDate;
  final bool spName;
  final bool blockExceedPqto;

  const RequiredFieldConfig({
    this.refDocNo = true,
    this.iaas2RefNo = true,
    this.attachments = true,
    this.drDate = true,
    this.spName = false,
    this.blockExceedPqto = true,
  });

  factory RequiredFieldConfig.fromJson(Map<String, dynamic> json) {
    return RequiredFieldConfig(
      refDocNo: json['refDocNo'] != false,
      iaas2RefNo: json['iaas2RefNo'] != false,
      attachments: json['attachments'] != false,
      drDate: json['drDate'] != false,
      spName: json['spName'] == true,
      blockExceedPqto: json['blockExceedPqto'] != false,
    );
  }
}

class FileAttachment {
  final String id;
  final String name;
  final String type;
  final String size;
  final String uploadedAt;
  final String? downloadUrl;

  const FileAttachment({
    required this.id,
    required this.name,
    required this.type,
    required this.size,
    required this.uploadedAt,
    this.downloadUrl,
  });

  factory FileAttachment.fromJson(Map<String, dynamic> json) {
    return FileAttachment(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      type: json['type']?.toString() ?? 'OTHER',
      size: json['size']?.toString() ?? '',
      uploadedAt: json['uploadedAt']?.toString() ?? '',
      downloadUrl: json['downloadUrl']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'type': type,
        'size': size,
        'uploadedAt': uploadedAt,
        if (downloadUrl != null) 'downloadUrl': downloadUrl,
      };
}

class BoqItem {
  final String id;
  final int lineNo;
  final String itemCode;
  final String description;
  final String boqUom;
  final double boqQty;
  final String pqtoUom;
  final double pqtoQty;
  final String assignedLocation;
  final String? costCenter;
  final String? remarks;
  final bool isBlankRow;
  final bool isWorksRelated;
  final bool isLegacyFittingsRow;
  final bool isItemizedFitting;

  const BoqItem({
    required this.id,
    required this.lineNo,
    required this.itemCode,
    required this.description,
    required this.boqUom,
    required this.boqQty,
    required this.pqtoUom,
    required this.pqtoQty,
    required this.assignedLocation,
    this.costCenter,
    this.remarks,
    this.isBlankRow = false,
    this.isWorksRelated = false,
    this.isLegacyFittingsRow = false,
    this.isItemizedFitting = false,
  });

  factory BoqItem.fromJson(Map<String, dynamic> json) {
    return BoqItem(
      id: json['id']?.toString() ?? '',
      lineNo: _toInt(json['lineNo'] ?? json['line_no']),
      itemCode: json['itemCode']?.toString() ?? json['item_code']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      boqUom: json['boqUom']?.toString() ?? json['boq_uom']?.toString() ?? '',
      boqQty: _toDouble(json['boqQty'] ?? json['boq_qty']),
      pqtoUom: json['pqtoUom']?.toString() ?? json['pqto_uom']?.toString() ?? '',
      pqtoQty: _toDouble(json['pqtoQty'] ?? json['pqto_qty']),
      assignedLocation:
          json['assignedLocation']?.toString() ?? json['assigned_location']?.toString() ?? '',
      costCenter: json['costCenter']?.toString() ?? json['cost_center']?.toString(),
      remarks: json['remarks']?.toString(),
      isBlankRow: json['isBlankRow'] == true || json['is_blank_row'] == true,
      isWorksRelated: json['isWorksRelated'] == true || json['is_works_related'] == true,
      isLegacyFittingsRow:
          json['isLegacyFittingsRow'] == true || json['is_legacy_fittings'] == true,
      isItemizedFitting:
          json['isItemizedFitting'] == true || json['is_itemized_fitting'] == true,
    );
  }
}

class PqtoItem {
  final String boqItemId;
  final String itemCode;
  final String description;
  final String boqUom;
  final double boqQty;
  final String pqtoUom;
  final double pqtoQty;
  final double prOrderedQty;
  final double remainingQty;
  final String assignedLocation;
  final String costCenter;

  const PqtoItem({
    required this.boqItemId,
    required this.itemCode,
    required this.description,
    required this.boqUom,
    required this.boqQty,
    required this.pqtoUom,
    required this.pqtoQty,
    required this.prOrderedQty,
    required this.remainingQty,
    required this.assignedLocation,
    required this.costCenter,
  });

  bool get isFullyOrdered => remainingQty <= 0;

  factory PqtoItem.fromJson(Map<String, dynamic> json) {
    final pqtoQty = _toDouble(json['pqtoQty']);
    final ordered = _toDouble(json['prOrderedQty']);
    final rem = json['remainingQty'] != null
        ? _toDouble(json['remainingQty'])
        : (pqtoQty - ordered).clamp(0.0, double.infinity).toDouble();
    return PqtoItem(
      boqItemId: json['boqItemId']?.toString() ?? '',
      itemCode: json['itemCode']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      boqUom: json['boqUom']?.toString() ?? '',
      boqQty: _toDouble(json['boqQty']),
      pqtoUom: json['pqtoUom']?.toString() ?? '',
      pqtoQty: pqtoQty,
      prOrderedQty: ordered,
      remainingQty: rem,
      assignedLocation: json['assignedLocation']?.toString() ?? '',
      costCenter: json['costCenter']?.toString() ?? '',
    );
  }
}

class PqtoRecord {
  final String id;
  final String pqtoNo;
  final String jobNo;
  final String projectTitle;
  final String status;
  final String createdAt;
  final List<PqtoItem> items;

  const PqtoRecord({
    required this.id,
    required this.pqtoNo,
    required this.jobNo,
    required this.projectTitle,
    required this.status,
    required this.createdAt,
    required this.items,
  });

  factory PqtoRecord.fromJson(Map<String, dynamic> json) {
    final rawItems = (json['items'] as List<dynamic>? ?? []);
    return PqtoRecord(
      id: json['id']?.toString() ?? '',
      pqtoNo: json['pqtoNo']?.toString() ?? '',
      jobNo: json['jobNo']?.toString() ?? '',
      projectTitle: json['projectTitle']?.toString() ?? '',
      status: json['status']?.toString() ?? 'Posted',
      createdAt: json['createdAt']?.toString() ?? '',
      items: rawItems
          .map((e) => PqtoItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class PrLineItem {
  final String id;
  final String itemCode;
  final String description;
  final String uom;
  final double pqtoQty;
  final double currentPqtoRemaining;
  final double requestedQty;
  final String assignedLocation;
  final bool isNewItem;
  final String? systemAssignedCode;

  const PrLineItem({
    required this.id,
    required this.itemCode,
    required this.description,
    required this.uom,
    required this.pqtoQty,
    required this.currentPqtoRemaining,
    required this.requestedQty,
    required this.assignedLocation,
    this.isNewItem = false,
    this.systemAssignedCode,
  });

  PrLineItem copyWith({
    String? itemCode,
    String? description,
    String? uom,
    double? pqtoQty,
    double? currentPqtoRemaining,
    double? requestedQty,
    String? assignedLocation,
    bool? isNewItem,
  }) {
    return PrLineItem(
      id: id,
      itemCode: itemCode ?? this.itemCode,
      description: description ?? this.description,
      uom: uom ?? this.uom,
      pqtoQty: pqtoQty ?? this.pqtoQty,
      currentPqtoRemaining: currentPqtoRemaining ?? this.currentPqtoRemaining,
      requestedQty: requestedQty ?? this.requestedQty,
      assignedLocation: assignedLocation ?? this.assignedLocation,
      isNewItem: isNewItem ?? this.isNewItem,
      systemAssignedCode: systemAssignedCode,
    );
  }

  factory PrLineItem.fromJson(Map<String, dynamic> json) {
    final pq = _toDouble(json['pqtoQty']);
    return PrLineItem(
      id: json['id']?.toString() ?? '',
      itemCode: json['itemCode']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      uom: json['uom']?.toString() ?? 'PC/s',
      pqtoQty: pq,
      currentPqtoRemaining: json['currentPqtoRemaining'] != null
          ? _toDouble(json['currentPqtoRemaining'])
          : pq,
      requestedQty: _toDouble(json['requestedQty']),
      assignedLocation: json['assignedLocation']?.toString() ?? '',
      isNewItem: json['isNewItem'] == true,
      systemAssignedCode: json['systemAssignedCode']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'itemCode': itemCode,
        'description': description,
        'uom': uom,
        'pqtoQty': pqtoQty,
        'requestedQty': requestedQty,
        'assignedLocation': assignedLocation,
        'isNewItem': isNewItem,
        if (systemAssignedCode != null) 'systemAssignedCode': systemAssignedCode,
      };
}

class PrRecord {
  final String id;
  final String prNo;
  final String pqtoNo;
  final String refDocNo;
  final String jobNo;
  final String projectCode;
  final String applicant;
  final String? applicantId;
  final String? spName;
  final String status;
  final String createdAt;
  final List<FileAttachment> attachments;
  final List<PrLineItem> items;
  final bool requiresBoqApproval;
  final String? rejectionComments;
  final String? approvedBy;
  final String? approvedAt;
  final String? rejectedBy;
  final String? rejectedAt;

  const PrRecord({
    required this.id,
    required this.prNo,
    required this.pqtoNo,
    required this.refDocNo,
    required this.jobNo,
    required this.projectCode,
    required this.applicant,
    this.applicantId,
    this.spName,
    required this.status,
    required this.createdAt,
    required this.attachments,
    required this.items,
    this.requiresBoqApproval = false,
    this.rejectionComments,
    this.approvedBy,
    this.approvedAt,
    this.rejectedBy,
    this.rejectedAt,
  });

  bool get isEditable =>
      status == 'Draft' || status == 'Returned to Applicant' || status == 'Rejected';

  bool get isPendingApproval => status == 'Pending Approval';

  factory PrRecord.fromJson(Map<String, dynamic> json) {
    return PrRecord(
      id: json['id']?.toString() ?? '',
      prNo: json['prNo']?.toString() ?? '',
      pqtoNo: json['pqtoNo']?.toString() ?? '',
      refDocNo: json['refDocNo']?.toString() ?? '',
      jobNo: json['jobNo']?.toString() ?? '',
      projectCode: json['projectCode']?.toString() ?? 'PROJ-TWRB',
      applicant: json['applicant']?.toString() ?? '',
      applicantId: json['applicantId']?.toString(),
      spName: json['spName']?.toString(),
      status: json['status']?.toString() ?? 'Draft',
      createdAt: json['createdAt']?.toString() ?? '',
      attachments: (json['attachments'] as List<dynamic>? ?? [])
          .map((e) => FileAttachment.fromJson(e as Map<String, dynamic>))
          .toList(),
      items: (json['items'] as List<dynamic>? ?? [])
          .map((e) => PrLineItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      requiresBoqApproval: json['requiresBoqApproval'] == true,
      rejectionComments: json['rejectionComments']?.toString(),
      approvedBy: json['approvedBy']?.toString(),
      approvedAt: json['approvedAt']?.toString(),
      rejectedBy: json['rejectedBy']?.toString(),
      rejectedAt: json['rejectedAt']?.toString(),
    );
  }
}

class PoLineItem {
  final String id;
  final String itemCode;
  final String description;
  final String uom;
  final double prQty;
  final double poQty;
  final double receivedQty;
  final double unitPrice;
  final String assignedLocation;

  const PoLineItem({
    required this.id,
    required this.itemCode,
    required this.description,
    required this.uom,
    required this.prQty,
    required this.poQty,
    required this.receivedQty,
    required this.unitPrice,
    required this.assignedLocation,
  });

  double get lineTotal => poQty * unitPrice;

  factory PoLineItem.fromJson(Map<String, dynamic> json) {
    return PoLineItem(
      id: json['id']?.toString() ?? '',
      itemCode: json['itemCode']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      uom: json['uom']?.toString() ?? '',
      prQty: _toDouble(json['prQty']),
      poQty: _toDouble(json['poQty']),
      receivedQty: _toDouble(json['receivedQty']),
      unitPrice: _toDouble(json['unitPrice']),
      assignedLocation: json['assignedLocation']?.toString() ?? '',
    );
  }
}

class PoRecord {
  final String id;
  final String poNo;
  final String prNo;
  final String refDocNo;
  final String iaas2RefNo;
  final String vendor;
  final String applicant;
  final String approver;
  final String? spName;
  final String status;
  final String? rejectionComments;
  final String createdAt;
  final double totalAmount;
  final List<FileAttachment> attachments;
  final List<PoLineItem> items;

  const PoRecord({
    required this.id,
    required this.poNo,
    required this.prNo,
    required this.refDocNo,
    required this.iaas2RefNo,
    required this.vendor,
    required this.applicant,
    required this.approver,
    this.spName,
    required this.status,
    this.rejectionComments,
    required this.createdAt,
    required this.totalAmount,
    required this.attachments,
    required this.items,
  });

  factory PoRecord.fromJson(Map<String, dynamic> json) {
    final parsedItems = (json['items'] as List<dynamic>? ?? [])
        .map((e) => PoLineItem.fromJson(e as Map<String, dynamic>))
        .toList();
    final computedTotal = parsedItems.fold<double>(0, (s, i) => s + i.lineTotal);
    return PoRecord(
      id: json['id']?.toString() ?? '',
      poNo: json['poNo']?.toString() ?? '',
      prNo: json['prNo']?.toString() ?? '',
      refDocNo: json['refDocNo']?.toString() ?? '',
      iaas2RefNo: json['iaas2RefNo']?.toString() ?? '',
      vendor: json['vendor']?.toString() ?? '',
      applicant: json['applicant']?.toString() ?? '',
      approver: json['approver']?.toString() ?? '',
      spName: json['spName']?.toString(),
      status: json['status']?.toString() ?? '',
      rejectionComments: json['rejectionComments']?.toString(),
      createdAt: json['createdAt']?.toString() ?? '',
      totalAmount:
          json['totalAmount'] != null ? _toDouble(json['totalAmount']) : computedTotal,
      attachments: (json['attachments'] as List<dynamic>? ?? [])
          .map((e) => FileAttachment.fromJson(e as Map<String, dynamic>))
          .toList(),
      items: parsedItems,
    );
  }
}

class WarehouseStock {
  final String id;
  final String itemCode;
  final String description;
  final String uom;
  final String systemTag;
  final String assignedLocation;
  final double availableStock;
  final double reservedStock;

  const WarehouseStock({
    required this.id,
    required this.itemCode,
    required this.description,
    required this.uom,
    required this.systemTag,
    required this.assignedLocation,
    required this.availableStock,
    required this.reservedStock,
  });

  factory WarehouseStock.fromJson(Map<String, dynamic> json) {
    return WarehouseStock(
      id: json['id']?.toString() ?? '',
      itemCode: json['itemCode']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      uom: json['uom']?.toString() ?? '',
      systemTag: json['systemTag']?.toString() ?? '',
      assignedLocation: json['assignedLocation']?.toString() ?? '',
      availableStock: _toDouble(json['availableStock']),
      reservedStock: _toDouble(json['reservedStock']),
    );
  }
}

class WithdrawalLineItem {
  final String itemCode;
  final String description;
  final String uom;
  final double availableAtRequest;
  final double requestedQty;
  final String assignedLocation;

  const WithdrawalLineItem({
    required this.itemCode,
    required this.description,
    required this.uom,
    required this.availableAtRequest,
    required this.requestedQty,
    required this.assignedLocation,
  });

  factory WithdrawalLineItem.fromJson(Map<String, dynamic> json) {
    return WithdrawalLineItem(
      itemCode: json['itemCode']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      uom: json['uom']?.toString() ?? '',
      availableAtRequest: _toDouble(json['availableAtRequest']),
      requestedQty: _toDouble(json['requestedQty']),
      assignedLocation: json['assignedLocation']?.toString() ?? '',
    );
  }
}

class WithdrawalRecord {
  final String id;
  final String wdNo;
  final String systemTag;
  final String jobNo;
  final String requestedBy;
  final String? spName;
  final String performedAt;
  final String status;
  final List<FileAttachment> attachments;
  final List<WithdrawalLineItem> items;

  const WithdrawalRecord({
    required this.id,
    required this.wdNo,
    required this.systemTag,
    required this.jobNo,
    required this.requestedBy,
    this.spName,
    required this.performedAt,
    required this.status,
    required this.attachments,
    required this.items,
  });

  factory WithdrawalRecord.fromJson(Map<String, dynamic> json) {
    return WithdrawalRecord(
      id: json['id']?.toString() ?? '',
      wdNo: json['wdNo']?.toString() ?? '',
      systemTag: json['systemTag']?.toString() ?? '',
      jobNo: json['jobNo']?.toString() ?? '',
      requestedBy: json['requestedBy']?.toString() ?? '',
      spName: json['spName']?.toString(),
      performedAt: json['performedAt']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      attachments: (json['attachments'] as List<dynamic>? ?? [])
          .map((e) => FileAttachment.fromJson(e as Map<String, dynamic>))
          .toList(),
      items: (json['items'] as List<dynamic>? ?? [])
          .map((e) => WithdrawalLineItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class TrackingStep {
  final int stageNumber;
  final String key;
  final String label;
  final String status;
  final String state; // done | active | rejected | pending
  final String docNo;
  final String timestamp;
  final String responsibleUser;
  final String remarks;

  const TrackingStep({
    required this.stageNumber,
    required this.key,
    required this.label,
    required this.status,
    required this.state,
    required this.docNo,
    required this.timestamp,
    required this.responsibleUser,
    required this.remarks,
  });

  factory TrackingStep.fromJson(Map<String, dynamic> json) {
    return TrackingStep(
      stageNumber: _toInt(json['stageNumber']),
      key: json['key']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      state: json['state']?.toString() ?? 'pending',
      docNo: json['docNo']?.toString() ?? '',
      timestamp: json['timestamp']?.toString() ?? '',
      responsibleUser: json['responsibleUser']?.toString() ?? '',
      remarks: json['remarks']?.toString() ?? '',
    );
  }
}

class TrackingChain {
  final String id;
  final String prNo;
  final String pqtoNo;
  final String refDocNo;
  final String jobNo;
  final String applicant;
  final String overallStatus;
  final String category;
  final List<String> linkedPoNos;
  final List<String> linkedGrnNos;
  final List<String> linkedWdNos;
  final List<FileAttachment> attachments;
  final List<TrackingStep> steps;
  final TransactionLog? latestLog;

  const TrackingChain({
    required this.id,
    required this.prNo,
    required this.pqtoNo,
    required this.refDocNo,
    required this.jobNo,
    required this.applicant,
    required this.overallStatus,
    required this.category,
    required this.linkedPoNos,
    required this.linkedGrnNos,
    required this.linkedWdNos,
    required this.attachments,
    required this.steps,
    this.latestLog,
  });

  factory TrackingChain.fromJson(Map<String, dynamic> json) {
    return TrackingChain(
      id: json['id']?.toString() ?? '',
      prNo: json['prNo']?.toString() ?? '',
      pqtoNo: json['pqtoNo']?.toString() ?? '',
      refDocNo: json['refDocNo']?.toString() ?? '',
      jobNo: json['jobNo']?.toString() ?? '',
      applicant: json['applicant']?.toString() ?? '',
      overallStatus: json['overallStatus']?.toString() ?? '',
      category: json['category']?.toString() ?? 'PR',
      linkedPoNos: (json['linkedPoNos'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
      linkedGrnNos: (json['linkedGrnNos'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
      linkedWdNos: (json['linkedWdNos'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
      attachments: (json['attachments'] as List<dynamic>? ?? [])
          .map((e) => FileAttachment.fromJson(e as Map<String, dynamic>))
          .toList(),
      steps: (json['steps'] as List<dynamic>? ?? [])
          .map((e) => TrackingStep.fromJson(e as Map<String, dynamic>))
          .toList(),
      latestLog: json['latestLog'] != null
          ? TransactionLog.fromJson(json['latestLog'] as Map<String, dynamic>)
          : null,
    );
  }
}

class TransactionLog {
  final String id;
  final String timestamp;
  final String adminOrUser;
  final String userRole;
  final String spName;
  final String module;
  final String docNo;
  final String action;
  final String comments;

  const TransactionLog({
    required this.id,
    required this.timestamp,
    required this.adminOrUser,
    required this.userRole,
    required this.spName,
    required this.module,
    required this.docNo,
    required this.action,
    required this.comments,
  });

  factory TransactionLog.fromJson(Map<String, dynamic> json) {
    return TransactionLog(
      id: json['id']?.toString() ?? '',
      timestamp: json['timestamp']?.toString() ?? '',
      adminOrUser: json['adminOrUser']?.toString() ?? '',
      userRole: json['userRole']?.toString() ?? '',
      spName: json['spName']?.toString() ?? '',
      module: json['module']?.toString() ?? '',
      docNo: json['docNo']?.toString() ?? '',
      action: json['action']?.toString() ?? '',
      comments: json['comments']?.toString() ?? '',
    );
  }
}

class NotificationItem {
  final String id;
  final String recipientRole;
  final String title;
  final String message;
  final String timestamp;
  final bool read;
  final String? docType;
  final String? docId;
  final String? docNo;

  const NotificationItem({
    required this.id,
    required this.recipientRole,
    required this.title,
    required this.message,
    required this.timestamp,
    required this.read,
    this.docType,
    this.docId,
    this.docNo,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['id']?.toString() ?? '',
      recipientRole: json['recipientRole']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      message: json['message']?.toString() ?? '',
      timestamp: json['timestamp']?.toString() ?? '',
      read: json['read'] == true,
      docType: json['docType']?.toString(),
      docId: json['docId']?.toString(),
      docNo: json['docNo']?.toString(),
    );
  }
}

class DashboardData {
  final String role;
  final ProjectInfo project;
  final String boqStatus;
  final int boqItemCount;
  final int pqtoCount;
  final int unreadNotifications;
  final Map<String, int> metrics;
  final List<PrRecord> recentPrs;
  final List<TransactionLog> recentActivities;

  const DashboardData({
    required this.role,
    required this.project,
    required this.boqStatus,
    required this.boqItemCount,
    required this.pqtoCount,
    required this.unreadNotifications,
    required this.metrics,
    required this.recentPrs,
    required this.recentActivities,
  });

  factory DashboardData.fromJson(Map<String, dynamic> json) {
    final rawMetrics = (json['metrics'] as Map<String, dynamic>? ?? {});
    final metricsMap = rawMetrics.map((k, v) => MapEntry(k, _toInt(v)));
    final rawPrs = (json['recentlySubmittedPrs'] ?? json['recentPrs']) as List<dynamic>? ?? [];
    final rawLogs = json['recentActivities'] as List<dynamic>? ?? [];
    return DashboardData(
      role: json['role']?.toString() ?? '',
      project: ProjectInfo.fromJson((json['project'] as Map<String, dynamic>?) ?? {}),
      boqStatus: json['boqStatus']?.toString() ?? 'Draft',
      boqItemCount: _toInt(json['boqItemCount']),
      pqtoCount: _toInt(json['pqtoCount']),
      unreadNotifications: _toInt(json['unreadNotifications']),
      metrics: metricsMap,
      recentPrs: rawPrs
          .map((e) => PrRecord.fromJson(e as Map<String, dynamic>))
          .toList(),
      recentActivities: rawLogs
          .map((e) => TransactionLog.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

double _toDouble(dynamic value) {
  if (value == null) return 0;
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString()) ?? 0;
}

int _toInt(dynamic value) {
  if (value == null) return 0;
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString()) ?? 0;
}
