program baba_zk_payroll_v3.aleo {

    // ========================================================================
    // STRUCTURES
    // ========================================================================

    struct Signatures {
        sig1: signature,
        sig2: signature,
        sig3: signature,
    }

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

    /// create_recipient_ticket: Admins create a ticket for a salary recipient
    async transition create_recipient_ticket(
        public payroll_id: field,
        public recipient: address,
        public signatures: Signatures,
        public signers: [address; 3] 
    ) -> (RecipientTicket, Future) {
        
        let ticket: RecipientTicket = RecipientTicket {
            owner: recipient,
            payroll_id: payroll_id,
        };

        let f: Future = finalize_create_ticket(payroll_id, signatures, signers, recipient);
        return (ticket, f);
    }

    async function finalize_create_ticket(
        payroll_id: field,
        sigs: Signatures,
        signers: [address; 3], 
        recipient: address
    ) {
        let threshold: u64 = Mapping::get(multisig_threshold, payroll_id);
        let real_admin1: address = Mapping::get(admin_1, payroll_id);
        let real_admin2: address = Mapping::get(admin_2, payroll_id);
        let real_admin3: address = Mapping::get(admin_3, payroll_id);

        // Check Sig 1
        let is_signer1_valid: bool = (signers[0u8] == real_admin1 || signers[0u8] == real_admin2 || signers[0u8] == real_admin3);
        let check1: u64 = (is_signer1_valid && sigs.sig1.verify(signers[0u8], recipient)) ? 1u64 : 0u64;

        // Check Sig 2
        let is_signer2_valid: bool = (signers[1u8] == real_admin1 || signers[1u8] == real_admin2 || signers[1u8] == real_admin3);
        let is_unique2: bool = (signers[1u8] != signers[0u8]);
        let check2: u64 = (is_signer2_valid && is_unique2 && sigs.sig2.verify(signers[1u8], recipient)) ? 1u64 : 0u64;

        // Check Sig 3
        let is_signer3_valid: bool = (signers[2u8] == real_admin1 || signers[2u8] == real_admin2 || signers[2u8] == real_admin3);
        let is_unique3: bool = (signers[2u8] != signers[0u8] && signers[2u8] != signers[1u8]);
        let check3: u64 = (is_signer3_valid && is_unique3 && sigs.sig3.verify(signers[2u8], recipient)) ? 1u64 : 0u64;

        assert(check1 + check2 + check3 >= threshold);
    }

    /// issue_salary: Execute a private salary payment with Multi-Sig
    async transition issue_salary(
        spent_record: SpentRecord,
        recipient_ticket: RecipientTicket,
        public salary_amount: u64,
        public payment_id: field,
        public signatures: Signatures, 
        public signers: [address; 3]
    ) -> (SpentRecord, SalaryRecord, Future) {

        assert_eq(spent_record.payroll_id, recipient_ticket.payroll_id);

        let new_total_spent: u64 = spent_record.total_spent + salary_amount;
        let msg_hash: field = BHP256::hash_to_field(payment_id); 

        let new_spent_record: SpentRecord = SpentRecord {
            owner: spent_record.owner, 
            total_spent: new_total_spent,
            payroll_id: spent_record.payroll_id,
            auditor: spent_record.auditor,
            recipient_count: spent_record.recipient_count + 1u32,
        };

        let salary_record: SalaryRecord = SalaryRecord {
            owner: recipient_ticket.owner,
            amount: salary_amount,
            payment_id: payment_id,
            payroll_id: spent_record.payroll_id,
        };

        let f: Future = finalize_issue_salary(spent_record.payroll_id, new_total_spent, signatures, signers, msg_hash);
        return (new_spent_record, salary_record, f);
    }

    async function finalize_issue_salary(
        payroll_id: field,
        new_total_spent: u64,
        sigs: Signatures,
        signers: [address; 3],
        msg: field
    ) {
        // 1. Check Budget
        let budget_ceiling: u64 = Mapping::get(payroll_budgets, payroll_id);
        assert(new_total_spent <= budget_ceiling);

        // 2. Verify Multi-Sig
        let threshold: u64 = Mapping::get(multisig_threshold, payroll_id);
        let real_admin1: address = Mapping::get(admin_1, payroll_id);
        let real_admin2: address = Mapping::get(admin_2, payroll_id);
        let real_admin3: address = Mapping::get(admin_3, payroll_id);

        // Check Sig 1
        let is_signer1_valid: bool = (signers[0u8] == real_admin1 || signers[0u8] == real_admin2 || signers[0u8] == real_admin3);
        let check1: u64 = (is_signer1_valid && sigs.sig1.verify(signers[0u8], msg)) ? 1u64 : 0u64;

        // Check Sig 2
        let is_signer2_valid: bool = (signers[1u8] == real_admin1 || signers[1u8] == real_admin2 || signers[1u8] == real_admin3);
        let is_unique2: bool = (signers[1u8] != signers[0u8]);
        let check2: u64 = (is_signer2_valid && is_unique2 && sigs.sig2.verify(signers[1u8], msg)) ? 1u64 : 0u64;

        // Check Sig 3
        let is_signer3_valid: bool = (signers[2u8] == real_admin1 || signers[2u8] == real_admin2 || signers[2u8] == real_admin3);
        let is_unique3: bool = (signers[2u8] != signers[0u8] && signers[2u8] != signers[1u8]);
        let check3: u64 = (is_signer3_valid && is_unique3 && sigs.sig3.verify(signers[2u8], msg)) ? 1u64 : 0u64;

        assert(check1 + check2 + check3 >= threshold);
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
