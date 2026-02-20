# 🗺️ ZK Payroll: Complete Future Roadmap

This document outlines the strategic development plan for ZK Payroll, moving from a proof-of-concept to an enterprise-grade, privacy-first DAO compensation platform.

---

## ✅ Wave 1: The Foundation

**Status:** Complete  
**Focus:** Core Privacy Primitives & Proof of Concept

-   **Core Smart Contract (`src/main.leo`):**
    -   Private `SalaryRecord` issuance.
    -   Public `budget_ceiling` enforcement via on-chain mapping.
    -   Encrypted `audit_report` for selective disclosure.
    -   Testnet Deployment & Verification.
-   **Basic tooling:** CLI-based interaction scripts (`test.sh`).
-   **Demo UI:** A static simulation (mock data) demonstrating the privacy/auditor workflow.

---

## ✅ Wave 2: The Efficiency & Security Wave (Current Submission)

**Status:** Complete  
**Focus:** Multi-Sig, Auditor Portal, Real Frontend, Automation & Scale

### 1. Multi-Signature Admin Control
-   **Solution:** Implement a `MultiSigAdmin` record.
    -   Requires $M$-of-$N$ signatures to `issue_salary` or `refill_budget`.
    -   Transition from `AdminCap` record to a shared `AdminBoard` struct.
    -   **✅ Implemented:** `initialize_payroll` and `finalize_initialize_payroll` now set up M-of-N threshold.

### 2. Real Frontend Integration (React + Wallet Adapter)
-   **Solution:** Build a production-grade dApp using:
    -   **Framework:** Next.js / React.
    -   **Wallet:** Aleo Wallet Adapter (Leo Wallet, Puzzle Wallet).
    -   **State Management:** React hooks for fetching records.
    -   **SDK:** `@aleohq/sdk` for generating client-side ZK proofs in the browser.
    -   **✅ Implemented:** Full Admin Dashboard deployed on `localhost:3000`.

### 3. Auditor Dashboard v1
-   **Feature:** A dedicated portal where auditors can login with their wallet.
-   **Function:** Automatically fetch and decrypt all `AuditReport` records owned by them.
    -   **✅ Implemented:** Auditor Portal (`/auditor`) successfully decrypts reports.

### 4. Enhanced Auditor Metadata
-   **Solution:** Enrich `AuditReport` with metadata:
    -   `recipient_count`: Number of employees paid in this batch.
    -   `pay_period_hash`: Verifiable link to the specific payroll cycle.
    -   `merkle_root`: Commitment to the set of recipients (without revealing identities).
    -   **✅ Implemented:** Smart contract updated (`v3`) to include these fields.

---

### 5. "Pull" Payments (Employee Claiming)
-   **Concept:** Instead of Admin pushing every payment (high active time), Admin funds a `PeriodBudget`.
-   **Mechanism:** Employees claim their own salary every $X$ blocks via `claim_salary` using a `SalaryCertificate`.
-   **✅ Implemented:** Employees can pull their salary independently of the Admin.

### 6. Batch Processing & Deduplication
-   **Problem:** Issuing 100 salaries requires 100 separate proofs and transactions.
-   **Solution:** Valid ZK aggregation or batching logic?
    -   *Note on Aleo:* Currently, this might just mean a "Batch Runner" script that queues transactions in parallel, but true ZK batching inside one transition might hit circuit limits.
-   **✅ Implemented:** `issue_limit_batch_3` transition added to smart contract. Frontend supports Legacy and Privacy Batch runs.

### 7. Payroll Templates
-   **✅ Implemented:** Frontend supports saving and loading configuration templates for repeated batch issuances.

### 8. Privacy-Preserving Batching
-   **Problem:** Individual `finalize` calls reveal the exact salary amount via balance changes (`new_total - old_total`).
-   **✅ Implemented:** Addressed inherently through the Pull Model (certificates), mitigating correlation attacks on direct `issue_salary` transactions.

---

## 💰 Wave 3: Asset Diversification & Enterprise Compliance (Future Buildathon)

**Goal:** Support real-world payment currencies and bridge the gap to Web2 regulatory requirements.

### 1. ARC-20 Token Support (Stablecoins)
-   **Feature:** Integrate with standard token protocols (e.g., standard ARC-20).
-   **Logic:** The payroll contract will hold a balance of USDC/USDT.
-   **Change:** `issue_salary` now transfers `TokenRecord` instead of native `credits`.

### 2. Token Vesting Contracts
-   **Feature:** Programmable money for team incentives.
-   **Logic:**
    -   Lock tokens in a `VestingRecord`.
    -   Unlock $Y$% linearly every block.
    -   Employee calls `claim_vested()` to withdraw available funds privately.

---

### 3. Zero-Knowledge Tax Compliance
-   **Problem:** DAOs need to withhold taxes or prove tax compliance without revealing user identities to the public.
-   **Solution:** A "Tax Authority" view key.
    -   Automatically divert % of salary to a tax vault.
    -   Generate a ZK proof of "Tax Paid" for the employee to download for their IRS filing.

### 4. Fiat On/Off-Ramps
-   **Integration:** Partner with providers (e.g., MoonPay, Banxa) to allow funding the payroll budget directly via bank wire, converting to stablecoins on the backend.

### 5. Privacy-Preserving HR Oracle
-   **Idea:** Sync employee lists from Web2 HR tools (BambooHR, Deel).
-   **Mechanism:** An oracle signs a `EmployeeCredential` that allows the user to mint their own `RecipientTicket` on-chain, verifying employment status without the admin manually creating every ticket.
