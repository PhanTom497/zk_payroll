# ZK Payroll - Privacy-Preserving DAO Payments

> 🔐 **Wave-1 Submission** for Aleo Privacy Buildathon 2025

## Quick Start

```bash
# Build the contract
cd zk_payroll
leo build

# View the demo
open demo/index.html
```

## What This Proves

| Observer Sees | Hidden by ZK |
|--------------|--------------|
| Budget: 1000 | Alice: 400 |
| Used: 75% | Bob: 350 |
| Constraint: ✅ | Total: 750 |

## Project Structure

```
zk_payroll/
├── src/main.leo      # Core contract
├── demo/             # Interactive demo
├── SUBMISSION.md     # Judge summary
└── ARCHITECTURE.md   # ZK design
```

## Security

4 hardening measures implemented:
1. Budget from on-chain mapping
2. Caller binding check
3. RecipientTicket pattern
4. Payroll ID consistency

## License

MIT
