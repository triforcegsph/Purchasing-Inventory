import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  BoqItem,
  FileAttachment,
  NotificationItem,
  PoRecord,
  PqtoRecord,
  PrRecord,
  ReceivingRecord,
  RequiredFieldConfig,
  StockTransferRecord,
  TransactionLog,
  UserRole,
  WarehouseStock,
  WithdrawalRecord,
} from '../src/types/erp';
import {
  CIVIL_BOQ_ITEMS,
  CIVIL_PQTOS,
  INITIAL_BOQ_ITEMS,
  INITIAL_LOGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_POS,
  INITIAL_PQTOS,
  INITIAL_PRS,
  INITIAL_RECEIVINGS,
  INITIAL_REQUIRED_CONFIG,
  INITIAL_STOCK,
  INITIAL_TRANSFERS,
  INITIAL_WITHDRAWALS,
} from '../src/data/seedData';
import { getPool } from './db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
export const UPLOADS_DIR = path.join(__dirname, 'uploads');

export interface ExtendedPrRecord extends Omit<PrRecord, 'status'> {
  status:
    | 'Draft'
    | 'Pending Approval'
    | 'Approved'
    | 'Returned to Applicant'
    | 'Rejected'
    | 'Converted to PO';
  projectCode: string;
  applicantId?: string;
  rejectionComments?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
}

export interface ExtendedWithdrawalRecord extends Omit<WithdrawalRecord, 'status'> {
  status: 'Pending Issuance' | 'With Stock' | 'Without Stock' | 'Issued';
  projectCode?: string;
  remarks?: string;
}

export interface ExtendedNotificationItem extends NotificationItem {
  docType?: 'PR' | 'PO' | 'WITHDRAWAL' | 'BOQ' | 'PQTO' | 'TRACKING';
  docId?: string;
  docNo?: string;
}

export interface ExtendedTransactionLog extends TransactionLog {
  userRole?: UserRole | string;
}

export interface StoredAttachmentMeta extends FileAttachment {
  storagePath?: string;
  mimeType?: string;
}

export interface ProjectInfo {
  code: string;
  name: string;
  jobNo: string;
  description: string;
}

export interface ErpDatabaseState {
  projects: ProjectInfo[];
  boqByProject: Record<string, BoqItem[]>;
  boqStatusByProject: Record<string, 'Draft' | 'Posted'>;
  pqtosByProject: Record<string, PqtoRecord[]>;
  prs: ExtendedPrRecord[];
  pos: PoRecord[];
  receivings: ReceivingRecord[];
  stock: WarehouseStock[];
  withdrawals: ExtendedWithdrawalRecord[];
  transfers: StockTransferRecord[];
  logs: ExtendedTransactionLog[];
  notifications: ExtendedNotificationItem[];
  attachmentsIndex: Record<string, StoredAttachmentMeta>;
  config: RequiredFieldConfig;
}

function deepClone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val)) as T;
}

