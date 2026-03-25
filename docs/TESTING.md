# Testing Guide

This guide details how to verify the **ZK Payroll** smart contract on the Aleo Testnet.

## Quick Test

Run the automated test suite to verify core functionality in one command:

```bash
chmod +x test.sh && ./test.sh
```

---

### 1. Initialize Payroll & Budget

**Purpose:** Set up a new payroll instance with a strict budget ceiling and multi-sig parameters.

**Command:**
```bash
leo execute initialize_payroll 1000u64 1field 1u64 <ADMIN1> <ADMIN2> <ADMIN3> <AUDITOR> --network testnet ...
```

**Outcome:**
- **On-chain State:** `payroll_budgets[1field] = 1000u64`
- **Private Records:** `SpentRecord` created (total_spent: 0)

---

### 2. Note on Manual Testing (v7)

**Purpose:** With the introduction of Multi-Sig in Wave 2 (v7), transitions like `issue_salary` and `create_recipient_ticket` require valid signature structs (`Signatures`) to execute. 

**Recommendation:** It is highly recommended to test the full lifecycle (Creating Tickets, Issuing Salaries, Claiming Salaries, and Batching) using the **Frontend Web Application** (`/web`), which automatically handles the complex cryptography and formatting required for the Aleo SDK. Manual CLI testing requires constructing valid offline signatures.

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
leo execute generate_audit_report "[SPENT_RECORD]" <TIMESTAMP> <PAY_PERIOD_HASH> <MERKLE_ROOT> --network testnet ...
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

---

## Wave 4.1 Tax Withholding (MVP)

### 6. Configure Tax Policy

**Purpose:** Configure global withholding policy per payroll before relayer claim processing.

**Command:**
```bash
leo execute set_tax_policy 1field 1000u16 <TAX_AUTHORITY_ADDRESS> --network testnet ...
```

**Outcome:**
- `tax_percentage_bps[1field] = 1000u16`
- `tax_authority[1field] = <TAX_AUTHORITY_ADDRESS>`

### 7. Process Taxed Claim

**Purpose:** Verify `claim_salary` splits gross payout into employee net + authority tax.

**Checks:**
- Employee receives `net_amount`.
- Tax authority receives `tax_amount`.
- Employee gets `TaxPaidProof`.
- Authority gets `TaxVaultRecord`.
- `tax_collected_total[1field]` increments.
