# Testing Guide

## Quick Test

```bash
cd zk_payroll
leo build
leo run initialize_payroll 1000u64 1field aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px
```

---

## Full Test Flow

### 1. Initialize Payroll

```bash
leo run initialize_payroll 1000u64 1field <AUDITOR_ADDRESS>
```

**Expected:** AdminCap + SpentRecord with `auditor` field, `total_spent: 0`

---

### 2. Create Recipient Ticket

```bash
leo run create_recipient_ticket "[ADMIN_CAP]" <RECIPIENT_ADDRESS>
```

**Expected:** New AdminCap + RecipientTicket

---

### 3. Issue Salary

```bash
leo run issue_salary "[ADMIN_CAP]" "[SPENT_RECORD]" "[TICKET]" 500u64 101field
```

**Expected:** 
- SpentRecord with `total_spent: 500`
- SalaryRecord with `amount: 500`
- Finalize args: `[1field, 500u64]`

---

### 4. Generate Audit Report

```bash
leo run generate_audit_report "[ADMIN_CAP]" "[SPENT_RECORD]" 1738181000u32
```

**Expected:** AuditReport with `owner: auditor`, `total_spent: 500`

---

### 5. Budget Enforcement Test

Attempt payment that exceeds budget:

```bash
leo run issue_salary ... 600u64 ...  # When already at 500/1000
```

**Expected:** Finalize args show `1100u64 > 1000` = rejected on-chain

---

## Test Results Summary

| Test | Status |
|------|--------|
| Build | ✅ 66 statements, 3.06 KB |
| Initialize | ✅ Auditor field present |
| Pay | ✅ SpentRecord updates |
| Audit | ✅ Report owned by auditor |
| Budget Limit | ✅ Finalize rejects over-budget |