export function createInitialState(): ErpDatabaseState {
  const initialPrs: ExtendedPrRecord[] = [
    ...deepClone(INITIAL_PRS).map((pr) => ({
      ...pr,
      projectCode: 'PROJ-TWRB',
      applicantId: 'usr-applicant',
      approvedBy: pr.status === 'Approved' ? 'Engr. Alex Smith' : undefined,
      approvedAt: pr.status === 'Approved' ? '2026-11-16 11:05' : undefined,
    })),
    {
      id: 'pr-2',
      prNo: 'PR-2026-0105',
      pqtoNo: 'PQTO-2026-001',
      refDocNo: 'REF-PR-884-02',
      jobNo: 'JOB-2026-884',
      projectCode: 'PROJ-TWRB',
      applicant: 'Engr. John Doe',
      applicantId: 'usr-applicant',
      spName: 'SP-MECH-BETA',
      status: 'Pending Approval',
      createdAt: '2026-11-18 09:20',
      attachments: [
        {
          id: 'att-pr2-1',
          name: 'PumpRoom_Material_Schedule.pdf',
          type: 'PDF',
          size: '920 KB',
          uploadedAt: '2026-11-18 09:19',
        },
      ],
      items: [
        {
          id: 'pr2-item-1',
          itemCode: 'MAT-PIP-100-40',
          description: 'B.I. Pipe Sch-40, Seamless - 100mm (6m/length)',
          uom: 'PC/s',
          pqtoQty: 8,
          requestedQty: 4,
          assignedLocation: 'Zone A - Pump Room',
        },
        {
          id: 'pr2-item-2',
          itemCode: 'MAT-TEE-200-100',
          description: 'B.I. Tee Reducer Sch-40, Welded - 200mm x 100mm',
          uom: 'PC/s',
          pqtoQty: 2,
          requestedQty: 2,
          assignedLocation: 'Zone B - Riser Shaft',
        },
      ],
    },
    {
      id: 'pr-3',
      prNo: 'PR-2026-0106',
      pqtoNo: 'PQTO-2026-001',
      refDocNo: 'REF-PR-884-03',
      jobNo: 'JOB-2026-884',
      projectCode: 'PROJ-TWRB',
      applicant: 'Engr. Maria Santos',
      applicantId: 'usr-applicant-2',
      spName: 'SP-MECH-GAMMA',
      status: 'Draft',
      createdAt: '2026-11-19 14:10',
      attachments: [],
      items: [
        {
          id: 'pr3-item-1',
          itemCode: 'MAT-PIP-080-40',
          description: 'B.I. Pipe Sch-40, Seamless - 80mm (6m/length)',
          uom: 'PC/s',
          pqtoQty: 5,
          requestedQty: 3,
          assignedLocation: 'Zone B - Riser Shaft',
        },
      ],
    },
  ];

  const initialNotifications: ExtendedNotificationItem[] = [
    ...deepClone(INITIAL_NOTIFICATIONS).map((n) => ({
      ...n,
      docType: 'PO' as const,
      docId: 'po-2',
      docNo: 'PO-2026-0453',
    })),
    {
      id: 'notif-2',
      recipientRole: 'Approver',
      title: 'New PR Pending Approval',
      message: 'PR-2026-0105 from Engr. John Doe (2 items) requires your review.',
      timestamp: '2026-11-18 09:20',
      read: false,
      docType: 'PR',
      docId: 'pr-2',
      docNo: 'PR-2026-0105',
    },
    {
      id: 'notif-3',
      recipientRole: 'Applicant',
      title: 'PR Approved',
      message: 'PR-2026-0104 has been approved by Engr. Alex Smith and converted to PO-2026-0452.',
      timestamp: '2026-11-16 11:05',
      read: false,
      docType: 'PR',
      docId: 'pr-1',
      docNo: 'PR-2026-0104',
    },
  ];

  const initialLogs: ExtendedTransactionLog[] = deepClone(INITIAL_LOGS).map((l) => ({
    ...l,
    userRole:
      l.module === 'PR'
        ? 'Applicant/Requestor'
        : l.module === 'Receiving'
        ? 'Warehouse Manager'
        : 'Admin',
  }));

  return {
    projects: [
      {
        code: 'PROJ-TWRB',
        name: 'PROJ-TWRB (Tower B)',
        jobNo: 'JOB-2026-884',
        description: 'Chilled Water & Fire Protection Piping — Tower B',
      },
      {
        code: 'PROJ-CIVIL1',
        name: 'PROJ-CIVIL1 (Site Infra)',
        jobNo: 'PROJ-CIVIL1',
        description: 'Site Infrastructure, Drainage & Retaining Wall',
      },
    ],
    boqByProject: {
      'PROJ-TWRB': deepClone(INITIAL_BOQ_ITEMS),
      'PROJ-CIVIL1': deepClone(CIVIL_BOQ_ITEMS),
    },
    boqStatusByProject: {
      'PROJ-TWRB': 'Draft',
      'PROJ-CIVIL1': 'Posted',
    },
    pqtosByProject: {
      'PROJ-TWRB': deepClone(INITIAL_PQTOS),
      'PROJ-CIVIL1': deepClone(CIVIL_PQTOS),
    },
    prs: initialPrs,
    pos: deepClone(INITIAL_POS),
    receivings: deepClone(INITIAL_RECEIVINGS),
    stock: deepClone(INITIAL_STOCK),
    withdrawals: deepClone(INITIAL_WITHDRAWALS).map((w) => ({
      ...w,
      projectCode: 'PROJ-TWRB',
    })),
    transfers: deepClone(INITIAL_TRANSFERS),
    logs: initialLogs,
    notifications: initialNotifications,
    attachmentsIndex: {},
    config: deepClone(INITIAL_REQUIRED_CONFIG),
  };
}

class DataStore {
  private state: ErpDatabaseState;
  private mssqlAvailable = false;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    this.state = this.loadFromDisk();
  }

  private loadFromDisk(): ErpDatabaseState {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf8');
        const parsed = JSON.parse(raw) as ErpDatabaseState;
        if (parsed && parsed.boqByProject && parsed.prs) {
          return parsed;
        }
      }
    } catch {
      // Fall back to fresh seeded state if corrupted
    }
    const fresh = createInitialState();
    this.persist(fresh);
    return fresh;
  }

  private persist(stateToSave: ErpDatabaseState = this.state): void {
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(stateToSave, null, 2), 'utf8');
    } catch {
      // Ignore disk write errors in read-only environments
    }
  }

  getState(): ErpDatabaseState {
    return this.state;
  }

  save(): void {
    this.persist(this.state);
  }

  reset(): ErpDatabaseState {
    this.state = createInitialState();
    this.persist(this.state);
    return this.state;
  }

  async checkMssqlHealth(): Promise<{ connected: boolean; error?: string }> {
    if (!process.env.DB_PASSWORD && process.env.DB_MODE !== 'mssql') {
      this.mssqlAvailable = false;
      return {
        connected: false,
        error: 'MSSQL credentials not configured in server/.env; using persistent local store.',
      };
    }
    try {
      const pool = await getPool();
      await pool.request().query('SELECT 1 AS ok');
      this.mssqlAvailable = true;
      return { connected: true };
    } catch (err) {
      this.mssqlAvailable = false;
      return { connected: false, error: String(err) };
    }
  }

  isMssqlAvailable(): boolean {
    return this.mssqlAvailable;
  }
}

export const store = new DataStore();
