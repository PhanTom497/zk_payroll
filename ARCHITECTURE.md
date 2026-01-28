# ZK Payroll Architecture

## Why Public Blockchains Cannot Safely Handle Payroll

Traditional public blockchains (Ethereum, Solana, etc.) expose **all transaction data on-chain**:

| Exposed Data | Risk |
|--------------|------|
| **Salary amounts** | Competitors learn compensation structures |
| **Recipient addresses** | Contributors can be identified and targeted |
| **Payment timing** | Reveals organizational cash flow patterns |
| **Total compensation** | Enables salary comparison attacks |

### Real-World Attack Scenarios

1. **Competitor Intelligence**: A rival DAO monitors your payroll contract to poach top-paid contributors
2. **Tax Jurisdiction Attacks**: Authorities track cross-border payments to specific addresses
3. **Social Engineering**: Attackers identify high-value recipients for targeted phishing
4. **Market Manipulation**: Knowing when large payments occur enables trading strategies

---

## How Aleo Solves This

Aleo's architecture provides **private-by-default** execution through:

### 1. Encrypted Records

All sensitive data lives in **records**—encrypted on-chain state that only the owner can decrypt:

```
SalaryRecord {
    owner: address (recipient only)
    amount: u64 (encrypted)
    payment_id: field (encrypted)
}
```

- The blockchain stores ciphertext, not plaintext
- Only the record owner's private key can decrypt
- Even the DAO admin cannot read a contributor's salary after delivery

### 2. Zero-Knowledge Proofs

ZK proofs enable **constraint verification without data revelation**:

```
Proof: "The sum of all private salaries ≤ 1000 credits"
       WITHOUT revealing: 400 + 350 = 750
```

**What observers can verify:**
- ✅ Budget constraint is satisfied
- ✅ Admin authorized the transaction
- ✅ No budget overflow occurred

**What observers CANNOT see:**
- ❌ Individual salary amounts
- ❌ Recipient addresses
- ❌ Number of payments
- ❌ Payment timing patterns

### 3. State-Channel Pattern for Private Aggregates

Since Leo transitions execute independently, we track private running totals via consumed-and-recreated records:

```
SpentRecord(0) → issue_salary(400) → SpentRecord(400) + SalaryRecord(400)
                                            ↓
SpentRecord(400) → issue_salary(350) → SpentRecord(750) + SalaryRecord(350)
```

The `total_spent` value remains encrypted in `SpentRecord`, yet the ZK proof verifies it never exceeds the public budget.

---

## Security Model

| Attack Vector | Mitigation |
|---------------|------------|
| Fake budget bypass | Budget read from on-chain mapping, not user input |
| Stolen AdminCap | `self.caller == admin_cap.owner` check |
| Address leakage | RecipientTicket pattern, no naked addresses |
| Cross-payroll replay | Payroll ID consistency assertions |

---

## Summary

| Property | Public Blockchain | Aleo ZK Payroll |
|----------|-------------------|-----------------|
| Salary visibility | **Public** | **Private** (encrypted records) |
| Recipient visibility | **Public** | **Private** (record ownership) |
| Budget verification | Trivial | **ZK proof** |
| Timing analysis | **Easy** | **Impossible** |
| Compliance-ready | Manual audit | Selective disclosure (Wave-2) |

**Aleo enables what was previously impossible**: A trustless, verifiable payroll system that protects contributor privacy while proving fiscal compliance.
