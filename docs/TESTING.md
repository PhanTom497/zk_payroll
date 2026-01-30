# Testing Guide

This guide details how to verify the **ZK Payroll** smart contract on the Aleo Testnet.

## Quick Test

Run the automated test suite to verify core functionality in one command:

```bash
chmod +x test.sh && ./test.sh
```

---

## Full Verification Flow

### 1. Initialize Payroll & Budget

**Purpose:** Set up a new payroll instance with a strict budget ceiling.

**Command:**
```bash
leo execute initialize_payroll 1000u64 1field <AUDITOR_ADDRESS> --network testnet ...
```

**Outcome:**
- **On-chain State:** `payroll_budgets[1field] = 1000u64`
- **Private Records:** `AdminCap` and `SpentRecord` created (total_spent: 0)

---

### 2. Recipient Authentication

**Purpose:** Issue a private ticket to an employee so they can receive funds.

**Command:**
```bash
leo execute create_recipient_ticket "[ADMIN_CAP]" <EMPLOYEE_ADDRESS> --network testnet ...
```

**Outcome:**
- **Private Record:** `RecipientTicket` created, owned by the employee.

---

### 3. Salary Payment (Success Case)

**Purpose:** Pay an employee within the available budget.

**Scenario:** Budget: 1000, Current Spent: 0, Pay Amount: 500.

**Command:**
```bash
leo execute issue_salary "[ADMIN_CAP]" "[SPENT_RECORD]" "[TICKET]" 500u64 101field --network testnet ...
```

**Outcome:**
- **Transaction Status:** `Accepted` on-chain.
- **Private Records:**
  - `SpentRecord` updated: `total_spent = 500u64`
  - `SalaryRecord` created for employee: `amount = 500u64`

---

### 4. Over-Budget Rejection (Failure Case)

**Purpose:** Verify that payments exceeding the budget are rejected by the network.

**Scenario:** Budget: 1000, Current Spent: 500, Pay Amount: 600.
**Total:** 500 + 600 = 1100 > 1000.

**Command:**
```bash
leo execute issue_salary ... 600u64 ...
```

**Outcome:**
- **Transaction Status:** `Rejected` on-chain.
- **Reason:** `finalize` assertion failed: `1100u64 <= 1000u64` is false.

---

### 5. Audit Report Generation

**Purpose:** Prove total spending to an auditor without revealing individual salaries.

**Command:**
```bash
leo execute generate_audit_report "[ADMIN_CAP]" "[SPENT_RECORD]" <TIMESTAMP> --network testnet ...
```

**Outcome:**
- **Private Record:** `AuditReport` created, owned by the auditor.
- **Content:** Contains `total_spent` and can be decrypted only by the auditor.

---

## Test Results Summary

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| **Deployment** | Contract deployed to testnet | ✅ PASS |
| **Initialize** | Budget mapping set on-chain | ✅ PASS |
| **Ticket Creation** | Recipient receives ticket | ✅ PASS |
| **Valid Payment** | Salary issued, spent updated | ✅ PASS |
| **Invalid Payment** | Transaction rejected | ✅ PASS |
| **Audit Report** | Auditor receives report | ✅ PASS |
