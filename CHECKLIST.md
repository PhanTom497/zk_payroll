# Manual Verification Checklist (Push Payment & ARC-20 Model)

These steps will guide you through manually testing the new **Push Payment architecture** (incorporating `credits.aleo` and the mock `test_usdcx_stablecoin.aleo`) on your local machine using the Aleo Testnet.

## Phase 1: Deployment

1. **Deploy Contract `v18`**:
   Open a terminal, navigate to your `/zk_payroll` directory, and run the following deployment command:
   ```bash
   leo deploy --network testnet --endpoint "https://api.explorer.provable.com/v1" --private-key "YOUR_PRIVATE_KEY" --priority-fees 300000000 --broadcast --yes
   ```
   *Note: `baba_zk_payroll_v19.aleo` is now correctly configured in `program.json`.*

2. **Start the Frontend**:
   ```bash
   cd web 
   npm run dev
   ```

## Phase 2: System Setup

1. **Initialize Payroll**:
   - Open `localhost:3000/admin`.
   - Connect your testnet wallet.
   - Enter your Budget Ceiling and fill in the 3 Admin Addresses and Auditor Address.
   - Click "Initialize System". Wait for the success notification.

2. **Deposit Funds (Public Budget Accounting)**:
   - Go to the **Deposit Fund** tab.
   - Enter an amount (e.g., `50000000` for 50 credits).
   - Click "Deposit Funds". This executes the updated `fund_payroll` which only updates the on-chain max ceiling (no longer attempts cross-program public transfers).

## Phase 3: Push Payment (The Core Update)

Since we shifted to the NullPay Push Model, you must test paying an employee using a completely valid set of records.

1. **Verify Your Wallet Records**:
   To successfully execute `issue_salary`, your wallet extension must possess at least two records:
   - **Admin Pay Record**: A valid `credits.aleo/credits` (or `test_usdcx_stablecoin.aleo/Token`) record owned by the Admin with sufficient balance.
   - **Spent Record**: The record generated when you initialized the payroll.

   *Tip: If you do not have a private `credits.aleo` record, go to the **Deposit Fund** tab and use the **Convert Public to Private** button to generate one before attempting an issue.*

2. **Execute the Push automatically**:
   - Go to the **Authorize Payroll** tab.
   - Enter the Employee Address and Salary Amount.
   - Click **Authorize Payroll**. 
   - A visual **Multi-Signature Authorization Modal** will appear.
   - Click **"Sign Message"** for Admin 1, Admin 2, and Admin 3. Your Aleo Wallet will pop up 3 separate times requesting you to cryptographically sign a `payment_id` hash. 
   *(For testing, you may assign your single wallet address to all 3 Admin slots during initialization. If so, simply click all 3 buttons.)*
   - Once all 3 signatures are collected, the UI will *automatically* construct the transaction and prompt you to approve the final transfer in your wallet extension.

## Phase 4: Employee Verification

1. **Verify Receipt**:
   - Open `localhost:3000/employee` and connect with the Employee's wallet.
   - You should see a new `SalaryRecord` appear in the history, proving the funds were pushed privately.
   - Your wallet balance (for either Credits or USDCx depending on which transition was tested) will have incremented privately!
