# TRIFORCEGS Purchasing & Inventory System — Demo Scenarios

## Test Accounts

| Email | Password | Role |
|---|---|---|
| applicant@triforcegs.com.ph | 1234 | Applicant/Requestor |
| req.approver@triforcegs.com.ph | 1234 | REQ Approver |
| po.approver@triforcegs.com.ph | 1234 | PO Approver |
| warehouse@triforcegs.com.ph | 1234 | Warehouse Manager |
| purchaser@triforcegs.com.ph | 1234 | Purchaser |
| admin@triforcegs.com.ph | 1234 | Admin |

---

## SCENARIO 1 — Full Procurement Cycle (End-to-End)

**What this tests:** The complete workflow from planning to material issuance.

### Step-by-Step

1. **Login as Applicant** (`applicant@triforcegs.com.ph`)
2. Go to **BOQ** — review the existing Bill of Quantities
3. Click **Post to PQTO** — this creates the project budget
4. Go to **PR (Purchase Requisition)** — click **New Request**
5. Pick items from the PQTO picker dropdown, set quantities, fill in Ref Doc No.
6. Click **Submit PR** — status becomes *Pending Approval*
7. **Logout → Login as REQ Approver** (`req.approver@triforcegs.com.ph`)
8. Go to **PR** — find the submitted PR, click **Approve**
9. Go to **PO** — a draft PO is now created from the approved PR
10. Fill in supplier name, unit prices, IAAS2 Ref No. — click **Submit PO**
11. **Logout → Login as PO Approver** (`po.approver@triforcegs.com.ph`)
12. Go to **PO** — find the submitted PO, click **Approve**
13. **Logout → Login as Warehouse Manager** (`warehouse@triforcegs.com.ph`)
14. Go to **Receiving (DR)** — find the approved PO, fill in DR No. and received quantities
15. Click **Post GRN** — stock levels increase
16. Go to **Withdrawal** — find a pending withdrawal, click **Issue Materials**
17. Check **Tracking** to see the full 6-step pipeline completed

**Expected Result:** Tracking shows all 6 steps done ✅

---

## SCENARIO 2 — PR Rejected and Resubmitted

**What this tests:** Approval rejection flow and correction process.

### Step-by-Step

1. **Login as Applicant** — go to **PR**, create and submit a new PR
2. **Logout → Login as REQ Approver**
3. Go to **PR** — find the PR, click **Reject** — enter a rejection reason
4. **Logout → Login as Applicant**
5. Go to **PR** — the PR status shows *Returned to Applicant*
6. Edit the PR (fix the quantities or items), re-submit
7. **Logout → Login as REQ Approver**
8. Go to **PR** — approve the corrected PR

**Expected Result:** PR moves from Returned → Pending → Approved ✅

---

## SCENARIO 3 — Partial Delivery (2 Shipments)

**What this tests:** A PO received in two separate GRN deliveries.

### Step-by-Step

1. Follow Scenario 1 steps 1–12 (get a PO to Approved status)
2. **Login as Warehouse Manager**
3. Go to **Receiving** — post the first GRN with only partial quantities (e.g., 50%)
4. Post a second GRN for the remaining quantity against the same PO
5. Check **Tracking** — the delivery step should show both GRNs linked

**Expected Result:** Two GRN receipts linked to one PO, tracking shows delivery complete ✅

---

## SCENARIO 4 — Withdrawal Blocked by Low Stock

**What this tests:** The system warns or blocks when warehouse stock is insufficient.

### Step-by-Step

1. **Login as Applicant** — go to **Withdrawal (ISS)**
2. Create a new withdrawal request for an item with low available stock
3. Request more units than what is available in the warehouse
4. Try to submit

**Expected Result:** System shows a warning or blocks the request with a stock message ✅

---

## SCENARIO 5 — Excess Return to Warehouse

**What this tests:** Materials returned from site back to warehouse increases stock.

### Step-by-Step

1. **Login as Warehouse Manager**
2. Note the current available stock of any item (e.g., check Transfers & Rules → Inventory Inspector)
3. Go to **Transfers & Rules** — select *Excess Return to Warehouse* as the type
4. Pick an item, enter a return quantity, click **Post Transfer**
5. Go back to Inventory Inspector — check the same item

**Expected Result:** Available stock increases by the returned quantity ✅

---

## SCENARIO 6 — Purchaser Adds an Item to Inventory

**What this tests:** Purchaser role can add new stock items directly.

### Step-by-Step

1. **Login as Purchaser** (`purchaser@triforcegs.com.ph`)
2. Go to **Transfers & Rules**
3. Scroll to **Inventory Master Inspection** section
4. Click **Add Item to Inventory** (blue button)
5. Fill in: Item Code (e.g., `MAT-VLV-NEW-01`), Description, UOM, System Tag, Location, Opening Stock quantity
6. Click **Add to Inventory**

**Expected Result:** New item appears immediately in the stock table ✅

---

## SCENARIO 7 — BOQ CSV Import

**What this tests:** Bulk-loading materials into the BOQ from a CSV file.

### Step-by-Step

1. **Login as REQ Approver or Purchaser** (Applicant cannot edit BOQ)
2. Go to **BOQ**
3. Click **Download CSV Template** — open the downloaded file
4. Fill in your materials list in the same format:
   ```
   itemCode,description,boqUom,boqQty,pqtoUom,pqtoQty,assignedLocation,costCenter,remarks
   MAT-VLV-01,"Gate Valve, Flanged PN16 - 100mm",PC/s,4,PC/s,4,Zone A - Pump Room,CC-MECH-01,
   MAT-PIP-02,Carbon Steel Pipe Sch-40 - 100mm,m,50,m,50,Zone B - Riser Shaft,,
   ```
5. Save as CSV, then click **Upload CSV** and select your file
6. Items appear in the BOQ grid — edit any values inline
7. Click **Post to PQTO** — items are now available in the PR picker

**Expected Result:** Uploaded items show in BOQ grid and appear in PR item picker after posting ✅

---

## SCENARIO 8 — Draft PR (Save and Submit Later)

**What this tests:** Applicant saves a PR as draft, finishes it later.

### Step-by-Step

1. **Login as Applicant**
2. Go to **PR** — click **New Request**
3. Fill in partial details (no need to complete everything)
4. Click **Save as Draft** instead of Submit
5. Close the form — PR appears in the list with status *Draft*
6. **Logout and log back in as Applicant**
7. Find the Draft PR — open and complete the remaining fields
8. Click **Submit PR**
9. **Logout → Login as REQ Approver** — the PR is now visible in the approval queue

**Expected Result:** Draft is preserved after logout, submission triggers the approval workflow ✅

---

## Role Permissions Quick Reference

| Feature | Applicant | REQ Approver | PO Approver | Warehouse Mgr | Purchaser | Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| View BOQ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Edit BOQ / Add Items | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Upload CSV to BOQ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Post BOQ to PQTO | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Submit PR | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Approve PR | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Approve PO | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Post GRN (Receive) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Issue Materials (ISS) | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Add Item to Inventory | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Stock Transfers | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| View Tracking | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Transaction Logs | Own modules | Own modules | Own modules | Own modules | Own modules | All |
