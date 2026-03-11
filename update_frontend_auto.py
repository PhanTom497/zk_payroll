import re

with open("web/app/admin/page.tsx", "r") as f:
    orig_code = f.read()

code = orig_code

# We need to remove the manual inputs we added last time (adminPayRecord, spentRecord, recipientTicket)
# and replace handleIssueCertificate with an automated version

# 1. First remove the manual states
states_pattern = r'''    const \[adminPayRecord, setAdminPayRecord\] = useState\(""\)
    const \[recipientTicket, setRecipientTicket\] = useState\(""\)
    const \[spentRecord, setSpentRecord\] = useState\(""\)'''
code = re.sub(states_pattern, "", code)

# 2. Add the getMicrocredits helper function outside the component
helper_fn = """
function getMicrocredits(record: any): number {
    try {
        if (record.data && record.data.microcredits) {
            return parseInt(record.data.microcredits.replace('u64', ''));
        }
        if (record.plaintext) {
            const match = record.plaintext.match(/microcredits:\\s*([\\d_]+)u64/);
            if (match && match[1]) {
                return parseInt(match[1].replace(/_/g, ''));
            }
        }
        return 0;
    } catch {
        return 0;
    }
}
"""
if "function getMicrocredits" not in code:
    code = code.replace("export default function AdminPortal() {", helper_fn + "\nexport default function AdminPortal() {")

# 3. Replace handleIssueCertificate
old_handle = r'''    const handleIssueCertificate = async \(\) => \{
        if \(!publicKey \|\| !issueRecipient \|\| !issueAmount \|\| !adminPayRecord \|\| !recipientTicket \|\| !spentRecord\) \{
            toast.error\("Please provide all required records for push payment."\)
            return
        \}
        setIsTransacting\(true\)
        try \{
            // For testing, we mock the signatures and signers since it's a manual UI test
            // transition issue_salary\(pay_record, spent_record, recipient_ticket, salary_amount, payment_id, signatures, signers\)
            const inputs = \[
                adminPayRecord,
                spentRecord,
                recipientTicket,
                issueAmount \+ 'u64',
                '12345field', // Dummy payment ID
                "\{ sig1: sign0rustyx... , sig2: sign0rustyx... , sig3: sign0rustyx... \}", // Dummy sigs for testing
                `\[\$\{publicKey\}, \$\{publicKey\}, \$\{publicKey\}\]` // Dummy signers for testing
            \]

            const txId = await requestTransaction\(
                wallet\?.adapter!,
                publicKey,
                PROGRAM_ID,
                'issue_salary',
                inputs,
                300_000
            \)
            toast.success\("Salary Pushed Successfully! Transaction ID: " \+ txId\)
        \} catch \(err: any\) \{
            console.error\(err\)
            toast.error\("Error: " \+ err.message\)
        \} finally \{
            setIsTransacting\(false\)
        \}
    \}'''

