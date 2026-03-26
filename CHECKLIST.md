# ZK Payroll Manual QA Checklist

Use this checklist when validating the full system after contract or frontend changes.

## Pre-Flight

- Deploy or connect to the intended `baba_zk_payroll_v24.aleo` instance.
- Start the frontend with `npm run dev` inside `web/`.
- Make sure you have wallets for:
  - admin
  - employee
  - auditor
  - tax authority
- Clear stale browser local storage if you want a clean analytics and pending-claim run.

## 1. Landing Page and Navigation

Check:
- landing page renders correctly
- main navigation routes work
- portals visible: admin, employee, auditor, tax, docs
- wallet connection status appears consistently

## 2. Admin Portal

### 2.1 Setup
Check:
- admin wallet can initialize payroll
- budget, threshold, admin addresses, and auditor save correctly
- setup state disappears after successful initialization

### 2.2 Add Budget
Check:
- tax policy form saves successfully
- current spend / budget context updates
- public-to-private token preparation flow works in UI
- native ALEO funding increases payroll budget context

### 2.3 Pay One Employee
Check:
- direct native ALEO payout works
- direct USDCx payout path works when suitable token records exist
- direct USAD payout path works when suitable token records exist
- optional vesting delay creates delayed native payout instead of instant push

### 2.4 Run Payroll Cycle
Check:
- template presets populate values correctly
- saved templates reload correctly
- sequential payroll cycle opens wallet approvals one by one
- status text updates during run
- no stale-record double-spend errors appear during normal run

### 2.5 Employee Claims
Check:
- employee pull requests appear in queue
- admin can approve request
- claim settles successfully
- queue item disappears or updates after success

### 2.6 Reports and Audit
Check:
- generate audit report action succeeds
- new report is later visible in auditor portal

### 2.7 Analytics
Check:
- charts render without exposing raw employee lists
- time filters update totals and charts
- KPI cards update after payroll activity
- analytics survive page refresh via local storage

## 3. Employee Portal

### 3.1 Record Scan
Check:
- scan succeeds on first click
- available salary rights appear in credits, not raw microcredits
- direct push history renders

### 3.2 Vesting and Claim
Check:
- unlocked vesting entries can be withdrawn
- employee can submit pull request for admin approval
- success and error states are understandable

### 3.3 Tax Proofs
Check:
- taxed native claim creates employee-side proof entry
- JSON download works
- JSON includes gross, tax, net, payment id, payroll id, and authority

## 4. Auditor Portal

Check:
- auditor wallet can scan `AuditReport` records
- no-report empty state works
- report cards show total spent, recipient count, period hash, and merkle root
- scan action works without repeated first-click failures

## 5. Tax Authority Portal

Check:
- only configured authority wallet gets access
- tax receipts scan successfully
- aggregate metrics render correctly
- receipt JSON download works

## 6. Cross-Portal End-to-End Run

Recommended path:
1. Initialize payroll.
2. Save tax policy.
3. Fund payroll.
4. Issue one delayed native payout.
5. Unlock from employee side.
6. Submit employee pull request.
7. Approve claim from admin side.
8. Verify employee net receipt.
9. Verify employee tax proof.
10. Verify tax authority receipt.
11. Generate audit report.
12. Verify auditor visibility.
13. Verify analytics update.

## 7. Current Known Product Constraints

Remember during QA:
- tax withholding currently applies only to native `claim_salary`
- budget ceiling currently grows when payroll funding is added
- analytics are local-ledger and wallet-context based, not globally indexed
- batch payroll is sequential, not single-transition parallel batching

## 8. Release Sign-Off Questions

Before calling a build ready, confirm:
- do all wallet-triggered actions work on first click or recover automatically?
- do all portals show only the records appropriate to that role?
- do taxed claims create both employee and authority receipts?
- do docs match the currently deployed contract behavior?
