# ZK Payroll Architecture

## System Overview

ZK Payroll is a multi-portal payroll system built on Aleo. It combines private records, public mapping-based controls, and role-specific decryption so that payroll operators, employees, auditors, and tax authorities each see only the records meant for them.

The live system currently centers around:
- a Leo program: `baba_zk_payroll_v24.aleo`
- a Next.js frontend with wallet-based role portals
- private record workflows for salary, vesting, audit, and tax receipts
- public mappings for budget, admins, claim protection, and tax policy

## Architectural Principles

### 1. Private by record ownership
Sensitive payroll state is stored as private Aleo records. Access depends on record ownership and wallet decryption rather than frontend permissions alone.

### 2. Public controls for enforcement
Operational guardrails such as payroll budgets, admin identities, claim tracking, and tax policy live in public mappings so contract finalizers can enforce them.

### 3. Role-based disclosure
The system intentionally separates what each role can see:
- Admin sees operational controls and aggregate analytics.
- Employee sees their own salary and tax proof records.
- Auditor sees `AuditReport` records.
- Tax authority sees `TaxVaultRecord` receipts.

## Major Components

### Contract Layer
File: `src/main.leo`

Responsible for:
- payroll initialization
- native and token payout transitions
- treasury funding
- vesting and claim flows
- audit report generation
- tax withholding enforcement on native claim flow

### Frontend Layer
Directory: `web/`

Portals:
- `/admin`
- `/employee`
- `/auditor`
- `/tax-authority`
- `/docs`

Frontend responsibilities:
- wallet connection
- record scanning and parsing
- transaction prompting
- local analytics event tracking
- role-specific workflow presentation
- retry-safe wallet interaction wrappers

### External Program Dependencies
- `credits.aleo`
- `test_usdcx_stablecoin.aleo`
- `test_usad_stablecoin.aleo`

## Core Records

### SpentRecord
Purpose:
- private running summary of total payroll spend and recipient count
- source for audit-report generation
- state anchor for several admin flows

Key fields:
- `owner`
- `total_spent`
- `payroll_id`
- `auditor`
- `recipient_count`

### SalaryRecord
Purpose:
- private record representing a direct employee payment

Key fields:
- `owner`
- `amount`
- `payment_id`
- `payroll_id`

### VestingRecord
Purpose:
- time-locked salary allocation before employee unlock

Key fields:
- `owner`
- `amount`
- `payment_id`
- `payroll_id`
- `unlock_height`

### SalaryCertificate
Purpose:
- unlocked right to proceed through the native claim flow

Key fields:
- `owner`
- `amount`
- `start_height`
- `interval`
- `claim_count`
- `payroll_id`
- `payment_id`

### TreasuryRecord
Purpose:
- private treasury accounting record produced when payroll is funded
- used in relayer-backed native claim settlement

Key fields:
- `owner`
- `balance`
- `payroll_id`

### AuditReport
Purpose:
- auditor-owned private solvency and reporting snapshot

Key fields:
- `owner`
- `total_spent`
- `payroll_id`
- `timestamp`
- `recipient_count`
- `pay_period_hash`
- `merkle_root`

### TaxPaidProof
Purpose:
- employee-owned proof that tax was withheld during claim settlement

Key fields:
- `owner`
- `gross_amount`
- `tax_amount`
- `net_amount`
- `payroll_id`
- `payment_id`
- `tax_authority`

### TaxVaultRecord
Purpose:
- tax-authority-owned receipt for withheld payroll tax

Key fields:
- `owner`
- `employee`
- `gross_amount`
- `tax_amount`
- `net_amount`
- `payroll_id`
- `payment_id`

### RecipientTicket
Purpose:
- legacy / auxiliary private recipient wrapper preserved in the program codebase
- not a primary portal workflow in the current frontend

## Public Mappings

### payroll_budgets
Tracks the public payroll ceiling currently recognized by the contract.

Important note:
- In the current implementation, funding payroll through `fund_payroll` increases this value.
- So the contract behaves like an additive available spend ceiling, not a strictly fixed one-time cap.

### multisig_threshold
Stores the threshold value configured during initialization.

### admin_1 / admin_2 / admin_3
Store the configured payroll admins.

### claimed_payments
Prevents double-claiming of a payment id.

### tax_percentage_bps
Stores the withholding rate in basis points for a payroll.

### tax_authority
Stores the authority wallet that receives withheld tax.

### tax_collected_total
Stores aggregate withheld tax total per payroll.

## Operational Flows

### Flow A: Initialize Payroll
1. Admin calls `initialize_payroll`.
2. Contract stores budget, threshold, and admin mappings.
3. Contract returns an initial `SpentRecord`.
4. Tax mappings are initialized with defaults.

### Flow B: Fund Payroll
1. Admin converts public ALEO to a private credits record in wallet.
2. Admin calls `fund_payroll` using that private credits record.
3. Contract transfers the specified amount into a payroll-owned treasury path.
4. `finalize_fund_payroll` increases the public payroll budget mapping.

### Flow C: Direct Push Payment
1. Admin selects employee, currency, and amount.
2. Frontend gathers required private records.
3. Admin signs and submits the payout transition.
4. Employee receives a private `SalaryRecord` or token equivalent immediately.
5. `SpentRecord` is updated for native direct payroll accounting.

### Flow D: Delayed Native Claim
1. Admin issues `VestingRecord` using `issue_vested_salary`.
2. Employee later unlocks it with `claim_vested`.
3. Employee receives a `SalaryCertificate`.
4. Employee submits a pull request through the frontend.
5. Admin relayer approves `claim_salary`.
6. Contract splits gross claim into employee net and authority tax.
7. Employee receives `TaxPaidProof`.
8. Authority receives `TaxVaultRecord`.

### Flow E: Audit Reporting
1. Admin reads latest `SpentRecord`.
2. Admin calls `generate_audit_report`.
3. Auditor receives private `AuditReport`.
4. Auditor portal decrypts and renders aggregate report information.

## Privacy Model by Role

### Admin
Can operate payroll and see aggregate context in the frontend, but admin analytics intentionally avoid listing raw recipient histories in the dashboard area.

### Employee
Can decrypt only records they own, including salary results, claim-related records, and employee-side tax proofs.

### Auditor
Can decrypt only `AuditReport` records sent to the auditor wallet.

### Tax Authority
Can decrypt only `TaxVaultRecord` receipts sent to the configured authority wallet.

## Analytics Architecture

The analytics dashboard is frontend-scoped rather than explorer-indexed.

Data sources:
- wallet-visible `SpentRecord` and `AuditReport` snapshots
- local event ledger captured after successful admin actions

Design choice:
- prioritize aggregate privacy-preserving metrics over complete historical indexing
- avoid raw recipient tables in analytics UI

## Security Notes

### Budget enforcement
Budget checks occur in finalizers against public mappings.

### Claim replay protection
`claimed_payments` prevents duplicate native claim execution for the same payment id.

### Role isolation
Private records are scoped by owner address, which is stronger than frontend-only role gating.

### Withholding integrity
`claim_salary` validates that submitted tax policy inputs match the stored public tax mappings.

## Known Constraints

- Batch payroll is sequential, not a single parallel proof.
- Stablecoin funding and batching remain more limited than native ALEO paths.
- Tax withholding is only on native `claim_salary` today.
- Budget ceiling currently increases when payroll is funded.
- Wallet adapters may expose records inconsistently, so the frontend includes retry and normalization helpers.
