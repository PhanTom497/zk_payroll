# Testnet Deployment & Execution Commands

Follow these steps to deploy and interact with the **ZK Payroll** smart contract on the Aleo Testnet.

---

## 🚀 1. Prerequisites

- **Leo Wallet**: Install the browser extension and fund it with ~10 credits from [faucet.aleo.org](https://faucet.aleo.org).
- **Export Private Key**: Get your private key from the wallet settings.
- **Environment Setup**:

```bash
export PRIVATE_KEY="APrivateKey1zkp..."
export ENDPOINT="https://api.explorer.provable.com/v1"
```

---

## 📦 2. Deploy Contract

Deploy the program to the testnet. This costs approximately **7-8 credits**.

```bash
leo deploy \
  --network testnet \
  --endpoint $ENDPOINT \
  --private-key $PRIVATE_KEY \
  --priority-fees 1000000 \
  --broadcast
```

> **Note**: If you see a `500` error, retry the command. Testnet can be congested.

---

## ⚙️ 3. Initialize Payroll

Create the payroll instance and set the budget.

**Command (v7 with Multi-Sig):**
```bash
leo execute initialize_payroll \
  1000u64 \
  1field \
  1u64 \
  <ADMIN_1_ADDRESS> \
  <ADMIN_2_ADDRESS> \
  <ADMIN_3_ADDRESS> \
  <AUDITOR_ADDRESS> \
  --network testnet \
  --endpoint $ENDPOINT \
  --private-key $PRIVATE_KEY \
  --priority-fees 100000 \
  --broadcast
```

**Parameters:**
- `1000u64`: Budget ceiling
- `1field`: Unique Payroll ID
- `1u64`: Multi-Sig Threshold (e.g., 1-of-3)
- `aleo1...` x3: Addresses of the 3 admin signers
- `aleo1...`: Auditor address (for selective disclosure)

**Save Output:**
Copy the `SpentRecord` record from the output. You will need it for Auditor actions.

---

## 💰 3.5. Fund Payroll

Convert public `credits.aleo` into a private `credits.aleo/credits` record owned by the admin, to be used for private payouts.

**Command:**
```bash
leo execute fund_payroll \
  1000u64 \
  1field \
  <ADMIN_1_ADDRESS> \
  --network testnet \
  --endpoint $ENDPOINT \
  --private-key $PRIVATE_KEY \
  --priority-fees 100000 \
  --broadcast
```

**Parameters:**
- `1000u64`: Amount of credits to convert and lock into the payroll.
- `1field`: Unique Payroll ID matching step 3.
- `<ADMIN_1_ADDRESS>`: The admin who will hold the private funds record.

**Save Output:**
Copy the `credits.aleo/credits` record from the output. This is your `PAY_RECORD` for issuing salaries.

---

## 🎟️ 4. Create Recipient Ticket

Generate a private ticket for an employee to receive a salary.

**Command:**
```bash
leo execute create_recipient_ticket \
  "{ ... ADMIN_CAP_RECORD ... }" \
  <EMPLOYEE_ADDRESS> \
  --network testnet \
  --endpoint $ENDPOINT \
  --private-key $PRIVATE_KEY \
  --priority-fees 100000 \
  --broadcast
```

**Parameters:**
- `"{ ... }"`: Your `AdminCap` record from Step 3
- `aleo1...`: Employee's wallet address

---

## 💸 5. Issue Salary (Success Case)

Pay a salary privately using the funded `credits.aleo/credits` record.

**Command:**
```bash
leo execute issue_salary \
  "{ ... PAY_RECORD ... }" \
  "{ ... SPENT_RECORD ... }" \
  "{ ... RECIPIENT_TICKET ... }" \
  500u64 \
  101field \
  "{ sig1: ..., sig2: ..., sig3: ... }" \
  "[aleo1..., aleo2..., aleo3...]" \
  --network testnet \
  --endpoint $ENDPOINT \
  --private-key $PRIVATE_KEY \
  --priority-fees 100000 \
  --broadcast
```

**Verification:**
The transaction will be **Accepted**. The `SpentRecord` will update to `500u64`, a `SalaryRecord` will be created for the employee, and two new `credits.aleo/credits` records will be returned (one for the employee with the salary, one for the admin with the remainder).

---

## 🚫 6. Issue Salary (Rejection Case)

Attempt to pay more than the remaining budget (e.g., 600u64 when only 500u64 remains, or > 1000u64 total).

**Command:**
```bash
leo execute issue_salary \
  "{ ... PAY_RECORD ... }" \
  "{ ... SPENT_RECORD ... }" \
  "{ ... RECIPIENT_TICKET ... }" \
  1050u64 \
  102field \
  "{ sig1: ..., sig2: ..., sig3: ... }" \
  "[aleo1..., aleo2..., aleo3...]" \
  --network testnet \
  --endpoint $ENDPOINT \
  --private-key $PRIVATE_KEY \
  --priority-fees 100000 \
  --broadcast
```

**Verification:**
The transaction will be **Rejected** on-chain.
- The constraint `assert(new_total_spent <= budget_ceiling)` will fail during finalization.
- You can verify the "Rejected" status in the block explorer.

## 💡 Note on CLI Testing for v7 (Multi-Sig & Pull Payments)

**Important**: In version 7, `issue_salary` and `create_recipient_ticket` require a complex `Signatures` struct and a `[address; 3]` signer array as arguments to satisfy the Multi-Sig conditions. 

Because formatting Aleo CLI struct inputs for signatures is highly complex and error-prone, **we strongly recommend using the Frontend UI (`npm run dev` in the `/web` directory)** to test these flows. The frontend automatically gathers signatures, constructs the payload, and executes the transition seamlessly using the Aleo SDK.

If testing manually via CLI, you must provide valid `Signatures { sig1: ..., sig2: ..., sig3: ... }` strings matching the admin addresses.

---

## 📋 7. Generate Audit Report

Prove solvency to an auditor without revealing individual salaries.

**Command:**
```bash
leo execute generate_audit_report \
  "{ ... SPENT_RECORD ... }" \
  1738181000u32 \
  1field \
  2field \
  --network testnet \
  --endpoint $ENDPOINT \
  --private-key $PRIVATE_KEY \
  --priority-fees 100000 \
  --broadcast
```

**Result:**
An encrypted `AuditReport` record is created, owned specifically by the auditor address.

---

## 🔍 Verification Tools

- **Block Explorer**: [explorer.provable.com](https://explorer.provable.com/?network=testnet)
- **Decrypt Records**: Use `leo decrypt` or the **Leo Wallet** "Records" tab to view your encrypted record data.
