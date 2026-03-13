import credits.aleo;
import test_usdcx_stablecoin.aleo;
import test_usad_stablecoin.aleo;

program baba_zk_payroll_v22.aleo {

    // ========================================================================
    // RECORDS
    // ========================================================================
    // RECORDS
    // ========================================================================

    /// SpentRecord: Tracks cumulative spent amount (state-channel pattern)
    record SpentRecord {
        owner: address,      // Admin who owns this tracker (usually the first admin)
        total_spent: u64,    // Cumulative amount spent (PRIVATE)
        payroll_id: field,   // Links to specific payroll instance
        auditor: address,    // Auditor reference for report generation
        recipient_count: u32, // Number of private payments made
    }

    /// RecipientTicket: Private wrapper for recipient address
    record RecipientTicket {
        owner: address,      // The recipient who will receive salary
        payroll_id: field,   // Links to specific payroll instance
    }

    /// SalaryRecord: Encrypted salary payment delivered to contributor
    record SalaryRecord {
        owner: address,      // Recipient of the salary (PRIVATE)
        amount: u64,         // Salary amount in credits (PRIVATE)
        payment_id: field,   // Unique payment identifier (PRIVATE)
        payroll_id: field,   // Links to payroll instance (PRIVATE)
    }

    /// VestingRecord: Time-locked wrapper
    record VestingRecord {
        owner: address,      // Employee recipient
        amount: u64,         // Salary amount
        payment_id: field,   // Unique payment identifier
        payroll_id: field,   // Links to payroll instance
        unlock_height: u32,  // Block height when it becomes available
    }

    /// SalaryCertificate: Unlocked right to claim salary
    record SalaryCertificate {
        owner: address,      // Employee recipient
        amount: u64,         // Salary amount
        start_height: u32,   // Block height it was unlocked
        interval: u32,       // 0 for vesting
        claim_count: u32,    // 0 initially
        payroll_id: field,   // Links to payroll instance
        payment_id: field,   // Unique payment identifier
    }

    /// TreasuryRecord: A central pool of funds owned by the Program Multisig threshold
    record TreasuryRecord {
        owner: address,      // MultiSigAdmin address
        balance: u64,        // Available unspent amount in Native Credits
        payroll_id: field,   // Links to specific payroll instance
    }

    // ... existing AuditReport ...

    // ========================================================================
    // PULL PAYMENT TRANSITIONS (Wave 2)
    // ========================================================================

    /// fund_payroll: Admin registers funds to the treasury pool (Native Pull Model)
    async transition fund_payroll(
        pay_record: credits.aleo/credits,
        public admin_multisig: address,
        public amount: u64,
        public payroll_id: field
    ) -> (TreasuryRecord, credits.aleo/credits, credits.aleo/credits, Future) {
        
        let treasury: TreasuryRecord = TreasuryRecord {
            owner: admin_multisig,
            balance: amount,
            payroll_id: payroll_id,
        };

        let (remaining, transferred): (credits.aleo/credits, credits.aleo/credits) = 
            credits.aleo/transfer_private(pay_record, admin_multisig, amount);

        let f: Future = finalize_fund_payroll(payroll_id, amount);
        return (treasury, remaining, transferred, f);
    }

    async function finalize_fund_payroll(payroll_id: field, amount: u64) {
        let current_budget: u64 = Mapping::get_or_use(payroll_budgets, payroll_id, 0u64);
        Mapping::set(payroll_budgets, payroll_id, current_budget + amount);
    }

    /// AuditReport: Private spending summary for compliance auditor
    record AuditReport {
        owner: address,      // The auditor who receives this report
        total_spent: u64,    // Private total revealed ONLY to auditor
        payroll_id: field,   // Links to payroll instance
        timestamp: u32,      // When the report was generated
        // Enhanced Auditor Metadata
        recipient_count: u32, // Verified count of recipients
        pay_period_hash: field, // Commitment to pay period range
        merkle_root: field,   // Commitment to recipient set
    }

    // ========================================================================
    // MAPPINGS (Public State)
    // ========================================================================

    // Stores the payroll budget ceiling
    mapping payroll_budgets: field => u64;

    // Stores the M-of-N threshold for a payroll
    mapping multisig_threshold: field => u64;

    // Stores the admin members
    mapping admin_1: field => address;
    mapping admin_2: field => address;
    mapping admin_3: field => address;

    // Prevents double-pulling a salary certificate
    mapping claimed_payments: field => bool;

    // ========================================================================
    // TRANSITIONS
    // ========================================================================

    /// initialize_payroll: Create a new DAO payroll with M-of-N admins
    async transition initialize_payroll(
        public budget_ceiling: u64,
        public payroll_id: field,
        public threshold: u64,
        public admin1: address,
        public admin2: address,
        public admin3: address,
        private auditor: address
    ) -> (SpentRecord, Future) {
        
        let spent_record: SpentRecord = SpentRecord {
            owner: admin1,
            total_spent: 0u64,
            payroll_id: payroll_id,
            auditor: auditor,
            recipient_count: 0u32,
        };

        let f: Future = finalize_initialize_payroll(payroll_id, budget_ceiling, threshold, admin1, admin2, admin3);
        return (spent_record, f);
    }

    async function finalize_initialize_payroll(
        payroll_id: field,
        budget_ceiling: u64,
        threshold: u64,
        a1: address,
        a2: address,
        a3: address
    ) {
        Mapping::set(payroll_budgets, payroll_id, budget_ceiling);
        Mapping::set(multisig_threshold, payroll_id, threshold);
        Mapping::set(admin_1, payroll_id, a1);
        Mapping::set(admin_2, payroll_id, a2);
        Mapping::set(admin_3, payroll_id, a3);
    }



    /// issue_salary: Execute a private salary payment with Multi-Sig
    async transition issue_salary(
        pay_record: credits.aleo/credits,
        spent_record: SpentRecord,
        public recipient: address,
        public salary_amount: u64,
        public payment_id: field
    ) -> (SpentRecord, SalaryRecord, credits.aleo/credits, credits.aleo/credits, Future) {

        let new_total_spent: u64 = spent_record.total_spent + salary_amount;
        // Perform the private transfer to the employee
        let (remaining_credits, transferred_credits): (credits.aleo/credits, credits.aleo/credits) = 
            credits.aleo/transfer_private(pay_record, recipient, salary_amount);

        let new_spent_record: SpentRecord = SpentRecord {
            owner: spent_record.owner, 
            total_spent: new_total_spent,
            payroll_id: spent_record.payroll_id,
            auditor: spent_record.auditor,
            recipient_count: spent_record.recipient_count + 1u32,
        };

        let salary_record: SalaryRecord = SalaryRecord {
            owner: recipient,
            amount: salary_amount,
            payment_id: payment_id,
            payroll_id: spent_record.payroll_id,
        };

        let f: Future = finalize_issue_salary(spent_record.payroll_id, new_total_spent);
        return (new_spent_record, salary_record, remaining_credits, transferred_credits, f);
    }

    async function finalize_issue_salary(
        payroll_id: field,
        new_total_spent: u64
    ) {
        // 1. Check Budget
        let budget_ceiling: u64 = Mapping::get(payroll_budgets, payroll_id);
        assert(new_total_spent <= budget_ceiling);
    }


    /// issue_salary_usdcx: Execute a private salary payment with Multi-Sig using USDCx (ARC-20)
    async transition issue_salary_usdcx(
        pay_record: test_usdcx_stablecoin.aleo/Token,
        spent_record: SpentRecord,
        public recipient: address,
        public salary_amount: u128,
        public payment_id: field,
        private proofs: [test_usdcx_stablecoin.aleo/MerkleProof; 2]
    ) -> (SpentRecord, SalaryRecord, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/ComplianceRecord, Future) {

        let salary_amount_u64: u64 = salary_amount as u64;
        let new_total_spent: u64 = spent_record.total_spent + salary_amount_u64;

        // Perform the private transfer of USDCx to the employee
        let (compliance_record, remaining_tokens, transferred_tokens, transfer_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, Future) = 
            test_usdcx_stablecoin.aleo/transfer_private(recipient, salary_amount, pay_record, proofs);

        let new_spent_record: SpentRecord = SpentRecord {
            owner: spent_record.owner, 
            total_spent: new_total_spent,
            payroll_id: spent_record.payroll_id,
            auditor: spent_record.auditor,
            recipient_count: spent_record.recipient_count + 1u32,
        };

        let salary_record: SalaryRecord = SalaryRecord {
            owner: recipient,
            amount: salary_amount_u64,
            payment_id: payment_id,
            payroll_id: spent_record.payroll_id,
        };

        let f: Future = finalize_issue_salary_usdcx(spent_record.payroll_id, new_total_spent, transfer_future);
        return (new_spent_record, salary_record, remaining_tokens, transferred_tokens, compliance_record, f);
    }

    async function finalize_issue_salary_usdcx(
        payroll_id: field,
        new_total_spent: u64,
        f_transfer: Future
    ) {
        f_transfer.await();

        // 1. Check Budget
        let budget_ceiling: u64 = Mapping::get(payroll_budgets, payroll_id);
        assert(new_total_spent <= budget_ceiling);
    }

    /// issue_salary_usad: Execute a private salary payment with Multi-Sig using USAD (ARC-20)
    async transition issue_salary_usad(
        pay_record: test_usad_stablecoin.aleo/Token,
        spent_record: SpentRecord,
        public recipient: address,
        public salary_amount: u128,
        public payment_id: field,
        private proofs: [test_usad_stablecoin.aleo/MerkleProof; 2]
    ) -> (SpentRecord, SalaryRecord, test_usad_stablecoin.aleo/Token, test_usad_stablecoin.aleo/Token, test_usad_stablecoin.aleo/ComplianceRecord, Future) {

        let salary_amount_u64: u64 = salary_amount as u64;
        let new_total_spent: u64 = spent_record.total_spent + salary_amount_u64;

        // Perform the private transfer of USAD to the employee
        let (compliance_record, remaining_tokens, transferred_tokens, transfer_future): (test_usad_stablecoin.aleo/ComplianceRecord, test_usad_stablecoin.aleo/Token, test_usad_stablecoin.aleo/Token, Future) = 
            test_usad_stablecoin.aleo/transfer_private(recipient, salary_amount, pay_record, proofs);

        let new_spent_record: SpentRecord = SpentRecord {
            owner: spent_record.owner, 
            total_spent: new_total_spent,
            payroll_id: spent_record.payroll_id,
            auditor: spent_record.auditor,
            recipient_count: spent_record.recipient_count + 1u32,
        };

        let salary_record: SalaryRecord = SalaryRecord {
            owner: recipient,
            amount: salary_amount_u64,
            payment_id: payment_id,
            payroll_id: spent_record.payroll_id,
        };

        let f: Future = finalize_issue_salary_usad(spent_record.payroll_id, new_total_spent, transfer_future);
        return (new_spent_record, salary_record, remaining_tokens, transferred_tokens, compliance_record, f);
    }

    async function finalize_issue_salary_usad(
        payroll_id: field,
        new_total_spent: u64,
        f_transfer: Future
    ) {
        f_transfer.await();

        // 1. Check Budget
        let budget_ceiling: u64 = Mapping::get(payroll_budgets, payroll_id);
        assert(new_total_spent <= budget_ceiling);
    }

    /// issue_vested_salary: Create a time-locked VestingRecord for an employee. (No actual token transfer until Phase 3 Pull model)
    async transition issue_vested_salary(
        spent_record: SpentRecord,
        public recipient: address,
        public amount: u64,
        public payment_id: field,
        public unlock_height: u32
    ) -> (SpentRecord, VestingRecord, Future) {
        
        let new_total_spent: u64 = spent_record.total_spent + amount;
        
        let new_spent_record: SpentRecord = SpentRecord {
            owner: spent_record.owner,
            total_spent: new_total_spent,
            payroll_id: spent_record.payroll_id,
            auditor: spent_record.auditor,
            recipient_count: spent_record.recipient_count + 1u32,
        };

        let vesting_record: VestingRecord = VestingRecord {
            owner: recipient,
            amount: amount,
            payment_id: payment_id,
            payroll_id: spent_record.payroll_id,
            unlock_height: unlock_height,
        };

        let f: Future = finalize_issue_vested(spent_record.payroll_id, new_total_spent);
        return (new_spent_record, vesting_record, f);
    }

    async function finalize_issue_vested(
        payroll_id: field,
        new_total_spent: u64
    ) {
        let budget_ceiling: u64 = Mapping::get(payroll_budgets, payroll_id);
        assert(new_total_spent <= budget_ceiling);
    }

    /// claim_vested: Employee unlocks their VestingRecord into a spendable SalaryCertificate
    async transition claim_vested(
        vesting_record: VestingRecord
    ) -> (SalaryCertificate, Future) {
        let cert: SalaryCertificate = SalaryCertificate {
            owner: vesting_record.owner,
            amount: vesting_record.amount,
            start_height: vesting_record.unlock_height,
            interval: 0u32,      // 0 represents a one-time vesting claim
            claim_count: 0u32,   // 0 initially
            payroll_id: vesting_record.payroll_id,
            payment_id: vesting_record.payment_id,
        };

        let f: Future = finalize_claim_vested(vesting_record.unlock_height);
        return (cert, f);
    }

    async function finalize_claim_vested(unlock_height: u32) {
        // Assert that the current block height has surpassed the unlock_height
        assert(block.height >= unlock_height);
    }

    /// claim_salary: Employee redeems their SalaryCertificate and Admin hook processes it using TreasuryRecord
    async transition claim_salary(
        treasury: TreasuryRecord,
        treasury_tokens: credits.aleo/credits,
        public employee: address,
        public amount: u64,
        public payment_id: field
    ) -> (credits.aleo/credits, credits.aleo/credits, TreasuryRecord, Future) {
        
        // Assert treasury constraints
        assert(treasury.balance >= amount);
        
        // Deduct from TreasuryRecord budget
        let new_treasury: TreasuryRecord = TreasuryRecord {
            owner: treasury.owner,
            balance: treasury.balance - amount,
            payroll_id: treasury.payroll_id,
        };

        // Physically transfer the Native Aleo Credits from the Treasury token record
        let (remaining_tokens, transferred_tokens): (credits.aleo/credits, credits.aleo/credits) = 
            credits.aleo/transfer_private(treasury_tokens, employee, amount);

        let f: Future = finalize_claim_salary(treasury.payroll_id, amount, payment_id);
        return (remaining_tokens, transferred_tokens, new_treasury, f);
    }

    async function finalize_claim_salary(payroll_id: field, amount: u64, payment_id: field) {
        // Decrease global public budget safely
        let current_budget: u64 = Mapping::get(payroll_budgets, payroll_id);
        Mapping::set(payroll_budgets, payroll_id, current_budget - amount);
        
        // Prevent double pulling by asserting the payment was not already claimed
        let is_claimed: bool = Mapping::get_or_use(claimed_payments, payment_id, false);
        assert_eq(is_claimed, false);
        Mapping::set(claimed_payments, payment_id, true);
    }

    /// generate_audit_report: Push private spending summary to auditor
    /// generate_audit_report: Push private spending summary to auditor
    transition generate_audit_report(
        spent_record: SpentRecord,
        timestamp: u32,
        public pay_period_hash: field,
        public merkle_root: field
    ) -> (SpentRecord, AuditReport) {
        
        let new_spent_record: SpentRecord = SpentRecord {
            owner: spent_record.owner,
            total_spent: spent_record.total_spent,
            payroll_id: spent_record.payroll_id,
            auditor: spent_record.auditor,
            recipient_count: spent_record.recipient_count,
        };

        let report: AuditReport = AuditReport {
            owner: spent_record.auditor,
            total_spent: spent_record.total_spent,
            payroll_id: spent_record.payroll_id,
            timestamp: timestamp,
            recipient_count: spent_record.recipient_count,
            pay_period_hash: pay_period_hash,
            merkle_root: merkle_root,
        };

        return (new_spent_record, report);
    }





    // Constructor
    @noupgrade
    async constructor() {}
}
