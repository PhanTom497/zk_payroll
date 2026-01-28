# ZK Payroll - Aleo Testnet Deployment Guide

> **Wave-2 Submission** | Privacy Buildathon 2025

---

## ⚠️ Prerequisites

> [!CAUTION]
> **FUND YOUR WALLET FIRST!**
> 
> Deployment is significantly more expensive than execution. Ensure your private key has **at least 5-10 Aleo credits** before attempting deployment.
> 
> **Faucet:** https://faucet.aleo.org

### Required Setup

1. **Leo CLI installed** (`leo --version`)
2. **Private key with funds** (exported as `PRIVATE_KEY`)
3. **Network connectivity** to testnet endpoint

---

## 1. Program Name Verification ✅

```json
// program.json
{
    "program": "zk_payroll.aleo"  // 10 characters ✅
}
```

| Requirement | Status |
|-------------|--------|
| Name length ≥ 10 chars | ✅ `zk_payroll` = 10 chars |
| Namespace cost avoided | ✅ No additional fee |

---

## 2. Deployment Command

### Basic Deployment

```bash
# Navigate to project
cd /home/baba/Aleo/zk_payroll

# Deploy to testnet (requires funded wallet)
leo deploy \
  --network testnet \
  --endpoint https://api.explorer.provable.com/v1 \
  --private-key $PRIVATE_KEY \
  --priority-fee 1000000
```

### With Explicit Fee Estimation

```bash
# First, estimate the deployment fee
leo deploy --dry-run \
  --network testnet \
  --endpoint https://api.explorer.provable.com/v1

# Then deploy with sufficient fee
leo deploy \
  --network testnet \
  --endpoint https://api.explorer.provable.com/v1 \
  --private-key $PRIVATE_KEY \
  --priority-fee 2000000
```

### Expected Costs

| Component | Estimated Cost |
|-----------|----------------|
| Base deployment | ~1-2 credits |
| Storage (mappings) | ~0.1-0.5 credits |
| Synthesis | ~0.5-1 credit |
| Priority fee | Variable |
| **Total** | **~3-5 credits** |

---

## 3. Audit Evidence Script

Run these commands **immediately after deployment** to create on-chain evidence:

### Step A: Initialize Payroll

```bash
# Set the on-chain budget mapping
# Auditor address: Use your secondary test address or a known auditor

export AUDITOR_ADDR="aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px"

leo execute initialize_payroll \
  1000u64 \
  1field \
  $AUDITOR_ADDR \
  --network testnet \
  --endpoint https://api.explorer.provable.com/v1 \
  --private-key $PRIVATE_KEY \
  --priority-fee 100000
```

**Save the output records:**
- `AdminCap` → needed for Step B & C
- `SpentRecord` → needed for Step B & C

---

### Step B: Issue Private Salary

```bash
# Replace [ADMIN_CAP] and [SPENT_RECORD] with outputs from Step A
# Create a recipient ticket first

leo execute create_recipient_ticket \
  '[ADMIN_CAP]' \
  $AUDITOR_ADDR \
  --network testnet \
  --endpoint https://api.explorer.provable.com/v1 \
  --private-key $PRIVATE_KEY \
  --priority-fee 100000

# Then issue salary with the ticket
leo execute issue_salary \
  '[NEW_ADMIN_CAP]' \
  '[SPENT_RECORD]' \
  '[RECIPIENT_TICKET]' \
  500u64 \
  100field \
  --network testnet \
  --endpoint https://api.explorer.provable.com/v1 \
  --private-key $PRIVATE_KEY \
  --priority-fee 100000
```

**Save the output:** `SpentRecord` with `total_spent: 500u64`

---

### Step C: Generate Audit Report (PRIMARY EVIDENCE)

```bash
# This creates the AuditReport record owned by the Auditor
# Use timestamp: Current Unix timestamp

leo execute generate_audit_report \
  '[NEW_ADMIN_CAP]' \
  '[SPENT_RECORD_WITH_500]' \
  1738177337u32 \
  --network testnet \
  --endpoint https://api.explorer.provable.com/v1 \
  --private-key $PRIVATE_KEY \
  --priority-fee 100000
```

> [!IMPORTANT]
> **Save the Transaction ID from this command!**
> This is your primary "Prototype" evidence for the grant submission.

---

## 4. Locating Transactions on Provable Explorer

### Explorer URL

```
https://explorer.provable.com/transaction/{TRANSACTION_ID}?network=testnet
```

### Finding Transaction Details

1. **Copy Transaction ID** from `leo execute` output
2. **Open Explorer:** https://explorer.provable.com
3. **Select Network:** Testnet
4. **Paste Transaction ID** in search
5. **Verify:**
   - `function`: `generate_audit_report`
   - `program_id`: `zk_payroll.aleo`
   - Status: `Finalized`

### What to Screenshot for Grant

| Evidence | What to Capture |
|----------|-----------------|
| Transaction ID | Full hash from Step C |
| Finalize block | Block height where it finalized |
| Outputs tab | Shows record creation (encrypted) |
| Mapping updates | Shows `payroll_budgets` was set |

---

## 5. Grant Submission Template

### Prototype Section

```markdown
## Live Prototype

**Deployed Program:** `zk_payroll.aleo`

**Network:** Aleo Testnet

**Key Transactions:**
1. [Initialize Payroll](https://explorer.provable.com/transaction/TX_ID_1?network=testnet)
2. [Private Salary Payment](https://explorer.provable.com/transaction/TX_ID_2?network=testnet)
3. [Audit Report Generation](https://explorer.provable.com/transaction/TX_ID_3?network=testnet) ← Primary Evidence

**Privacy Verification:**
- Salary amounts: ██████ (encrypted)
- Recipient addresses: ██████ (encrypted)
- Budget constraint: ✅ ZK-proven
- Audit report: ✅ Selective disclosure to auditor only
```

---

## 6. Quick Reference

### Environment Variables

```bash
# Set these before running commands
export PRIVATE_KEY="APrivateKey1zkp..."
export AUDITOR_ADDR="aleo1..."
export NETWORK="testnet"
export ENDPOINT="https://api.explorer.provable.com/v1"
```

### Command Cheatsheet

| Action | Command |
|--------|---------|
| Deploy | `leo deploy --network testnet --endpoint $ENDPOINT --private-key $PRIVATE_KEY` |
| Execute | `leo execute <transition> <args> --network testnet --endpoint $ENDPOINT --private-key $PRIVATE_KEY` |
| Check balance | `leo account balance --network testnet --endpoint $ENDPOINT --private-key $PRIVATE_KEY` |

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| `insufficient balance` | Get more credits from faucet |
| `program already exists` | Use a unique program name suffix |
| `transaction rejected` | Increase priority fee |
| `finalize failed` | Check constraint (budget exceeded?) |

---

**🔐 ZK Payroll - Privacy-Preserving DAO Payments**

*Wave-2 Feature: Selective Disclosure for Compliance Auditing*
