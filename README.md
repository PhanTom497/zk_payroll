# 🔐 ZK Payroll

**Privacy-Preserving DAO Payments on Aleo**

[![Aleo](https://img.shields.io/badge/Built%20on-Aleo-blue)](https://aleo.org)
[![Leo](https://img.shields.io/badge/Language-Leo-purple)](https://leo-lang.org)
[![Wave](https://img.shields.io/badge/Buildathon-Wave%201-green)](https://aleo.org)

---

## 🎯 Problem

Public blockchains expose all transaction data. For DAO payroll, this means:
- 💸 Competitor DAOs see your compensation structure
- 👀 Contributors' salaries become publicly searchable  
- 📊 Payment timing reveals organizational cash flow

## 💡 Solution

ZK Payroll uses Aleo's zero-knowledge proofs to enable:

| Feature | How It Works |
|---------|--------------|
| **Private Salaries** | Encrypted records only recipients can decrypt |
| **Budget Enforcement** | ZK proof verifies `sum(salaries) ≤ budget` |
| **Selective Disclosure** | Admin can share total spent with auditors |
| **Public Verifiability** | Budget ceiling is on-chain and auditable |

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/PhanTom497/zk_payroll.git
cd zk_payroll

# Build
leo build

# Run demo (initialize with 1000 credit budget)
leo run initialize_payroll 1000u64 1field <AUDITOR_ADDRESS>

# Issue private salary of 500 credits
leo run issue_salary [ADMIN_CAP] [SPENT_RECORD] [TICKET] 500u64 1field

# Generate audit report
leo run generate_audit_report [ADMIN_CAP] [SPENT_RECORD] 1738181000u32
```

---

## 📁 Project Structure

```
zk_payroll/
├── src/
│   └── main.leo          # Core smart contract
├── demo/                  # Interactive web demo
│   ├── index.html
│   ├── style.css
│   └── demo.js
├── docs/
│   ├── ARCHITECTURE.md   # Technical deep-dive
│   └── TESTING.md        # Test commands & results
└── README.md
```

---

## 🔒 Privacy Guarantees

| Data | Visibility |
|------|------------|
| Individual salaries | 🔴 Private (encrypted) |
| Recipient addresses | 🔴 Private (encrypted) |
| Payment timing | 🔴 Private (encrypted) |
| Budget ceiling | 🟢 Public (on-chain) |
| Budget compliance | 🟢 Public (ZK-proven) |

---

## 🛡️ Security Features

1. **On-Chain Budget** - Budget read from mapping, not user input
2. **Caller Binding** - `self.caller == admin_cap.owner` check
3. **Recipient Tickets** - Prevents address leakage via ticket pattern
4. **Payroll ID Consistency** - Prevents cross-payroll attacks

---

## 📊 Contract Stats

| Metric | Value |
|--------|-------|
| Records | 5 (AdminCap, SpentRecord, RecipientTicket, SalaryRecord, AuditReport) |
| Transitions | 4 |
| Program Size | 3.06 KB |

---

## 🎮 Live Demo

Open `demo/index.html` in your browser for an interactive demonstration:
- **Public View** - What blockchain observers see
- **Admin View** - Encrypted salary records with decrypt toggle
- **Auditor Portal** - Selective disclosure demonstration
- **ZK Enforcement** - Budget constraint simulation

---

## 🗺️ Roadmap

| Wave | Feature | Status |
|------|---------|--------|
| 1 | Core ZK Payroll + Selective Disclosure | ✅ Complete |
| 2 | Testnet Deployment | 🔜 Next |
| 3 | Multi-sig Admin | Planned |
| 4 | Recurring Payments | Planned |
| 5+ | Token Integration | Planned |

---

## 📄 License

MIT

---

**Built for Aleo Privacy Buildathon 2025** 🏆
