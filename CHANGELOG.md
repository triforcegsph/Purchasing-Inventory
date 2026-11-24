# Update Logs — Purchasing & Inventory System

## 2026-11-24
- **Summary Report Access (User, Purchasing & Warehousing)**:
  - Added **Summary Report** export/print modal to **Purchase Requisitions (`PR`)** ([PrModule.tsx](src/components/PrModule.tsx)), **My Requests** ([MyRequestsModal.tsx](src/components/MyRequestsModal.tsx)), and **Inventory Stock** ([TransfersAndSettingsModule.tsx](src/components/TransfersAndSettingsModule.tsx)) — complementing existing Summary Reports in `PO`, `RCV`, and `WD`.
- **Requestor Account Isolation & Pending Limit** (`9aff36c`):
  - Restricted `Applicant/Requestor` accounts (`Engr. John Doe`, `Engr. Maria Santos`, `Engr. Carlos Reyes`) to view only their own requests across `My Requests`, `PR`, `PO`, `WD`, and `TRK`.
  - Enforced a **maximum of 3 `Pending Approval` requests** per requestor (with a live `Pending: X / 3` badge and submit block in `NewRequestModal` and `PrModule`).
- **Scenarios & Upload Templates** (`4300a6e`):
  - Added `SCENARIOS.md` and updated CSV/Excel upload templates.

## 2026-11-23
- **Excel (`.xlsx` / `.xls`) & CSV Upload Support** (`d82b72b`, `f6b5014`):
  - Added `src/utils/excelUpload.ts` using SheetJS (`xlsx`) to import `.xlsx`, `.xls`, and `.csv` in both **BOQ** and **Inventory Stock**, including SunSystems `Item Upload.xlsx` templates with headers on Row 8.
  - Added sample CSV templates in `public/templates/boq-upload-template.csv` and `public/templates/inventory-upload-template.csv`.

## 2026-11-20
- **Catalog Item Dropdown & Inventory Item Input** (`5616e98`, `80b69d7`):
  - Updated `PR` **Catalog Item** dropdown to show both `PQTO Rem` and `Whse` stock.
  - Made the **New Inventory Item** input form visible by default on `Inventory Stock` with bulk CSV upload.

## 2026-11-19
- **Cost & Completion Pie Charts** (`025659c`):
  - Renamed dashboard to **Project Cost & Completion Overview** and added **Material Completion (Units)** and **Budget Spend Breakdown (PHP)** pie charts.
- **Role Separation & UI Cleanup** (`f1cd7f4`, `f923308`, `38c15b0`, `0d93771`, `117505d`):
  - Added separate **`Admin`** account (`admin@triforcegs.com.ph`), distinct from **`Warehouse Manager`** and **`Purchaser`**.
  - Scoped **`Purchaser`** to Purchasing + `INV — Inventory & Cost` (without SMTP/Rules/Transfer clutter) and added 4 clean tabs to `Transfers & Rules`.
  - Added plain-English quick guides to every module and restored the grouped sidebar layout.
- **Excel-Aligned Module Naming** (`f97c008`, `6bf64ec`):
  - Aligned module codes to `PR`, `PO`, `RCV`, `WD`, `OTH` (keeping legacy aliases `PRQ`, `POE`, `GRN`, `ISS`, `STR` working in the quick-jump search bar).
- **Additional Accounts & Branding Removal** (`06d772c`, `9b13728`, `26ac502`):
  - Added `applicant2@triforcegs.com.ph` (`Engr. Maria Santos`) and `applicant3@triforcegs.com.ph` (`Engr. Carlos Reyes`).
  - Removed `Triforce Global Solutions` / `TRIFORCEGS` display branding, keeping **Purchasing & Inventory System**.
  - Fixed PQTO remaining quantity validation and added inline `Validation` column in `NewRequestModal`.
