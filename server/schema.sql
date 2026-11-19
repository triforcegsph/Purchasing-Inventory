-- ============================================================================
-- Construction Material Control & Procurement — SQL Server (T-SQL) Schema
-- Run this script on your target SQL Server (MSSQL) database.
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'ConstructionMatFlow')
BEGIN
    CREATE DATABASE ConstructionMatFlow;
END
GO

USE ConstructionMatFlow;
GO

-- 1. BOQ Items
CREATE TABLE boq_items (
    id                  NVARCHAR(64) PRIMARY KEY,
    project_code        NVARCHAR(50) NOT NULL DEFAULT 'PROJ-TWRB',
    line_no             INT NOT NULL,
    item_code           NVARCHAR(100) NOT NULL DEFAULT '',
    description         NVARCHAR(500) NOT NULL DEFAULT '',
    boq_uom             NVARCHAR(20) NOT NULL DEFAULT '',
    boq_qty             DECIMAL(18, 4) NOT NULL DEFAULT 0,
    pqto_uom            NVARCHAR(20) NOT NULL DEFAULT '',
    pqto_qty            DECIMAL(18, 4) NOT NULL DEFAULT 0,
    assigned_location   NVARCHAR(200) NOT NULL DEFAULT '',
    cost_center         NVARCHAR(50) NULL,
    remarks             NVARCHAR(300) NULL,
    is_blank_row        BIT NOT NULL DEFAULT 0,
    is_works_related    BIT NOT NULL DEFAULT 0,
    is_legacy_fittings  BIT NOT NULL DEFAULT 0,
    is_itemized_fitting BIT NOT NULL DEFAULT 0,
    created_at          DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- 2. PQTO (Project Quantity Take-Off)
CREATE TABLE pqtos (
    id              NVARCHAR(64) PRIMARY KEY,
    pqto_no         NVARCHAR(50) NOT NULL UNIQUE,
    job_no          NVARCHAR(50) NOT NULL,
    project_title   NVARCHAR(300) NOT NULL,
    status          NVARCHAR(30) NOT NULL DEFAULT 'Draft',
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE pqto_items (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    pqto_id             NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES pqtos(id) ON DELETE CASCADE,
    boq_item_id         NVARCHAR(64) NOT NULL,
    item_code           NVARCHAR(100) NOT NULL,
    description         NVARCHAR(500) NOT NULL,
    boq_uom             NVARCHAR(20) NOT NULL,
    boq_qty             DECIMAL(18, 4) NOT NULL,
    pqto_uom            NVARCHAR(20) NOT NULL,
    pqto_qty            DECIMAL(18, 4) NOT NULL,
    pr_ordered_qty      DECIMAL(18, 4) NOT NULL DEFAULT 0,
    assigned_location   NVARCHAR(200) NOT NULL
);
GO

-- 3. PR (Purchase Requisition)
CREATE TABLE prs (
    id                      NVARCHAR(64) PRIMARY KEY,
    pr_no                   NVARCHAR(50) NOT NULL UNIQUE,
    pqto_no                 NVARCHAR(50) NOT NULL,
    ref_doc_no              NVARCHAR(100) NOT NULL DEFAULT '',
    job_no                  NVARCHAR(50) NOT NULL,
    applicant               NVARCHAR(150) NOT NULL,
    sp_name                 NVARCHAR(100) NULL,
    status                  NVARCHAR(40) NOT NULL DEFAULT 'Draft',
    requires_boq_approval   BIT NOT NULL DEFAULT 0,
    created_at              DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE pr_items (
    id                      NVARCHAR(64) PRIMARY KEY,
    pr_id                   NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES prs(id) ON DELETE CASCADE,
    item_code               NVARCHAR(100) NOT NULL,
    description             NVARCHAR(500) NOT NULL,
    uom                     NVARCHAR(20) NOT NULL,
    pqto_qty                DECIMAL(18, 4) NOT NULL DEFAULT 0,
    requested_qty           DECIMAL(18, 4) NOT NULL,
    assigned_location       NVARCHAR(200) NOT NULL,
    is_new_item             BIT NOT NULL DEFAULT 0,
    system_assigned_code    NVARCHAR(100) NULL
);
GO

-- 4. PO (Purchase Order)
CREATE TABLE pos (
    id                  NVARCHAR(64) PRIMARY KEY,
    po_no               NVARCHAR(50) NOT NULL UNIQUE,
    pr_no               NVARCHAR(50) NOT NULL,
    ref_doc_no          NVARCHAR(100) NOT NULL DEFAULT '',
    iaas2_ref_no        NVARCHAR(100) NOT NULL DEFAULT '',
    vendor              NVARCHAR(200) NOT NULL,
    applicant           NVARCHAR(150) NOT NULL,
    approver            NVARCHAR(150) NOT NULL,
    sp_name             NVARCHAR(100) NULL,
    status              NVARCHAR(40) NOT NULL DEFAULT 'Pending Approval',
    rejection_comments  NVARCHAR(500) NULL,
    created_at          DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE po_items (
    id                  NVARCHAR(64) PRIMARY KEY,
    po_id               NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES pos(id) ON DELETE CASCADE,
    item_code           NVARCHAR(100) NOT NULL,
    description         NVARCHAR(500) NOT NULL,
    uom                 NVARCHAR(20) NOT NULL,
    pr_qty              DECIMAL(18, 4) NOT NULL,
    po_qty              DECIMAL(18, 4) NOT NULL,
    received_qty        DECIMAL(18, 4) NOT NULL DEFAULT 0,
    unit_price          DECIMAL(18, 2) NOT NULL DEFAULT 0,
    assigned_location   NVARCHAR(200) NOT NULL
);
GO

-- 5. Receiving (Goods Receipt / DR)
CREATE TABLE receivings (
    id              NVARCHAR(64) PRIMARY KEY,
    grn_no          NVARCHAR(50) NOT NULL UNIQUE,
    po_no           NVARCHAR(50) NOT NULL,
    ref_doc_no      NVARCHAR(100) NOT NULL,
    iaas2_ref_no    NVARCHAR(100) NOT NULL,
    dr_no           NVARCHAR(100) NOT NULL,
    dr_date         DATE NOT NULL,
    performed_at    DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    sp_name         NVARCHAR(100) NULL,
    status          NVARCHAR(40) NOT NULL
);

CREATE TABLE receiving_items (
    id                      NVARCHAR(64) PRIMARY KEY,
    receiving_id            NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES receivings(id) ON DELETE CASCADE,
    item_code               NVARCHAR(100) NOT NULL,
    description             NVARCHAR(500) NOT NULL,
    uom                     NVARCHAR(20) NOT NULL,
    ordered_qty             DECIMAL(18, 4) NOT NULL,
    previously_received_qty DECIMAL(18, 4) NOT NULL,
    to_receive_qty          DECIMAL(18, 4) NOT NULL,
    actual_received_qty     DECIMAL(18, 4) NOT NULL
);
GO

-- 6. Warehouse Stock
CREATE TABLE warehouse_stock (
    id                  NVARCHAR(64) PRIMARY KEY,
    item_code           NVARCHAR(100) NOT NULL UNIQUE,
    description         NVARCHAR(500) NOT NULL,
    uom                 NVARCHAR(20) NOT NULL,
    system_tag          NVARCHAR(150) NOT NULL,
    assigned_location   NVARCHAR(200) NOT NULL,
    available_stock     DECIMAL(18, 4) NOT NULL DEFAULT 0,
    reserved_stock      DECIMAL(18, 4) NOT NULL DEFAULT 0
);
GO

-- 7. Withdrawals (Material Issuance)
CREATE TABLE withdrawals (
    id              NVARCHAR(64) PRIMARY KEY,
    wd_no           NVARCHAR(50) NOT NULL UNIQUE,
    system_tag      NVARCHAR(150) NOT NULL,
    job_no          NVARCHAR(50) NOT NULL,
    requested_by    NVARCHAR(150) NOT NULL,
    sp_name         NVARCHAR(100) NULL,
    performed_at    DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    status          NVARCHAR(40) NOT NULL
);

CREATE TABLE withdrawal_items (
    id                      INT IDENTITY(1,1) PRIMARY KEY,
    withdrawal_id           NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES withdrawals(id) ON DELETE CASCADE,
    item_code               NVARCHAR(100) NOT NULL,
    description             NVARCHAR(500) NOT NULL,
    uom                     NVARCHAR(20) NOT NULL,
    available_at_request    DECIMAL(18, 4) NOT NULL,
    requested_qty           DECIMAL(18, 4) NOT NULL,
    assigned_location       NVARCHAR(200) NOT NULL
);
GO

-- 8. Stock Transfers & Excess Returns
CREATE TABLE stock_transfers (
    id              NVARCHAR(64) PRIMARY KEY,
    transfer_no     NVARCHAR(50) NOT NULL UNIQUE,
    type            NVARCHAR(60) NOT NULL,
    from_location   NVARCHAR(200) NOT NULL,
    to_location     NVARCHAR(200) NOT NULL,
    item_code       NVARCHAR(100) NOT NULL,
    description     NVARCHAR(500) NOT NULL,
    qty             DECIMAL(18, 4) NOT NULL,
    uom             NVARCHAR(20) NOT NULL,
    reason          NVARCHAR(400) NOT NULL,
    performed_at    DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- 9. Attachments (PDF, JPG, PNG, XLSX)
CREATE TABLE attachments (
    id          NVARCHAR(64) PRIMARY KEY,
    doc_type    NVARCHAR(30) NOT NULL, -- 'PR', 'PO', 'RECEIVING', 'WITHDRAWAL'
    doc_id      NVARCHAR(64) NOT NULL,
    file_name   NVARCHAR(260) NOT NULL,
    file_type   NVARCHAR(20) NOT NULL,
    file_size   NVARCHAR(30) NOT NULL,
    uploaded_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- 10. Transaction Audit Logs
CREATE TABLE transaction_logs (
    id              NVARCHAR(64) PRIMARY KEY,
    timestamp       DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    admin_or_user   NVARCHAR(150) NOT NULL,
    sp_name         NVARCHAR(100) NOT NULL DEFAULT '',
    module          NVARCHAR(40) NOT NULL,
    doc_no          NVARCHAR(50) NOT NULL,
    action          NVARCHAR(100) NOT NULL,
    comments        NVARCHAR(500) NOT NULL DEFAULT ''
);
GO

-- 11. Notifications & System Field Rules
CREATE TABLE notifications (
    id              NVARCHAR(64) PRIMARY KEY,
    recipient_role  NVARCHAR(40) NOT NULL,
    title           NVARCHAR(200) NOT NULL,
    message         NVARCHAR(500) NOT NULL,
    timestamp       DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    is_read         BIT NOT NULL DEFAULT 0
);

CREATE TABLE system_config (
    config_key      NVARCHAR(64) PRIMARY KEY,
    config_value    BIT NOT NULL DEFAULT 1
);
GO
