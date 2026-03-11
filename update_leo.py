import re

with open("src/main.leo", "r") as f:
    orig_code = f.read()

code = orig_code

# Remove RecipientTicket struct
struct_pattern = r'''    /// RecipientTicket: Issued by M-of-N admins to authorize an employee
    record RecipientTicket \{
        owner: address,
        payroll_id: field,
    \}'''
code = re.sub(struct_pattern, "", code, flags=re.MULTILINE)

# Remove create_recipient_ticket transition and finalize
transition_pattern = r'''    /// create_recipient_ticket: Admins create a ticket for a salary recipient
    async transition create_recipient_ticket\(
.*?
        assert\(check1 \+ check2 \+ check3 >= threshold\);
    \}'''
code = re.sub(transition_pattern, "", code, flags=re.DOTALL)


# Update issue_salary transition
old_issue = r'''    /// issue_salary: Execute a private salary payment with Multi-Sig
    async transition issue_salary\(
        pay_record: credits.aleo/credits,
        spent_record: SpentRecord,
        recipient_ticket: RecipientTicket,
        public salary_amount: u64,
        public payment_id: field,
        public signatures: Signatures, 
        public signers: \[address; 3\]
    \) -> \(SpentRecord, SalaryRecord, credits.aleo/credits, credits.aleo/credits, Future\) \{

        assert_eq\(spent_record.payroll_id, recipient_ticket.payroll_id\);

        let new_total_spent: u64 = spent_record.total_spent \+ salary_amount;
        let msg_hash: field = BHP256::hash_to_field\(payment_id\); 

        // Perform the private transfer to the employee
        let \(remaining_credits, transferred_credits\): \(credits.aleo/credits, credits.aleo/credits\) = 
            credits.aleo/transfer_private\(pay_record, recipient_ticket.owner, salary_amount\);

        let new_spent_record: SpentRecord = SpentRecord \{
            owner: spent_record.owner, 
            total_spent: new_total_spent,
            payroll_id: spent_record.payroll_id,
            auditor: spent_record.auditor,
            recipient_count: spent_record.recipient_count \+ 1u32,
        \};

        let salary_record: SalaryRecord = SalaryRecord \{
            owner: recipient_ticket.owner,
            amount: salary_amount,
            payment_id: payment_id,
            payroll_id: spent_record.payroll_id,
        \};

        let f: Future = finalize_issue_salary\(spent_record.payroll_id, new_total_spent, signatures, signers, msg_hash\);
        return \(new_spent_record, salary_record, remaining_credits, transferred_credits, f\);
    \}'''

new_issue = """    /// issue_salary: Execute a private salary payment with Multi-Sig
    async transition issue_salary(
        pay_record: credits.aleo/credits,
        spent_record: SpentRecord,
        public recipient: address,
        public salary_amount: u64,
        public payment_id: field,
        public signatures: Signatures, 
        public signers: [address; 3]
    ) -> (SpentRecord, SalaryRecord, credits.aleo/credits, credits.aleo/credits, Future) {

        let new_total_spent: u64 = spent_record.total_spent + salary_amount;
        let msg_hash: field = BHP256::hash_to_field(payment_id); 

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

        let f: Future = finalize_issue_salary(spent_record.payroll_id, new_total_spent, signatures, signers, msg_hash);
        return (new_spent_record, salary_record, remaining_credits, transferred_credits, f);
    }"""
code = re.sub(old_issue, new_issue, code, flags=re.DOTALL)


# Update issue_salary_usdcx transition
old_issue_usdcx = r'''    /// issue_salary_usdcx: Execute a private salary payment with Multi-Sig using USDCx \(ARC-20\)
    async transition issue_salary_usdcx\(
        pay_record: test_usdcx_stablecoin.aleo/Token,
        spent_record: SpentRecord,
        recipient_ticket: RecipientTicket,
        public salary_amount: u128,
        public payment_id: field,
        public signatures: Signatures, 
        public signers: \[address; 3\],
        private proofs: \[test_usdcx_stablecoin.aleo/MerkleProof; 2\]
    \) -> \(SpentRecord, SalaryRecord, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/ComplianceRecord, Future\) \{

        assert_eq\(spent_record.payroll_id, recipient_ticket.payroll_id\);

        let new_total_spent: u64 = spent_record.total_spent \+ \(salary_amount as u64\);
        let msg_hash: field = BHP256::hash_to_field\(payment_id\); 

        // Perform the private transfer of USDCx to the employee
        let \(compliance_record, remaining_tokens, transferred_tokens, transfer_future\): \(test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, Future\) = 
            test_usdcx_stablecoin.aleo/transfer_private\(recipient_ticket.owner, salary_amount, pay_record, proofs\);

        let new_spent_record: SpentRecord = SpentRecord \{
            owner: spent_record.owner, 
            total_spent: new_total_spent,
            payroll_id: spent_record.payroll_id,
            auditor: spent_record.auditor,
            recipient_count: spent_record.recipient_count \+ 1u32,
        \};

        let salary_record: SalaryRecord = SalaryRecord \{
            owner: recipient_ticket.owner,
            amount: salary_amount as u64,
            payment_id: payment_id,
            payroll_id: spent_record.payroll_id,
        \};

        let f: Future = finalize_issue_salary_usdcx\(spent_record.payroll_id, new_total_spent, signatures, signers, msg_hash, transfer_future\);
        return \(new_spent_record, salary_record, remaining_tokens, transferred_tokens, compliance_record, f\);
    \}'''

new_issue_usdcx = """    /// issue_salary_usdcx: Execute a private salary payment with Multi-Sig using USDCx (ARC-20)
    async transition issue_salary_usdcx(
        pay_record: test_usdcx_stablecoin.aleo/Token,
        spent_record: SpentRecord,
        public recipient: address,
        public salary_amount: u128,
        public payment_id: field,
        public signatures: Signatures, 
        public signers: [address; 3],
        private proofs: [test_usdcx_stablecoin.aleo/MerkleProof; 2]
    ) -> (SpentRecord, SalaryRecord, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/ComplianceRecord, Future) {

        let new_total_spent: u64 = spent_record.total_spent + (salary_amount as u64);
        let msg_hash: field = BHP256::hash_to_field(payment_id); 

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
            amount: salary_amount as u64,
            payment_id: payment_id,
            payroll_id: spent_record.payroll_id,
        };

        let f: Future = finalize_issue_salary_usdcx(spent_record.payroll_id, new_total_spent, signatures, signers, msg_hash, transfer_future);
        return (new_spent_record, salary_record, remaining_tokens, transferred_tokens, compliance_record, f);
    }"""
code = re.sub(old_issue_usdcx, new_issue_usdcx, code, flags=re.DOTALL)

with open("src/main.leo", "w") as f:
    f.write(code)

print("Leo code updated")
