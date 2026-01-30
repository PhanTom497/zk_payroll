
program baba_zk_payroll.aleo {

    // ========================================================================
    // RECORDS (Private State - Encrypted on-chain)
    // ========================================================================

    /// AdminCap: Authorization capability for DAO payroll administrator
    /// 
    /// PRIVACY: Admin and auditor addresses are ONLY stored here (encrypted).
    ///  Added auditor field for selective disclosure to compliance officers.
    record AdminCap {
        owner: address,      // Admin who controls this payroll
        payroll_id: field,   // Links to specific payroll instance
        auditor: address,    //  Authorized auditor who can receive reports
    }

    /// SpentRecord: Tracks cumulative spent amount (state-channel pattern)
    ///
    ///  Added auditor field to maintain auditor reference across payments.
    record SpentRecord {
        owner: address,      // Admin who owns this tracker
        total_spent: u64,    // Cumulative amount spent (PRIVATE)
        payroll_id: field,   // Links to specific payroll instance
        auditor: address,    //  Auditor reference for report generation
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

    /// AuditReport:- Private spending summary for compliance auditor
    ///
    /// PURPOSE: Allows DAO admin to "push" a private spending summary to an auditor
    /// without revealing individual SalaryRecords or making total_spent public.
    ///
    /// PRIVACY: Only the auditor can decrypt this record.
    /// The blockchain explorer sees nothing about the amount.
    record AuditReport {
        owner: address,      // The auditor who receives this report
        total_spent: u64,    // Private total revealed ONLY to auditor
        payroll_id: field,   // Links to payroll instance
        timestamp: u32,      // When the report was generated
    }

    // ========================================================================
    // MAPPINGS (Public State - Visible on-chain)
    // ========================================================================

    mapping payroll_budgets: field => u64;
// ========================================================================
    // CONSTRUCTOR (ARC-0006 Compliance)
    // ========================================================================

    /// constructor: Only the specified admin can upgrade this program.
    @admin(address="aleo1esd4g8fzj9ygcsspfzuhfz59nmslhwg86n7pyh0q2pzhdkvq2uxqq4jxvr")
    async constructor() {
        // Initialization logic for the program's lifecycle
    }

    // ========================================================================
    // TRANSITIONS
    // ========================================================================

    /// initialize_payroll: Create a new DAO payroll with public budget
    ///
    ///  Now accepts auditor address as private input
    async transition initialize_payroll(
        public budget_ceiling: u64,
        payroll_id: field,
        private auditor: address  //  Auditor for selective disclosure
    ) -> (AdminCap, SpentRecord, Future) {
        
        // Create admin capability with auditor reference
        let admin_cap: AdminCap = AdminCap {
            owner: self.caller,
            payroll_id: payroll_id,
            auditor: auditor,        //  Store auditor
        };

        // Create initial spent tracker with auditor reference
        let spent_record: SpentRecord = SpentRecord {
            owner: self.caller,
            total_spent: 0u64,
            payroll_id: payroll_id,
            auditor: auditor,        //  Store auditor
        };

        let f: Future = finalize_initialize_payroll(payroll_id, budget_ceiling);
        return (admin_cap, spent_record, f);
    }

    async function finalize_initialize_payroll(
        payroll_id: field,
        budget_ceiling: u64
    ) {
        Mapping::set(payroll_budgets, payroll_id, budget_ceiling);
    }

    /// create_recipient_ticket: Admin creates a ticket for a salary recipient
    transition create_recipient_ticket(
        admin_cap: AdminCap,
        recipient: address
    ) -> (AdminCap, RecipientTicket) {
        
        assert_eq(self.caller, admin_cap.owner);

        // Recreate admin capability with auditor preserved
        let new_admin_cap: AdminCap = AdminCap {
            owner: admin_cap.owner,
            payroll_id: admin_cap.payroll_id,
            auditor: admin_cap.auditor,  //  Preserve auditor
        };

        let ticket: RecipientTicket = RecipientTicket {
            owner: recipient,
            payroll_id: admin_cap.payroll_id,
        };

        return (new_admin_cap, ticket);
    }

    /// issue_salary: Execute a private salary payment to a contributor
    ///
    ///  Maintains auditor field when recreating SpentRecord
    async transition issue_salary(
        admin_cap: AdminCap,
        spent_record: SpentRecord,
        recipient_ticket: RecipientTicket,
        private salary_amount: u64,
        private payment_id: field
    ) -> (AdminCap, SpentRecord, SalaryRecord, Future) {

        // Security checks
        assert_eq(self.caller, admin_cap.owner);
        assert_eq(admin_cap.payroll_id, spent_record.payroll_id);
        assert_eq(admin_cap.payroll_id, recipient_ticket.payroll_id);

        let new_total_spent: u64 = spent_record.total_spent + salary_amount;

        // Recreate admin capability with auditor preserved
        let new_admin_cap: AdminCap = AdminCap {
            owner: admin_cap.owner,
            payroll_id: admin_cap.payroll_id,
            auditor: admin_cap.auditor,  //  Preserve auditor
        };

        // Create updated spent record with auditor preserved
        let new_spent_record: SpentRecord = SpentRecord {
            owner: admin_cap.owner,
            total_spent: new_total_spent,
            payroll_id: admin_cap.payroll_id,
            auditor: spent_record.auditor,  //  Preserve auditor
        };

        let salary_record: SalaryRecord = SalaryRecord {
            owner: recipient_ticket.owner,
            amount: salary_amount,
            payment_id: payment_id,
            payroll_id: admin_cap.payroll_id,
        };

        let f: Future = finalize_issue_salary(admin_cap.payroll_id, new_total_spent);
        return (new_admin_cap, new_spent_record, salary_record, f);
    }

    async function finalize_issue_salary(
        payroll_id: field,
        new_total_spent: u64
    ) {
        let budget_ceiling: u64 = Mapping::get(payroll_budgets, payroll_id);
        assert(new_total_spent <= budget_ceiling);
    }

    // ========================================================================
    //  SELECTIVE DISCLOSURE
    // ========================================================================

    /// generate_audit_report: Push private spending summary to auditor
    ///
    /// PURPOSE: Allows DAO admin to proactively share total_spent with
    /// an authorized auditor WITHOUT revealing individual salaries or
    /// making the total public on the blockchain.
    ///
    /// INPUTS:
    /// - admin_cap: Proves caller is the authorized admin
    /// - spent_record: Contains the private total_spent to disclose
    /// - timestamp: When the report is generated (for audit trail)
    ///
    /// OUTPUTS:
    /// - AdminCap: Returned to admin (consumed and recreated)
    /// - SpentRecord: Returned to admin (consumed and recreated)
    /// - AuditReport: Owned by auditor, contains private total_spent
    ///
    /// PRIVACY: Only the auditor can decrypt the AuditReport.
    /// Blockchain observers see nothing about the spending amount.
    transition generate_audit_report(
        admin_cap: AdminCap,
        spent_record: SpentRecord,
        timestamp: u32
    ) -> (AdminCap, SpentRecord, AuditReport) {
        
        // Security: Only the admin can generate reports
        assert_eq(self.caller, admin_cap.owner);
        
        // Consistency: Records must belong to same payroll
        assert_eq(admin_cap.payroll_id, spent_record.payroll_id);

        // Recreate admin capability (consumed on use)
        let new_admin_cap: AdminCap = AdminCap {
            owner: admin_cap.owner,
            payroll_id: admin_cap.payroll_id,
            auditor: admin_cap.auditor,
        };

        // Recreate spent record (consumed on use)
        let new_spent_record: SpentRecord = SpentRecord {
            owner: spent_record.owner,
            total_spent: spent_record.total_spent,
            payroll_id: spent_record.payroll_id,
            auditor: spent_record.auditor,
        };

        // Create audit report OWNED BY THE AUDITOR
        // This is the selective disclosure: auditor receives total_spent
        // without seeing individual SalaryRecords
        let report: AuditReport = AuditReport {
            owner: admin_cap.auditor,        // Auditor owns this record
            total_spent: spent_record.total_spent,  // Private total disclosed
            payroll_id: admin_cap.payroll_id,
            timestamp: timestamp,
        };

        return (new_admin_cap, new_spent_record, report);
    }
}
