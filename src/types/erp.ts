export type ModuleKey =
  | 'boq'
  | 'pqto'
  | 'pr'
  | 'po'
  | 'receiving'
  | 'withdrawal'
  | 'transfers'
  | 'logs';

export interface FileAttachment {
  id: string;
  name: string;
  type: 'PDF' | 'JPG' | 'PNG' | 'XLSX' | 'OTHER';
  size: string;
  uploadedAt: string;
  dataUrl?: string;
}

export interface BoqItem {
  id: string;
  lineNo: number;
  itemCode: string;
  description: string;
  boqUom: string; // e.g., 'lot', 'm', 'PC/s'
  boqQty: number;
  pqtoUom: string; // e.g., 'PC/s'
  pqtoQty: number;
  assignedLocation: string;
  costCenter?: string;
  remarks?: string;
  isBlankRow?: boolean;
  isWorksRelated?: boolean; // No transaction throughout workflow
  isLegacyFittingsRow?: boolean; // "Fittings of the above"
  isItemizedFitting?: boolean;
}

export interface PqtoRecord {
  id: string;
  pqtoNo: string;
  jobNo: string;
  projectTitle: string;
  status: 'Draft' | 'Posted' | 'Linked to PR';
  createdAt: string;
  items: {
    boqItemId: string;
    itemCode: string;
    description: string;
    boqUom: string;
    boqQty: number;
    pqtoUom: string;
    pqtoQty: number;
    prOrderedQty: number;
    assignedLocation: string;
  }[];
}

export interface PrLineItem {
  id: string;
  itemCode: string;
  description: string;
  uom: string;
  pqtoQty: number;
  requestedQty: number;
  assignedLocation: string; // Different locations allowed in 1 PR
  isNewItem?: boolean;
  systemAssignedCode?: string;
}

export interface PrRecord {
  id: string;
  prNo: string;
  pqtoNo: string;
  refDocNo: string;
  jobNo: string;
  applicant: string;
  spName?: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Converted to PO';
  createdAt: string;
  attachments: FileAttachment[];
  items: PrLineItem[];
  requiresBoqApproval?: boolean;
}

export interface PoLineItem {
  id: string;
  itemCode: string;
  description: string;
  uom: string;
  prQty: number;
  poQty: number;
  receivedQty: number;
  unitPrice: number;
  assignedLocation: string;
}

export interface PoRecord {
  id: string;
  poNo: string;
  prNo: string;
  refDocNo: string;
  iaas2RefNo: string;
  vendor: string;
  applicant: string;
  approver: string;
  spName?: string;
  status:
    | 'Pending Approval'
    | 'Approved'
    | 'Returned to Applicant'
    | 'Partially Received'
    | 'Completed';
  rejectionComments?: string;
  createdAt: string;
  attachments: FileAttachment[];
  items: PoLineItem[];
}

export interface ReceivingLineItem {
  id: string;
  itemCode: string;
  description: string;
  uom: string;
  orderedQty: number;
  previouslyReceivedQty: number;
  toReceiveQty: number;
  actualReceivedQty: number;
}

export interface ReceivingRecord {
  id: string;
  grnNo: string;
  poNo: string;
  refDocNo: string;
  iaas2RefNo: string;
  drNo: string;
  drDate: string;
  performedAt: string; // Real-time timestamp
  spName?: string;
  status: 'Partially Received' | 'Completed';
  attachments: FileAttachment[];
  items: ReceivingLineItem[];
}

export interface WarehouseStock {
  id: string;
  itemCode: string;
  description: string;
  uom: string;
  systemTag: string;
  assignedLocation: string;
  availableStock: number;
  reservedStock: number;
}

export interface WithdrawalRecord {
  id: string;
  wdNo: string;
  systemTag: string;
  jobNo: string;
  requestedBy: string;
  spName?: string;
  performedAt: string;
  status: 'With Stock' | 'Without Stock' | 'Issued';
  attachments: FileAttachment[];
  items: {
    itemCode: string;
    description: string;
    uom: string;
    availableAtRequest: number;
    requestedQty: number;
    assignedLocation: string;
  }[];
}

export interface StockTransferRecord {
  id: string;
  transferNo: string;
  type: 'Stock Transfer' | 'Excess Return to Warehouse';
  fromLocation: string;
  toLocation: string;
  itemCode: string;
  description: string;
  qty: number;
  uom: string;
  reason: string;
  performedAt: string;
}

export interface TransactionLog {
  id: string;
  timestamp: string;
  adminOrUser: string;
  spName: string;
  module: string;
  docNo: string;
  action: string;
  comments: string;
}

export interface NotificationItem {
  id: string;
  recipientRole: 'Approver' | 'Applicant';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface RequiredFieldConfig {
  refDocNo: boolean;
  iaas2RefNo: boolean;
  attachments: boolean;
  drDate: boolean;
  spName: boolean;
  blockExceedPqto: boolean;
}

export interface SmtpConfig {
  host: string;
  port: number;
  encryption: 'TLS' | 'SSL' | 'None';
  username: string;
  password?: string;
  fromEmail: string;
  fromName: string;
  recipientBoqToPr: string;
  notifyOnBoqToPr: boolean;
  notifyOnPoApproval: boolean;
  notifyOnLowStock: boolean;
  lastTestedAt?: string;
  status: 'Connected' | 'Not Configured' | 'Test Successful' | 'Failed';
}

export interface MaterialCostProjection {
  totalOrderQty: number;
  totalIssuedQty: number;
  totalOrderBudget: number;
  totalIssuedCost: number;
  completionPercentage: number;
  financialCompletionPercentage: number;
  projectedCostAtCompletion: number;
  variance: number;
}