new_handle = """    const handleIssueCertificate = async () => {
        if (!publicKey || !issueRecipient || !issueAmount) {
            toast.error("Please provide recipient and amount.")
            return
        }
        setIsTransacting(true)
        try {
            toast.info("1/3: Fetching SpentRecord...")
            // 1. Fetch Spent Record automatically
            const ourRecords = await (wallet as any)?.adapter?.requestRecords(PROGRAM_ID, true)
            const spentRec = (ourRecords as any[])?.filter((rec: any) => 
                !rec.spent && (rec.recordName === 'SpentRecord' || (rec.plaintext && rec.plaintext.includes('total_spent')))
            ).pop()

            if (!spentRec) {
                toast.error("No active SpentRecord found. Did you initialize the system?")
                setIsTransacting(false)
                return
            }
            
            let spentRecordStr = spentRec.plaintext || spentRec.recordPlaintext;
            if (!spentRecordStr && spentRec.ciphertext) spentRecordStr = spentRec.ciphertext;
            if (typeof spentRecordStr === 'string') spentRecordStr = spentRecordStr.replace(/\\n/g, '').replace(/ /g, '');

            toast.info("2/3: Searching for Credits Record...")
            // 2. Fetch credits.aleo records
            const creditRecords = await (wallet as any)?.adapter?.requestRecords('credits.aleo', false)
            const requiredMicrocredits = parseInt(issueAmount) * 1_000_000 // UI inputs are in whole credits usually, adjust if needed
            
            let payRecordStr = null;
            if (creditRecords && Array.isArray(creditRecords)) {
                for (const r of creditRecords) {
                    if (r.spent) continue;
                    const val = getMicrocredits(r);
                    const isSpendable = !!(r.plaintext || r.nonce || r._nonce || r.data?._nonce || r.ciphertext);
                    // Match 1:1 with user amount logic for safety (if issueAmount is raw microcredits, change the check)
                    if (isSpendable && val >= parseInt(issueAmount)) { 
                        payRecordStr = r.plaintext || r.recordPlaintext;
                        
                        if (!payRecordStr) {
                            const nonce = r.nonce || r._nonce || r.data?._nonce;
                            if (nonce) {
                                const microcredits = getMicrocredits(r.data);
                                payRecordStr = `{ owner: ${r.owner}.private, microcredits: ${microcredits}u64.private, _nonce: ${nonce}.public }`;
                            } else if (r.ciphertext) {
                                payRecordStr = r.ciphertext;
                            } else {
                                payRecordStr = r;
                            }
                        }
                        if (typeof payRecordStr === 'string') {
                            payRecordStr = payRecordStr.replace(/\\n/g, '').replace(/ /g, '');
                        }
                        break;
                    }
                }
            }

            if (!payRecordStr) {
                toast.error("Insufficient private balance in a single record. Please merge credits.")
                setIsTransacting(false)
                return
            }

            toast.info("3/3: Pushing Salary Transaction...")
            
            // Dummy Multisig Logic for testing (In production, collect real sigs)
            const dummySigs = "{ sig1: sign0rustyx225spsapx6r0rwhr65v645ex3en3x97j0h4jnyxmd4cvst0ksc2, sig2: sign0rustyx225spsapx6r0rwhr65v645ex3en3x97j0h4jnyxmd4cvst0ksc2, sig3: sign0rustyx225spsapx6r0rwhr65v645ex3en3x97j0h4jnyxmd4cvst0ksc2 }"
            const dummyPaymentId = '12345field'

            const inputs = [
                payRecordStr,
                spentRecordStr,
                issueRecipient,
                issueAmount + 'u64',
                dummyPaymentId,
                dummySigs,
                `[${publicKey}, ${publicKey}, ${publicKey}]`
            ]

            const txId = await requestTransaction(
                wallet?.adapter!,
                publicKey,
                PROGRAM_ID,
                'issue_salary',
                inputs,
                300_000
            )
            toast.success("Salary Pushed Successfully! Transaction ID: " + txId)
        } catch (err: any) {
            console.error(err)
            toast.error("Error: " + err.message)
        } finally {
            setIsTransacting(false)
        }
    }"""
code = re.sub(old_handle, new_handle, code, flags=re.DOTALL)

# 4. Remove UI block for manual Inputs
ui_pattern = r'''                                            <div className="space-y-2">
                                                <Label>Admin Pay Record \(credits.aleo/credits\)</Label>
                                                <Input
                                                    placeholder="\{ owner: aleo1..., microcredits: 100u64.private ... \}"
                                                    value=\{adminPayRecord\}
                                                    onChange=\{\(e\) => setAdminPayRecord\(e.target.value\)\}
                                                    className="bg-white/5 border-white/10 font-mono text-xs"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Admin Spent Record</Label>
                                                <Input
                                                    placeholder="\{ owner: aleo1..., total_spent: 0u64.private ... \}"
                                                    value=\{spentRecord\}
                                                    onChange=\{\(e\) => setSpentRecord\(e.target.value\)\}
                                                    className="bg-white/5 border-white/10 font-mono text-xs"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Recipient Ticket</Label>
                                                <Input
                                                    placeholder="\{ owner: aleo1..., payroll_id: 1field ... \}"
                                                    value=\{recipientTicket\}
                                                    onChange=\{\(e\) => setRecipientTicket\(e.target.value\)\}
                                                    className="bg-white/5 border-white/10 font-mono text-xs"
                                                />
                                            </div>'''
code = re.sub(ui_pattern, "", code)

with open("web/app/admin/page.tsx", "w") as f:
    f.write(code)

print("Updated page.tsx with auto-fetching")
