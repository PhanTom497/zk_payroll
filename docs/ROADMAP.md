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
-   **Solution:** Implement a `MultiSigAdmin` configuration natively into the React App and Blockchain structure.
    -   Requires $M$-of-$N$ signatures to `issue_salary`.
    -   **✅ Implemented:** `initialize_payroll` sets up a 3-of-3 threshold mapping on-chain.
    -   **✅ Implemented (Off-Chain UX):** The React frontend leverages `@provablehq/sdk` to verify Admin Wallet hardware signatures locally before releasing the final execution payload, bypassing the SnarkVM `sig.verify()` limitations.

### 2. Real Frontend Integration (React + Wallet Adapter)
-   **Solution:** Build a production-grade dApp using:
    -   **Framework:** Next.js / React.
    -   **Wallet:** Aleo Wallet Adapter (Leo Wallet).
    -   **State Management:** React hooks parsing Aleo `requestRecords` automatically handling UTXO fragmentation and consolidation logic for frictionless UX.
    -   **SDK:** `@provablehq/sdk` handling client-side Cryptography.
    -   **✅ Implemented:** Full Admin Dashboard deployed on `localhost:3000`.

### 3. Auditor Dashboard v1
-   **Feature:** A dedicated portal where auditors can login with their wallet.
    -   **✅ Implemented:** Auditor Portal (`/auditor`) successfully fetches assigned `AuditReports` and decrypts total spending data.

### 4. Enhanced Auditor Metadata
-   **Solution:** Enrich `AuditReport` with metadata:
    -   `recipient_count`: Number of employees paid in this batch.
    -   `pay_period_hash`: Verifiable link to the specific payroll cycle.
    -   `merkle_root`: Commitment to the set of recipients (without revealing identities).
    -   **✅ Implemented:** Smart contract updated (`v3`) to include these fields.

---

### 5. "Pull" Payments (Employee Claiming via Stablecoins)
-   **Concept:** Instead of pushing volatile native tokens, Admins want to issue ARC-20 Stablecoins (`USDCx`).
-   **Mechanism:** Employees claim their own salary every $X$ blocks via `claim_salary_usdcx` using a `SalaryCertificate`.
-   **✅ Implemented:** Employees can pull their USDCx independently via the Employee Portal. Native Aleo Credits remain on a direct "Push" ledger model for immediate compensation.

### 6. Batch Processing & UX Enhancements
-   **Problem:** Issuing 100 salaries requires 100 separate proofs and transactions.
-   **Solution:** Valid ZK aggregation or batching logic?
    -   *Note on Aleo:* Currently, this might just mean a "Batch Runner" script that queues transactions in parallel, but true ZK batching inside one transition might hit circuit limits.
-   **✅ Implemented:** `issue_limit_batch_3` allows simultaneous payroll runs. Added automated UTXO state-refresh polling to instantly unlock consecutive transaction chains without double-spend Explorer rejections.

### 7. Payroll Templates
-   **✅ Implemented:** Frontend supports saving and loading configuration templates for repeated batch issuances.

### 8. Privacy-Preserving Batching
-   **Problem:** Individual `finalize` calls reveal the exact salary amount via balance changes (`new_total - old_total`).
-   **✅ Implemented:** Addressed inherently through the Pull Model (certificates), mitigating correlation attacks on direct `issue_salary` transactions.

---

## 💰 Wave 3: The Buildathon Finale (2-Day Sprint)

**Goal:** Finalize the core ZK financial primitives for the imminent Buildathon submission.

### 1. ARC-20 Token Integration (`USDCx` & `USAD` Stablecoins)
-   **Feasibility:** HIGH (Core Aleo Logic - Inspired by NullPay Architecture)
-   **Actionable:** We will integrate the official Aleo Foundation Buildathon token programs (`test_usdcx_stablecoin.aleo` and `test_usad_stablecoin.aleo`). Taking inspiration from NullPay, we will maintain **two parallel payment rails**:
    -   `issue_salary`: Continues to exist for native `credits.aleo` push transfers.
    -   `issue_salary_stablecoin`: Added to explicitly transfer ARC-20 `Token` records (handling both USDCx and USAD standards).
    -   This allows the Payroll program to natively support native credits and official stablecoins simultaneously without strict type-casting conflicts.

### 2. Time-Delayed Vesting Contracts
-   **Feasibility:** HIGH (Core Aleo Logic)
-   **Actionable:** Introduce a `VestingRecord` struct. Emploees will receive a token allocation that is cryptographically locked until `block.height >= unlock_height`. They will call `claim_vested()` to withdraw only when the network time has passed.

### 3. Treasury Lock (True Pull Model for Native Tokens)
-   **Feasibility:** MEDIUM (Requires careful UTXO architecture)
-   **Actionable:** Rewrite `fund_payroll` to use `credits.aleo/transfer_public_to_private` (or a dedicated Multi-sig pool record), physically locking a massive lump sum of native credits into the Program's jurisdiction. Employees will use their `SalaryCertificate` to seamlessly deduct from this central Treasury.

---

## 🏛️ Wave 4: Automated Tax Compliance

**Goal:** Bridge the gap to government regulations without sacrificing employee privacy.

### 1. Zero-Knowledge Tax Withholding
-   **Mechanism:** Add a "Tax Authority" view key and a `tax_percentage` global state.
-   **Logic:** `claim_salary` will automatically calculate $X$% of the claim, divert it to a `TaxVaultRecord`, and generate a downloadable ZK proof of "Tax Paid" for the employee to securely submit to the IRS.

---

## 🔗 Wave 5: Decentralized HR Oracles

**Goal:** Eliminate manual admin data entry.

### 1. Privacy-Preserving Web2 Sync
-   **Integration:** Sync securely with tools like BambooHR or Deel.
-   **Mechanism:** An oracle node signs an `EmployeeCredential` off-chain. The employee submits this signature to mint their own `SalaryTicket` on-chain, proving employment status privately without the Admin manually initiating the payroll transaction.

---

## 🏦 Wave 6: Fiat & Enterprise On-Ramps

**Goal:** Mass adoption for non-crypto native companies.

### 1. Fiat On/Off-Ramps
-   **Integration:** Partner with Web2 financial providers (e.g., MoonPay, Stripe Crypto, Banxa).
-   **Mechanism:** Administrators can fund the payroll treasury directly via Bank Wire. The backend provider automatically swaps fiat to ARC-20 Stablecoins and triggers the `fund_payroll` transiton on Aleo natively.
