# ZK Payroll Testing Guide

This guide covers the current manual and contract-level test surface for `baba_zk_payroll_v24.aleo`.

## Recommended Testing Order

1. Build the Leo program.
2. Start the Next.js frontend.
3. Run end-to-end role testing through the portals.
4. Use CLI checks only for focused contract validation.

## 1. Contract Build

```bash
leo build
```

Expected:
- program builds successfully for `baba_zk_payroll_v24.aleo`

## 2. Frontend Run

```bash
cd web
npm install
npm run dev
```

Expected:
- app loads at `http://localhost:3000`
- admin, employee, auditor, tax-authority, and docs routes render

## 3. Core Frontend Validation Areas

### Payroll Initialization
Validate:
- admin wallet can initialize payroll
- mappings are written
- initial `SpentRecord` exists
- admin portal exits setup state

### Funding
Validate:
- public-to-private conversion works for supported token flows exposed in the UI
- payroll funding succeeds for native ALEO
- spend limit / budget context updates after funding

### Direct Push Payouts
Validate:
- native ALEO push payout works
- USDCx push payout works when required token records are available
- USAD push payout works when required token records are available
- employee history updates after successful pushes

### Vesting and Claim Flow
Validate:
- delayed payout creates `VestingRecord`
- employee can unlock with `claim_vested`
- employee can submit pull request
- admin can approve request
- employee receives net claim amount
- tax authority receives withheld amount

### Audit Reporting
Validate:
- admin can generate `AuditReport`
- auditor portal can scan and render reports
- totals and metadata are visible only to the auditor wallet

### Tax Withholding
Validate:
- admin can save tax policy
- native `claim_salary` respects stored tax rate and authority
- employee gets `TaxPaidProof`
- tax authority gets `TaxVaultRecord`
- `tax_collected_total` increases correctly

### Analytics
Validate:
- admin charts update after successful payroll events
- range filters change aggregate values
- analytics persist across refresh through local ledger storage
- no raw employee-recipient analytics table is exposed

## 4. Current Contract Behaviors Worth Testing Explicitly

### Budget semantics
Current behavior:
- `initialize_payroll` sets initial budget ceiling
- `fund_payroll` adds to `payroll_budgets`

Test:
- initialize with one value
- fund with additional ALEO
- verify the mapping increases rather than staying fixed

### Tax scope
Current behavior:
- withholding is applied only inside `claim_salary`

Test:
- direct push ALEO payout should not generate tax receipts
- native claim payout should generate tax receipts and update totals

### Claim replay protection
Current behavior:
- `claimed_payments` blocks duplicate native claim settlement

Test:
- attempt a second approval for the same claim id
- expect rejection

## 5. CLI Examples for Focused Contract Checks

### Initialize payroll
```bash
leo execute initialize_payroll <BUDGET_U64> 1field <THRESHOLD_U64> <ADMIN1> <ADMIN2> <ADMIN3> <AUDITOR> --network testnet ...
```

Expected:
- payroll mappings are created
- initial `SpentRecord` is returned

### Set tax policy
```bash
leo execute set_tax_policy 1field 1000u16 <TAX_AUTHORITY_ADDRESS> --network testnet ...
```

Expected:
- `tax_percentage_bps[1field] = 1000u16`
- `tax_authority[1field] = <TAX_AUTHORITY_ADDRESS>`

### Generate audit report
```bash
leo execute generate_audit_report "[SPENT_RECORD]" <TIMESTAMP_U32> <PAY_PERIOD_HASH> <MERKLE_ROOT> --network testnet ...
```

Expected:
- auditor receives private `AuditReport`

## 6. Regression Checklist

When making changes, verify these still work:
- admin initialization
- private funding path
- direct ALEO payout
- vested payout issuance
- employee unlock flow
- employee pull request
- admin claim approval
- audit report generation
- analytics rendering
- tax authority receipt scanning

## 7. Known Testing Notes

- Wallet adapters may occasionally fail on the first interaction; the frontend now includes retry-safe helpers for record reads and transaction submissions.
- Stablecoin payout success depends on valid wallet-visible token records and proof assumptions in the frontend path.
- Batch payroll is sequential and should be tested as a sequence of approvals, not as a single parallel execution.

## 8. Recommended Human QA Reference

For a full end-to-end manual runbook, use:
- [../CHECKLIST.md](../CHECKLIST.md)
