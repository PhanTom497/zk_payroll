import re

with open("web/app/admin/page.tsx", "r") as f:
    code = f.read()

# Replace handleIssueCertificate to use issue_salary and prompt for records
old_issue = """    const handleIssueCertificate = async () => {
        if (!publicKey || !issueRecipient || !issueAmount) return
        setIsTransacting(true)
        try {
            // transition issue_limit(payroll_id, recipient, amount, start_height, interval)
            const inputs = [
                '1field',                   // payroll_id (public)
                issueRecipient,             // recipient (private)
                issueAmount + 'u64',        // amount (public)
                issueStart + 'u32',         // start_height (public)
                issueInterval + 'u32'       // interval (public)
            ]

            const txId = await requestTransaction(
                wallet?.adapter!,
                publicKey,
                PROGRAM_ID,
                'issue_limit',
                inputs,
                300_000
            )
            toast.success("Certificate Issued! Transaction ID: " + txId)
        } catch (err: any) {
            console.error(err)
            toast.error("Error: " + err.message)
        } finally {
            setIsTransacting(false)
        }
    }"""

new_issue = """    const [adminPayRecord, setAdminPayRecord] = useState("")
    const [recipientTicket, setRecipientTicket] = useState("")
    const [spentRecord, setSpentRecord] = useState("")

    const handleIssueCertificate = async () => {
        if (!publicKey || !issueRecipient || !issueAmount || !adminPayRecord || !recipientTicket || !spentRecord) {
            toast.error("Please provide all required records for push payment.")
            return
        }
        setIsTransacting(true)
        try {
            // For testing, we mock the signatures and signers since it's a manual UI test
            // transition issue_salary(pay_record, spent_record, recipient_ticket, salary_amount, payment_id, signatures, signers)
            const inputs = [
                adminPayRecord,
                spentRecord,
                recipientTicket,
                issueAmount + 'u64',
                '12345field', // Dummy payment ID
                "{ sig1: sign0rustyx... , sig2: sign0rustyx... , sig3: sign0rustyx... }", // Dummy sigs for testing
                `[${publicKey}, ${publicKey}, ${publicKey}]` // Dummy signers for testing
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

code = code.replace(old_issue, new_issue)

# Add the UI input fields for the new records in the authorize tab
old_ui = """                                            <div className="space-y-2">
                                                <Label>Start Block Height (Current: {currentHeight})</Label>
                                                <Input
                                                    type="number"
                                                    value={issueStart}
                                                    onChange={(e) => setIssueStart(e.target.value)}
                                                    className="bg-white/5 border-white/10"
                                                />
                                            </div>"""

new_ui = """                                            <div className="space-y-2">
                                                <Label>Admin Pay Record (credits.aleo/credits)</Label>
                                                <Input
                                                    placeholder="{ owner: aleo1..., microcredits: 100u64.private ... }"
                                                    value={adminPayRecord}
                                                    onChange={(e) => setAdminPayRecord(e.target.value)}
                                                    className="bg-white/5 border-white/10 font-mono text-xs"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Admin Spent Record</Label>
                                                <Input
                                                    placeholder="{ owner: aleo1..., total_spent: 0u64.private ... }"
                                                    value={spentRecord}
                                                    onChange={(e) => setSpentRecord(e.target.value)}
                                                    className="bg-white/5 border-white/10 font-mono text-xs"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Recipient Ticket</Label>
                                                <Input
                                                    placeholder="{ owner: aleo1..., payroll_id: 1field ... }"
                                                    value={recipientTicket}
                                                    onChange={(e) => setRecipientTicket(e.target.value)}
                                                    className="bg-white/5 border-white/10 font-mono text-xs"
                                                />
                                            </div>"""

code = code.replace(old_ui, new_ui)

with open("web/app/admin/page.tsx", "w") as f:
    f.write(code)

print("Updated page.tsx")
