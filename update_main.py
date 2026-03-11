import re

with open("src/main.leo", "r") as f:
    code = f.read()

# 1. Update program name & imports
code = code.replace("import credits.aleo;\n\nprogram baba_zk_payroll_v9.aleo {", "import credits.aleo;\nimport test_usdcx_stablecoin.aleo;\n\nprogram baba_zk_payroll_v10.aleo {")

# 2. Delete SalaryCertificate record
salary_cert_block = """    /// SalaryCertificate: Right to claim recurring salary
    record SalaryCertificate {
        owner: address,
        amount: u64,
        start_height: u32,
        interval: u32,
        claim_count: u32,
        payroll_id: field,
    }

"""
code = code.replace(salary_cert_block, "")

# 3. Simplify fund_payroll
old_fund = """    /// fund_payroll: Admin deposits public funds to create a private pool of credits
    async transition fund_payroll(
        public amount: u64,
        public payroll_id: field,
        private receiver: address
    ) -> (credits.aleo/credits, Future) {
        // Transfer 'amount' from caller to the private 'receiver' (Admin)
        let (credit_record, f_transfer): (credits.aleo/credits, Future) = credits.aleo/transfer_public_to_private(receiver, amount);
        
        return (credit_record, finalize_fund_payroll(payroll_id, amount, f_transfer));
    }

    async function finalize_fund_payroll(payroll_id: field, amount: u64, f_transfer: Future) {
        // Await the actual credit transfer first
        f_transfer.await();

        // Increment the budget ceiling to reflect added funds
        let current_budget: u64 = Mapping::get_or_use(payroll_budgets, payroll_id, 0u64);
        Mapping::set(payroll_budgets, payroll_id, current_budget + amount);
    }"""

new_fund = """    /// fund_payroll: Admin registers funds to the payroll budget (Push Payment Model)
    async transition fund_payroll(
        public amount: u64,
        public payroll_id: field
    ) -> Future {
        return finalize_fund_payroll(payroll_id, amount);
    }

    async function finalize_fund_payroll(payroll_id: field, amount: u64) {
        let current_budget: u64 = Mapping::get_or_use(payroll_budgets, payroll_id, 0u64);
        Mapping::set(payroll_budgets, payroll_id, current_budget + amount);
    }"""

code = code.replace(old_fund, new_fund)

# 4. Remove issue_limit out to finalize_claim_salary
# Wait, replacing using substring for such a large block might fail if there's a space mismatch. 
# Better to find lines.
lines = code.split("\n")
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if "/// issue_limit: Admin issues a SalaryCertificate" in line:
        start_idx = i
    if "    async function finalize_claim_salary(claimable_height: u32) {" in line:
        end_idx = i + 5 # include the function body and closing brace

if start_idx != -1 and end_idx != -1:
    del lines[start_idx:end_idx]

# 5. Add issue_salary_usdcx
usdcx_transition = """
    /// issue_salary_usdcx: Execute a private salary payment with Multi-Sig using USDCx (ARC-20)
    async transition issue_salary_usdcx(
        pay_record: test_usdcx_stablecoin.aleo/Token,
        spent_record: SpentRecord,
        recipient_ticket: RecipientTicket,
        public salary_amount: u128,
        public payment_id: field,
        public signatures: Signatures, 
        public signers: [address; 3],
        private proofs: [test_usdcx_stablecoin.aleo/MerkleProof; 2]
    ) -> (SpentRecord, SalaryRecord, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/ComplianceRecord, Future) {

        assert_eq(spent_record.payroll_id, recipient_ticket.payroll_id);

        let salary_amount_u64: u64 = salary_amount as u64;
        let new_total_spent: u64 = spent_record.total_spent + salary_amount_u64;
        let msg_hash: field = BHP256::hash_to_field(payment_id); 

        // Perform the private transfer of USDCx to the employee
        let (compliance_record, remaining_tokens, transferred_tokens, transfer_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, Future) = 
            test_usdcx_stablecoin.aleo/transfer_private(recipient_ticket.owner, salary_amount, pay_record, proofs);

        let new_spent_record: SpentRecord = SpentRecord {
            owner: spent_record.owner, 
            total_spent: new_total_spent,
            payroll_id: spent_record.payroll_id,
            auditor: spent_record.auditor,
            recipient_count: spent_record.recipient_count + 1u32,
        };

        let salary_record: SalaryRecord = SalaryRecord {
            owner: recipient_ticket.owner,
            amount: salary_amount_u64,
            payment_id: payment_id,
            payroll_id: spent_record.payroll_id,
        };

        let f: Future = finalize_issue_salary_usdcx(spent_record.payroll_id, new_total_spent, signatures, signers, msg_hash, transfer_future);
        return (new_spent_record, salary_record, remaining_tokens, transferred_tokens, compliance_record, f);
    }

    async function finalize_issue_salary_usdcx(
        payroll_id: field,
        new_total_spent: u64,
        sigs: Signatures,
        signers: [address; 3],
        msg: field,
        f_transfer: Future
    ) {
        f_transfer.await();

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
"""

code_new = "\n".join(lines)
# Insert after finalize_issue_salary
insert_point = code_new.find("    /// generate_audit_report: Push private spending summary to auditor")
if insert_point != -1:
    code_new = code_new[:insert_point] + usdcx_transition + code_new[insert_point:]

with open("src/main.leo", "w") as f:
    f.write(code_new)

print("Updated main.leo")
