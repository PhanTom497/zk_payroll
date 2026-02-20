# 🔐 ZK Payroll

**Privacy-Preserving DAO Payments on Aleo**

> **ZK Payroll solves the "Compliance-Privacy Paradox" by enabling DAO administrators to prove budget solvency to auditors without ever revealing individual contributor data.**
> **Built on Aleo for total privacy, public verifiability, and Multi-Sig enterprise security.**

[![Aleo](https://img.shields.io/badge/Built%20on-Aleo-blue)](https://aleo.org)
[![Leo](https://img.shields.io/badge/Language-Leo-purple)](https://leo-lang.org)
[![Version](https://img.shields.io/badge/Version-v7-success)](https://aleo.org)

---

## 🎯 Problem

Public blockchains expose all transaction data. For DAO payroll:
- 💸 Competitors see your compensation structure
- 👀 Salaries become publicly searchable  
- 📊 Payment timing reveals cash flow

## 💡 Solution

ZK Payroll uses Aleo's zero-knowledge proofs to enable **private salaries with public budget enforcement**, ensuring both contributor privacy and organizational transparency.

---

## ⛓️ On-Chain Verification

**Live Aleo Testnet Proofs** (Judges check here):

| Type | Transaction ID | Status |
|------|----------------|--------|
| **Deployment** | [`at1swvsjd...`](https://testnet.explorer.provable.com/transaction/at1swvsjd7weuku62jhgpaya3twlwtqalq65wg7zlfy9y9t4uqpsugqpn3kmg) | ✅ Accepted |
| **Execution** | [`at1qengyj...`](https://testnet.explorer.provable.com/transaction/at1qengyjkrdlkrtqdvljr9hl7a6qu8uzaa0yxkmljh6zqwhf9zuyxs3jwg74) | ✅ Accepted |

### Deployment Proof
![Deployment Proof](assets/deploy_proof.png)

### Execution Proof
![Execution Proof](assets/execution_proof.png)

---

## 👁️ Privacy Meter: Who Sees What?

| Data | 🌐 Public Observer | 📋 Auditor | 🔐 Admin |
|------|:------------------:|:----------:|:--------:|
| Budget Ceiling | ✅ Visible | ✅ Visible | ✅ Visible* |
| Total Spent | ❌ Hidden | ✅ Verified | ✅ Visible* |
| Individual Salaries | ❌ Hidden | ❌ Hidden | ✅ Visible* |
| Recipient Addresses | ❌ Hidden | ❌ Hidden | ✅ Visible* |
| Payment Timing | ❌ Hidden | ❌ Hidden | ✅ Visible* |
| Budget Compliance | ✅ ZK-Proven | ✅ ZK-Proven | ✅ ZK-Proven |

> * *Admin visibility is limited to local decryption history. Push payments update the admin's tracking record directly. Pull payments (Employee Claims) protect employee privacy entirely.*

> **Key Insight**: Auditors verify totals without seeing individual salaries. Public observers only see the budget limit and ZK proof validity.

---

## 🖼️ Auditor Portal Demo

![Auditor Portal - Decrypted Report](docs/screenshots/auditor-portal.png)

*The Auditor Portal shows how compliance officers receive verified spending totals via selective disclosure—without seeing individual employee salaries.*

---

## 🔄 Architecture Models: Push vs. Pull

ZK Payroll supports two distinct payment mechanisms natively to cater to different operational and privacy needs:

### 1. Push Model (Direct Issue & Audit)
**Best for**: Contractors, one-off payments, and strict real-time audit compliance.
- 🧑‍💼 **Admin** authorizes and funds the paycheck directly via `issue_salary` with M-of-N Multisig authorization.
- 📊 **Tracking**: The Admin's private `SpentRecord` is synchronously updated.
- 📋 **Auditor**: Compliance reports instantly reflect the new expenditure, ensuring tightly-coupled organizational accounting.

### 2. Pull Model (Automated Claiming)
**Best for**: Core team, recurring salaries, and ultimate employee privacy.
- 🧑‍💼 **Admin** issues an organizational limit (`SalaryCertificate`) via `issue_limit`. The total budget is reserved.
- 👷 **Employee** periodically claims their salary autonomously via `claim_salary` using their `SalaryCertificate`.
- 🔐 **Privacy Boundary**: Because the Employee generates the ZK Proof, they cannot modify the Admin's private `SpentRecord`. This creates an airgap: the organization knows the budget is reserved, but the exact timing and execution of the claim remain entirely private to the employee.

```mermaid
flowchart TD
    A[🔐 Admin (Multi-Sig)] -->|Push: issue_salary| B[📦 SalaryRecord to Employee]
    A -->|Push: issue_salary| C[📊 Updates Admin's SpentRecord]
    
    A -->|Pull: issue_limit| D[📜 SalaryCertificate to Employee]
    D -->|Pull: claim_salary| E[👷 Employee Self-Claims]
    E -->|Generates| F[📦 SalaryRecord]
```

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/PhanTom497/zk_payroll.git
cd zk_payroll

# Build
leo build

# Run demo
leo run initialize_payroll 1000u64 1field <AUDITOR_ADDRESS>
```

### One-Command Verify

```bash
# Run the full test suite
chmod +x test.sh && ./test.sh
```

---


## 💻 Frontend (Web App)

A production-grade Next.js application is located in the `web/` directory.

### Quick Start
1.  `cd web`
2.  `npm install`
3.  `npm run dev`

### Features:
*   **Admin Dashboard**: Manage payroll, issuance, and multi-sig operations. Includes **Batch Processing** (Legacy and Privacy-Preserving combinations).
*   **Employee Portal**: View rights (Salary Certificates) and independently claim paychecks. Deduplication built-in.
*   **Auditor Portal**: Decrypt `AuditReports` and view verified solvency proofs.
*   **Wallet Integration**: Connects seamlessly with Leo Wallet.

## 📁 Project Structure

```
zk_payroll/
├── [src/main.leo](./src/main.leo)   # Core contract (66 statements)
├── web/                   # Next.js dApp (React + Wallet Adapter)
├── demo/                  # Legacy static demo

│   ├── index.html
│   ├── style.css
│   └── demo.js
├── docs/
│   ├── ARCHITECTURE.md   # Technical deep-dive
│   ├── TESTING.md        # Test commands
│   └── screenshots/      # Demo screenshots
├── test.sh               # One-command verify
└── README.md
```

---

## 🛡️ Security Model

| Attack Vector | Mitigation |
|---------------|------------|
| Fake budget input | Read from on-chain mapping |
| Stolen AdminCap | `self.caller == owner` check |
| Address leakage | RecipientTicket pattern |
| Cross-payroll replay | Payroll ID consistency |

---

## ⚖️ Compliance & Audit Trail

ZK Payroll enables **regulatory compliance without sacrificing contributor privacy**:

### Selective Disclosure
- Admin generates `AuditReport` for authorized auditors
- Auditors verify `total_spent ≤ budget` without individual salaries
- Report includes immutable `timestamp` for audit trail

### Immutable Timestamp
```
AuditReport {
  owner: auditor_address,
  total_spent: 750u64,        // Verified total
  payroll_id: 1field,
  timestamp: 1738181000u32    // Immutable audit trail
}
```



## 📊 Contract Stats (v7)

| Metric | Value |
|--------|-------|
| Records | 5 (`SpentRecord`, `RecipientTicket`, `SalaryCertificate`, `SalaryRecord`, `AuditReport`) |
| Core Transitions | 7 |
| Program Size | ~16 KB |
| Statements | ~420 |
| **Enterprise Features** | ✅ M-of-N Multi-Sig, ✅ Privacy Batching, ✅ Pull Payments |

---

## 🗺️ Roadmap

| Wave | Feature | Status |
|------|---------|--------|
| 1 | Core ZK Payroll + Selective Disclosure + Testnet Deployment | ✅ Complete |
| 2 | Multi-sig Admin | Planned |
| 3 | Recurring Payments | Planned |
| 4+ | Token Integration | Planned |

---
Aleo wallet for grant distribution :- aleo1luatvgqmdt0j662lpgh0tf3l07tkjeq6rrr6c7qzzwnmtjwvy5ps4mk6kr
---

## 📄 License

MIT

---

**Built for Aleo Privacy Buildathon 2026** 🏆
