import credits.aleo;
import test_usdcx_stablecoin.aleo;
import test_usad_stablecoin.aleo;

program baba_zk_payroll_v19.aleo {

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

    // ... existing AuditReport ...

    // ========================================================================
    // PULL PAYMENT TRANSITIONS (Wave 2)
    // ========================================================================

    /// fund_payroll: Admin registers funds to the payroll budget (Push Payment Model)
    async transition fund_payroll(
        public amount: u64,
        public payroll_id: field
    ) -> Future {
        return finalize_fund_payroll(payroll_id, amount);
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
