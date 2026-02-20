# ZK Payroll Architecture

## System Overview

ZK Payroll is a privacy-preserving payroll management system built on Aleo. It leverages zero-knowledge proofs (ZKPs) to enable private salary payments while enforcing a public budget ceiling. This hybrid model ensures both contributor privacy and organizational transparency.

---

## core Components

### 1. Smart Contract (`main.leo`)

The heart of the system, written in Leo. It manages:

- **State Records**: Encrypted data structures for admin control, spending tracking, and recipient tickets.
- **Transitions**: Functions that execute logic and generate ZK proofs.
- **Mappings**: Public on-chain storage for budget enforcement.

### 2. Record Structures

#### `SpentRecord`
- **Owner**: Admin
- **Purpose**: Tracking cumulative spending privately for Push payments and initialization
- **Privacy**: `total_spent` is encrypted but proven correct via ZK
- **Fields**:
  - `owner`: Address of the admin
  - `total_spent`: u64, cumulative amount paid out so far (private)
  - `payroll_id`: Links to the payroll instance
  - `auditor`: Address of the authorized auditor
  - `recipient_count`: Number of private payments made

#### `SpentRecord`
- **Owner**: Admin
- **Purpose**: Tracking cumulative spending privately
- **Privacy**: `total_spent` is encrypted but proven correct via ZK
- **Fields**:
  - `owner`: Address of the admin
  - `total_spent`: u64, cumulative amount paid out so far (private)
  - `payroll_id`: Links to the payroll instance
  - `auditor`: Address of the authorized auditor

#### `RecipientTicket`
- **Owner**: Recipient (Employee)
- **Purpose**: Authenticating a recipient without revealing their identity during payout
- **Privacy**: Encrypted record owned by the employee
- **Fields**:
  - `owner`: Address of the employee
  - `payroll_id`: Links to the correct payroll instance

#### `SalaryCertificate`
- **Owner**: Recipient (Employee)
- **Purpose**: Represents the right to claim a recurring salary (Pull Model)
- **Privacy**: Only the recipient can decrypt the terms
- **Fields**:
  - `owner`: Address of the employee
  - `amount`: u64, the salary amount (private)
  - `start_height`: Block height when claiming begins
  - `interval`: Blocks required between claims
  - `claim_count`: Number of successful claims made
  - `payroll_id`: Links to the payroll instance

#### `SalaryRecord`
- **Owner**: Recipient (Employee)
- **Purpose**: The actual payment record/voucher
- **Privacy**: Only the recipient can decrypt the amount
- **Fields**:
  - `owner`: Address of the employee
  - `amount`: u64, the salary amount (private)
  - `payment_id`: Unique ID for the payment transaction
  - `payroll_id`: Links to the payroll instance

#### `AuditReport` (Wave 2)
- **Owner**: Auditor
- **Purpose**: Providing proof of solvency to a designated auditor
- **Privacy**: Encrypted for the auditor; reveals `total_spent` without individual salaries
- **Fields**:
  - `owner`: Auditor's address
  - `total_spent`: u64, current total spending (private)
  - `payroll_id`: Links to payroll instance
  - `timestamp`: u32, time of report generation

## Data Flow & Architecture Diagram

```mermaid
graph TD
    User[DAO Admin] -->|1. Initialize Multi-Sig| Init[initialize_payroll]
    Init -->|Public| Budget[Mapping: payroll_budgets]
    Init -->|Private| SR[SpentRecord]

    subgraph Push Model
        User -->|Issue Direct Pay| Issue[issue_salary]
        SR --> Issue
        Emp1[Contractor] -->|Provide Ticket| Issue
        Issue -->|Success| SR_New[Updated SpentRecord]
        Issue -->|Success| Pay1[SalaryRecord]
        Pay1 --> Emp1
    end

    subgraph Pull Model
        User -->|Set Salary Limit| Limit[issue_limit]
        Limit -->|Private Right| SC[SalaryCertificate]
        SC --> Emp2[Core Employee]
        
        Emp2 -->|Self-Claim| Claim[claim_salary]
        SC --> Claim
        Claim -->|Generate| Pay2[SalaryRecord]
        Pay2 --> Emp2
        Claim -->|Update| SC_New[Updated SalaryCertificate]
    end

    User -->|Audit Generation| AuditTx[generate_audit_report]
    SR_New --> AuditTx
    AuditTx -->|Private Report| Auditor[Auditor]
```

---

## Key Privacy Features

1.  **Private Salaries**: The `amount` in `SalaryRecord` is encrypted. Only the employee can see their salary.
2.  **Hidden Total Spent**: The `total_spent` in `SpentRecord` is encrypted. The public only sees that a valid transition occurred, ensuring the total is $\le$ the budget.
3.  **Selective Disclosure**: The `AuditReport` allows the admin to reveal the `total_spent` to a specific auditor without making it public.
4.  **Recipient Privacy**: `RecipientTicket` allows employees to receive funds without their address being directly linked to the payout transaction in cleartext arguments.

---

## Security Model

-   **Budget Enforcement**: The `finalize` blocks assert logic limits against on-chain mappings.
-   **Multi-Sig Authorization**: `issue_salary` checks a 3-of-3 or threshold signatures struct to prevent unilateral rogue admin actions.
-   **Airgapped Claims**: `claim_salary` does not modify `SpentRecord`, meaning a compromised employee claim flow cannot poison the organization's verified reporting metric.
-   **Payroll Isolation**: `payroll_id` ensures that records from one payroll instance cannot be used in another.
