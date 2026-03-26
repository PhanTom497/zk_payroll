# ZK Payroll Web App

This directory contains the Next.js frontend for ZK Payroll.

## Routes

- `/` landing page
- `/admin` admin operations portal
- `/employee` employee portal
- `/auditor` auditor portal
- `/tax-authority` tax authority portal
- `/docs` frontend documentation experience

## Responsibilities

The web app is responsible for:
- wallet connection and route-level role experiences
- reading wallet-visible Aleo records
- constructing transition inputs for admin and employee actions
- rendering analytics from wallet context plus local event storage
- downloading JSON tax receipts
- presenting audit and tax records to the right wallets

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
```

## Notes

- The frontend includes retry-safe helpers for wallet record reads and transaction submission to reduce first-click wallet failures.
- Admin analytics are frontend-scoped and are not backed by a global indexer.
- Some flows depend on wallet-visible private records existing in the connected wallet session.
