# ZK Payroll - Wave-2 Submission

## Problem Statement

**Public blockchains expose all transaction data.** For DAO payroll, this means:
- Competitor DAOs see your compensation structure
- Contributors' salaries become publicly searchable
- Payment timing reveals organizational cash flow

## Solution

**Privacy-preserving payroll on Aleo** using:
- 🔐 Encrypted salary records (only recipient decrypts)
- ⚡ ZK budget enforcement (sum ≤ limit, amounts hidden)
- 🛡️ 4 security hardening measures
- 📋 **WAVE-2: Selective disclosure for auditors**

## Live Demo

Open `demo/index.html` in any browser. No installation required.

## Technical Implementation

| Component | Description |
|-----------|-------------|
| [main.leo](src/main.leo) | Core contract (230 lines) |
| 5 Records | AdminCap, SpentRecord, RecipientTicket, SalaryRecord, **AuditReport** |
| 4 Transitions | initialize, create_ticket, issue_salary, **generate_audit_report** |
| 1 Mapping | payroll_budgets (public) |

## Wave-2: Selective Disclosure

**New Feature:** DAO admin can "push" a private spending summary to an auditor.

| What Auditor Sees | What Remains Hidden |
|-------------------|---------------------|
| total_spent (private to auditor) | Individual salaries |
| payroll_id | Recipient addresses |
| timestamp | Payment timing |

```
generate_audit_report(admin_cap, spent_record, timestamp)
  → Returns: AuditReport owned by auditor
```

## Security Fixes

| # | Attack | Mitigation |
|---|--------|------------|
| 1 | Fake budget input | Read from on-chain mapping |
| 2 | Stolen AdminCap | self.caller == owner check |
| 3 | Address leakage | RecipientTicket pattern |
| 4 | Cross-payroll replay | Payroll ID consistency |

## Build

```bash
cd zk_payroll
leo build
```

## Privacy Comparison

| Data | Ethereum | Aleo ZK Payroll |
|------|----------|-----------------|
| Salaries | 🔴 Public | 🟢 Encrypted |
| Recipients | 🔴 Public | 🟢 Hidden |
| Budget | 🔴 Public | 🟢 Public (required) |
| Audit | 🔴 Public | 🟢 Selective (Wave-2) |

## Roadmap

- ✅ Wave-1: Core ZK payroll
- ✅ Wave-2: Selective disclosure for auditors
- Wave-3: Multi-sig admin
- Wave-4: Recurring payments

---

**Built for Aleo Privacy Buildathon 2025**
