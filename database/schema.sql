-- ============================================================================
-- Construction Purchasing & Inventory ERP — SQL Database Schema (PostgreSQL)
-- ============================================================================
-- Covers: Projects, Users/Groups, BOQ, PQTO, PR, Vendors & RFQ, PO,
--         Receiving (GRN/DR), AP Invoices (3-Way Match), Warehouse Stock,
--         Withdrawals, Transfers, Stock Adjustments, Stock Ledger, Audit Logs
-- ============================================================================

CREATE TABLE projects (
  code              VARCHAR(32) PRIMARY KEY,
  name              VARCHAR(160) NOT NULL,
  default_job_no    VARCHAR(64) NOT NULL,
  status            VARCHAR(24) NOT NULL DEFAULT 'Active',
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_groups (
  id                VARCHAR(64) PRIMARY KEY,
  code              VARCHAR(32) NOT NULL UNIQUE,
  name              VARCHAR(120) NOT NULL,
  description       TEXT,
  allowed_modules   JSONB NOT NULL DEFAULT '[]'::jsonb,
  permissions       JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE users (
  id                    VARCHAR(64) PRIMARY KEY,
  username              VARCHAR(120) NOT NULL UNIQUE,
  password_hash         VARCHAR(255) NOT NULL,
  full_name             VARCHAR(120) NOT NULL,
  role                  VARCHAR(48) NOT NULL,
  department            VARCHAR(80) NOT NULL,
  group_id              VARCHAR(64) REFERENCES user_groups(id),
  business_unit_access  VARCHAR(32) NOT NULL DEFAULT 'ALL',
  status                VARCHAR(24) NOT NULL DEFAULT 'Active',
  max_pending_requests  INT NOT NULL DEFAULT 3,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vendors (
  id                VARCHAR(64) PRIMARY KEY,
  vendor_code       VARCHAR(32) NOT NULL UNIQUE,
  name              VARCHAR(160) NOT NULL,
  tin               VARCHAR(48) NOT NULL,
  category          VARCHAR(80) NOT NULL,
  contact_person    VARCHAR(120),
  email             VARCHAR(160),
  phone             VARCHAR(48),
  payment_terms     VARCHAR(32) NOT NULL DEFAULT 'Net 30',
  status            VARCHAR(24) NOT NULL DEFAULT 'Active',
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE boq_items (
  id                      VARCHAR(64) PRIMARY KEY,
  project_code            VARCHAR(32) NOT NULL REFERENCES projects(code),
  line_no                 INT NOT NULL,
  item_code               VARCHAR(64),
  description             TEXT NOT NULL,
  boq_uom                 VARCHAR(24) NOT NULL,
  boq_qty                 NUMERIC(14, 3) NOT NULL DEFAULT 0,
  pqto_uom                VARCHAR(24) NOT NULL,
  pqto_qty                NUMERIC(14, 3) NOT NULL DEFAULT 0,
  assigned_location       VARCHAR(160),
  cost_center             VARCHAR(48),
  remarks                 TEXT,
  is_blank_row            BOOLEAN NOT NULL DEFAULT FALSE,
  is_works_related        BOOLEAN NOT NULL DEFAULT FALSE,
  is_legacy_fittings_row  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE pqtos (
  id                VARCHAR(64) PRIMARY KEY,
  pqto_no           VARCHAR(48) NOT NULL UNIQUE,
  project_code      VARCHAR(32) NOT NULL REFERENCES projects(code),
  project_title     VARCHAR(160) NOT NULL,
  job_no            VARCHAR(64) NOT NULL,
  status            VARCHAR(24) NOT NULL DEFAULT 'Draft',
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pqto_items (
  id                SERIAL PRIMARY KEY,
  pqto_id           VARCHAR(64) NOT NULL REFERENCES pqtos(id) ON DELETE CASCADE,
  boq_item_id       VARCHAR(64) REFERENCES boq_items(id),
  item_code         VARCHAR(64) NOT NULL,
  description       TEXT NOT NULL,
  boq_uom           VARCHAR(24) NOT NULL,
  boq_qty           NUMERIC(14, 3) NOT NULL DEFAULT 0,
  pqto_uom          VARCHAR(24) NOT NULL,
  pqto_qty          NUMERIC(14, 3) NOT NULL DEFAULT 0,
  pr_ordered_qty    NUMERIC(14, 3) NOT NULL DEFAULT 0,
  assigned_location VARCHAR(160) NOT NULL
);

CREATE TABLE purchase_requisitions (
  id                    VARCHAR(64) PRIMARY KEY,
  pr_no                 VARCHAR(48) NOT NULL UNIQUE,
  pqto_no               VARCHAR(48) REFERENCES pqtos(pqto_no),
  ref_doc_no            VARCHAR(64) NOT NULL UNIQUE,
  job_no                VARCHAR(64) NOT NULL,
  applicant             VARCHAR(120) NOT NULL,
  sp_name               VARCHAR(64),
  status                VARCHAR(32) NOT NULL DEFAULT 'Pending Approval',
  requires_boq_approval BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pr_items (
  id                    VARCHAR(64) PRIMARY KEY,
  pr_id                 VARCHAR(64) NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
  item_code             VARCHAR(64) NOT NULL,
  description           TEXT NOT NULL,
  uom                   VARCHAR(24) NOT NULL,
  pqto_qty              NUMERIC(14, 3) NOT NULL DEFAULT 0,
  requested_qty         NUMERIC(14, 3) NOT NULL,
  assigned_location     VARCHAR(160) NOT NULL,
  is_new_item           BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE rfqs (
  id                VARCHAR(64) PRIMARY KEY,
  rfq_no            VARCHAR(48) NOT NULL UNIQUE,
  pr_no             VARCHAR(48) NOT NULL REFERENCES purchase_requisitions(pr_no),
  title             VARCHAR(200) NOT NULL,
  due_date          DATE NOT NULL,
  status            VARCHAR(32) NOT NULL DEFAULT 'Open',
  awarded_vendor_id VARCHAR(64) REFERENCES vendors(id),
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rfq_quotes (
  id                  VARCHAR(64) PRIMARY KEY,
  rfq_id              VARCHAR(64) NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  vendor_id           VARCHAR(64) NOT NULL REFERENCES vendors(id),
  unit_price_avg      NUMERIC(14, 2) NOT NULL,
  total_quoted_amount NUMERIC(14, 2) NOT NULL,
  lead_time_days      INT NOT NULL DEFAULT 7,
  payment_terms       VARCHAR(32) NOT NULL,
  notes               TEXT
);

CREATE TABLE purchase_orders (
  id                  VARCHAR(64) PRIMARY KEY,
  po_no               VARCHAR(48) NOT NULL UNIQUE,
  pr_no               VARCHAR(48) NOT NULL REFERENCES purchase_requisitions(pr_no),
  vendor_id           VARCHAR(64) REFERENCES vendors(id),
  vendor_name         VARCHAR(160) NOT NULL,
  ref_doc_no          VARCHAR(64) NOT NULL,
  iaas2_ref_no        VARCHAR(64) NOT NULL,
  applicant           VARCHAR(120) NOT NULL,
  approver            VARCHAR(120),
  sp_name             VARCHAR(64),
  vat_rate            NUMERIC(5, 2) NOT NULL DEFAULT 12.00,
  payment_terms       VARCHAR(32) NOT NULL DEFAULT 'Net 30',
  status              VARCHAR(32) NOT NULL DEFAULT 'Pending Approval',
  rejection_comments  TEXT,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE po_items (
  id                VARCHAR(64) PRIMARY KEY,
  po_id             VARCHAR(64) NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_code         VARCHAR(64) NOT NULL,
  description       TEXT NOT NULL,
  uom               VARCHAR(24) NOT NULL,
  pr_qty            NUMERIC(14, 3) NOT NULL,
  po_qty            NUMERIC(14, 3) NOT NULL,
  received_qty      NUMERIC(14, 3) NOT NULL DEFAULT 0,
  unit_price        NUMERIC(14, 2) NOT NULL,
  assigned_location VARCHAR(160) NOT NULL
);

CREATE TABLE receivings (
  id                VARCHAR(64) PRIMARY KEY,
  grn_no            VARCHAR(48) NOT NULL UNIQUE,
  po_no             VARCHAR(48) NOT NULL REFERENCES purchase_orders(po_no),
  ref_doc_no        VARCHAR(64) NOT NULL,
  iaas2_ref_no      VARCHAR(64) NOT NULL,
  dr_no             VARCHAR(64) NOT NULL,
  dr_date           DATE NOT NULL,
  sp_name           VARCHAR(64),
  status            VARCHAR(32) NOT NULL,
  performed_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE receiving_items (
  id                      VARCHAR(64) PRIMARY KEY,
  receiving_id            VARCHAR(64) NOT NULL REFERENCES receivings(id) ON DELETE CASCADE,
  item_code               VARCHAR(64) NOT NULL,
  description             TEXT NOT NULL,
  uom                     VARCHAR(24) NOT NULL,
  ordered_qty             NUMERIC(14, 3) NOT NULL,
  previously_received_qty NUMERIC(14, 3) NOT NULL DEFAULT 0,
  to_receive_qty          NUMERIC(14, 3) NOT NULL,
  actual_received_qty     NUMERIC(14, 3) NOT NULL
);

CREATE TABLE invoices (
  id                  VARCHAR(64) PRIMARY KEY,
  invoice_no          VARCHAR(48) NOT NULL UNIQUE,
  vendor_invoice_ref  VARCHAR(64) NOT NULL,
  po_no               VARCHAR(48) NOT NULL REFERENCES purchase_orders(po_no),
  grn_no              VARCHAR(48) REFERENCES receivings(grn_no),
  vendor_name         VARCHAR(160) NOT NULL,
  invoice_date        DATE NOT NULL,
  due_date            DATE NOT NULL,
  subtotal            NUMERIC(14, 2) NOT NULL,
  vat_rate            NUMERIC(5, 2) NOT NULL DEFAULT 12.00,
  vat_amount          NUMERIC(14, 2) NOT NULL,
  withholding_tax     NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_payable       NUMERIC(14, 2) NOT NULL,
  invoiced_qty        NUMERIC(14, 3) NOT NULL,
  po_qty              NUMERIC(14, 3) NOT NULL,
  grn_qty             NUMERIC(14, 3) NOT NULL DEFAULT 0,
  match_status        VARCHAR(32) NOT NULL,
  payment_status      VARCHAR(32) NOT NULL DEFAULT 'Unpaid',
  remarks             TEXT,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE warehouse_stock (
  id                VARCHAR(64) PRIMARY KEY,
  item_code         VARCHAR(64) NOT NULL,
  description       TEXT NOT NULL,
  uom               VARCHAR(24) NOT NULL,
  system_tag        VARCHAR(64) NOT NULL,
  assigned_location VARCHAR(160) NOT NULL,
  available_stock   NUMERIC(14, 3) NOT NULL DEFAULT 0,
  reserved_stock    NUMERIC(14, 3) NOT NULL DEFAULT 0,
  reorder_point     NUMERIC(14, 3) NOT NULL DEFAULT 5,
  UNIQUE (item_code, assigned_location)
);

CREATE TABLE withdrawals (
  id                VARCHAR(64) PRIMARY KEY,
  wd_no             VARCHAR(48) NOT NULL UNIQUE,
  system_tag        VARCHAR(64) NOT NULL,
  job_no            VARCHAR(64) NOT NULL,
  requested_by      VARCHAR(120) NOT NULL,
  sp_name           VARCHAR(64),
  status            VARCHAR(24) NOT NULL,
  performed_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_transfers (
  id                VARCHAR(64) PRIMARY KEY,
  transfer_no       VARCHAR(48) NOT NULL UNIQUE,
  type              VARCHAR(48) NOT NULL,
  from_location     VARCHAR(160) NOT NULL,
  to_location       VARCHAR(160) NOT NULL,
  item_code         VARCHAR(64) NOT NULL,
  description       TEXT NOT NULL,
  qty               NUMERIC(14, 3) NOT NULL,
  uom               VARCHAR(24) NOT NULL,
  reason            TEXT,
  performed_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_adjustments (
  id                VARCHAR(64) PRIMARY KEY,
  adj_no            VARCHAR(48) NOT NULL UNIQUE,
  item_code         VARCHAR(64) NOT NULL,
  description       TEXT NOT NULL,
  assigned_location VARCHAR(160) NOT NULL,
  qty_delta         NUMERIC(14, 3) NOT NULL,
  uom               VARCHAR(24) NOT NULL,
  reason            VARCHAR(48) NOT NULL,
  performed_by      VARCHAR(120) NOT NULL,
  performed_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_ledger (
  id                BIGSERIAL PRIMARY KEY,
  item_code         VARCHAR(64) NOT NULL,
  assigned_location VARCHAR(160) NOT NULL,
  txn_type          VARCHAR(32) NOT NULL, -- 'GRN' | 'WD' | 'TRANSFER' | 'ADJUSTMENT'
  doc_no            VARCHAR(48) NOT NULL,
  qty_change        NUMERIC(14, 3) NOT NULL,
  running_balance   NUMERIC(14, 3) NOT NULL,
  performed_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transaction_logs (
  id                VARCHAR(64) PRIMARY KEY,
  timestamp         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  admin_or_user     VARCHAR(120) NOT NULL,
  sp_name           VARCHAR(64),
  module            VARCHAR(32) NOT NULL,
  doc_no            VARCHAR(64) NOT NULL,
  action            VARCHAR(120) NOT NULL,
  comments          TEXT
);

CREATE INDEX idx_pr_status ON purchase_requisitions(status);
CREATE INDEX idx_po_pr_no ON purchase_orders(pr_no);
CREATE INDEX idx_rcv_po_no ON receivings(po_no);
CREATE INDEX idx_inv_po_no ON invoices(po_no);
CREATE INDEX idx_stock_ledger_item ON stock_ledger(item_code, performed_at);
CREATE INDEX idx_logs_doc_no ON transaction_logs(doc_no);

