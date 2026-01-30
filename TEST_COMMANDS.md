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

**Command:**
```bash
leo execute initialize_payroll \
  1000u64 \
  1field \
  <YOUR_WALLET_ADDRESS> \
  --network testnet \
  --endpoint $ENDPOINT \
  --private-key $PRIVATE_KEY \
  --priority-fees 100000 \
  --broadcast
```

**Parameters:**
- `1000u64`: Budget ceiling
- `1field`: Unique Payroll ID
- `aleo1...`: Auditor address (for selective disclosure)

**Save Output:**
Copy the `AdminCap` and `SpentRecord` records from the output. You will need them for the next steps.

> **Tip:** You can find these JSON strings in your terminal output under the "Outputs" section of the command you just ran.

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

Pay a salary within the budget (e.g., 500u64).

**Command:**
```bash
leo execute issue_salary \
  "{ ... ADMIN_CAP_RECORD ... }" \
  "{ ... SPENT_RECORD ... }" \
  "{ ... RECIPIENT_TICKET ... }" \
  500u64 \
  101field \
  --network testnet \
  --endpoint $ENDPOINT \
  --private-key $PRIVATE_KEY \
  --priority-fees 100000 \
  --broadcast
```

**Verification:**
The transaction will be **Accepted**. The `SpentRecord` will update to `500u64`, and a `SalaryRecord` will be created for the employee.

---

## 🚫 6. Issue Salary (Rejection Case)

Attempt to pay more than the remaining budget (e.g., 600u64 when only 500u64 remains, or > 1000u64 total).

**Command:**
```bash
leo execute issue_salary \
  "{ ... ADMIN_CAP_RECORD ... }" \
  "{ ... SPENT_RECORD ... }" \
  "{ ... RECIPIENT_TICKET ... }" \
  1050u64 \
  102field \
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

---

## 📋 7. Generate Audit Report

Prove solvency to an auditor without revealing individual salaries.

**Command:**
```bash
leo execute generate_audit_report \
  "{ ... ADMIN_CAP_RECORD ... }" \
  "{ ... SPENT_RECORD ... }" \
  1738181000u32 \
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
