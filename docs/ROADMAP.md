# ZK Payroll Roadmap

This roadmap tracks the evolution of ZK Payroll from a proof-of-concept into a role-based privacy payroll platform on Aleo.

## Completed Waves

### Wave 1: Core Privacy Payroll Foundation
Status: Complete

Delivered:
- Private `SalaryRecord` issuance.
- Public budget ceiling enforcement through mappings.
- Initial `SpentRecord` accounting model.
- Basic testnet deployment and Leo-based verification.
- Early proof-of-concept UI and tooling.

### Wave 2: Wallet UX, Multi-Portal Flow, and Auditor Foundations
Status: Complete

Delivered:
- React / Next.js frontend with real wallet integration.
- Admin portal connected to live Aleo transitions.
- Auditor portal for decrypted `AuditReport` review.
- Multi-admin payroll initialization model.
- Improved auditor metadata such as recipient count and payroll commitments.
- Template-based batch workflow and stronger payroll operator UX.

### Wave 3: Enterprise Payroll Rails
Status: Complete

Delivered:
- ARC-20-style token payout rails for `USDCx` and `USAD`.
- Native ALEO direct push payouts.
- Time-delayed vesting with `VestingRecord` and `claim_vested`.
- Native ALEO treasury relayer flow for employee pull requests.
- Employee portal claim and salary history workflows.

## Wave 4: Productization and Operational Maturity
Status: In Progress

### 4.1 Zero-Knowledge Tax Withholding
Status: Complete as MVP

Delivered:
- Global tax policy configuration per payroll.
- `TaxPaidProof` record for employees.
- `TaxVaultRecord` for the tax authority.
- Tax split on native `claim_salary`.
- Employee JSON proof download.
- Tax authority portal for receipt visibility.
- Admin tax status and collected tax visibility.

Current scope limit:
- Tax is applied only on native `claim_salary`.
- Direct push ALEO and stablecoin payouts are not yet taxed.

### 4.2 Operational Payroll Cycle UX
Status: Complete for current scope

Delivered:
- Sequential payroll-cycle runner in the admin portal.
- Record-refresh logic to avoid stale `SpentRecord` reuse.
- Template-driven roster and pay-cycle workflow.
- Safer wallet-driven progression between consecutive payroll approvals.

### 4.3 Frontend Upgrades and Ecosystem Polish
Status: Largely Complete

Delivered:
- Refreshed landing page and role-driven navigation.
- Redesigned admin, employee, auditor, and tax authority experiences.
- Improved wallet resilience for repeated onclick actions.
- Cleaner black-and-white visual system and spacing pass.

Still open:
- Continued micro-polish on responsive layouts.
- Optional motion and visual refinement passes.

### 4.4 Dashboard and Analytics
Status: Complete for current frontend scope

Delivered:
- Admin analytics dashboard with time presets.
- Aggregate-only bar and pie visualizations.
- Total payout, active employee count, last payout time, and budget context.
- Local analytics event ledger with wallet-context aggregation.
- Data-scope messaging and privacy-preserving display.

Current scope limit:
- Analytics are wallet + local-ledger scoped, not global indexed analytics.

### 4.5 Non-Technical HR User Experience
Status: In Progress

Delivered:
- Human-readable portal copy and role separation.
- Guided funding flow for private balances.
- Template-driven payroll cycle builder.
- Admin relayer review model for employee claims.
- Tax authority role isolated into its own portal.

Still open:
- More abstraction around token-specific record management.
- Additional workflow guidance for first-time HR operators.
- More explicit in-product education around claim and treasury models.

## Wave 5: Advanced Batch Processing and Execution Scale
Status: Planned

### 5.1 Advanced Batch Processing

Goal:
- Move beyond the current sequential payroll runner into a stronger batch-execution model.

Planned work:
- True single-transition parallel batch proving.
- Native multi-currency batch execution.
- Threshold authorization over a batch root instead of per-transaction approval.
- Fewer repeated wallet approvals for large payroll runs.

## Next Practical Priorities

### Priority 1: Finish operational gaps in payroll behavior
- Expand withholding to direct ALEO payouts if desired.
- Decide whether budget ceiling should remain additive with treasury funding or become a fixed session ceiling.
- Improve stablecoin funding and spend ergonomics further.

### Priority 2: Make batch payroll stronger
- Add multi-currency batching.
- Reduce repeated wallet approvals where feasible.
- Explore safe batched authorization models.

### Priority 3: Deepen compliance workflows
- Expand tax authority reporting.
- Add richer export formats beyond JSON.
- Improve auditor history and period filtering.

## Longer-Term Waves

### Wave 6: HR / Oracle Integrations
Status: Planned

Possible direction:
- Privacy-preserving sync with Web2 HR systems.
- Off-chain employment attestations converted into private on-chain salary rights.
- Stronger automation for payroll roster updates.

### Wave 7: Enterprise Funding and Fiat Rails
Status: Planned

Possible direction:
- Fiat on-ramp and treasury funding integrations.
- Off-ramp support for payroll operators.
- Back-office accounting and enterprise finance connectors.
