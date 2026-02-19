'use client'

import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useState, useEffect } from 'react'
import { requestTransaction, PROGRAM_ID, fetchBlockHeight, fetchMappingValue, batchProcessTransactions, BatchTransactionItem } from '@/lib/zk-utils'

export default function AdminPage() {
    const { wallet, address, requestRecords } = useWallet()
    const publicKey = address; // Alias for compatibility with existing code

    const [budget, setBudget] = useState<string>('Loading...')
    const [periodHash, setPeriodHash] = useState('')
    const [merkleRoot, setMerkleRoot] = useState('')
    const [isTransacting, setIsTransacting] = useState(false)
    const [currentHeight, setCurrentHeight] = useState<number>(0)

    // Form States
    const [fundAmount, setFundAmount] = useState('')
    const [issueRecipient, setIssueRecipient] = useState('')
    const [issueAmount, setIssueAmount] = useState('')
    const [issueStart, setIssueStart] = useState('')
    const [issueInterval, setIssueInterval] = useState('100')

    // Bulk Issue States
    const [baseSalary, setBaseSalary] = useState('1000')
    const [bulkInterval, setBulkInterval] = useState('15')
    const [bulkRecipients, setBulkRecipients] = useState('')
    const [batchStatus, setBatchStatus] = useState('')

    // Templates State
    const [templates, setTemplates] = useState<Record<string, { baseSalary: string, interval: string, recipients: string }>>({})
    const [selectedTemplate, setSelectedTemplate] = useState('')
    const [newTemplateName, setNewTemplateName] = useState('')

    // Load templates on mount
    useEffect(() => {
        const saved = localStorage.getItem('payroll_templates')
        if (saved) {
            try {
                setTemplates(JSON.parse(saved))
            } catch (e) {
                console.error("Failed to parse templates", e)
            }
        }
    }, [])

    const handleSaveTemplate = () => {
        if (!newTemplateName) return alert("Please enter a template name")
        const newTemplates = {
            ...templates,
            [newTemplateName]: {
                baseSalary,
                interval: bulkInterval,
                recipients: bulkRecipients
            }
        }
        setTemplates(newTemplates)
        localStorage.setItem('payroll_templates', JSON.stringify(newTemplates))
        setNewTemplateName('')
        alert(`Template "${newTemplateName}" saved!`)
    }

    const handleLoadTemplate = (name: string) => {
        const t = templates[name]
        if (t) {
            setBaseSalary(t.baseSalary)
            setBulkInterval(t.interval)
            setBulkRecipients(t.recipients)
            setSelectedTemplate(name)
        }
    }

    const handleDeleteTemplate = (name: string) => {
        const newTemplates = { ...templates }
        delete newTemplates[name]
        setTemplates(newTemplates)
        localStorage.setItem('payroll_templates', JSON.stringify(newTemplates))
        if (selectedTemplate === name) setSelectedTemplate('')
    }

    // Fetch public state from chain
    const fetchState = async () => {
        setBudget('Loading...')
        try {
            // Fetch payroll_budgets for ID 1field
            const budgetVal = await fetchMappingValue('payroll_budgets', '1field')
            if (budgetVal) {
                setBudget(budgetVal) // Value usually comes as "1500u64" string from JSON
            } else {
                setBudget('0u64')
            }
        } catch (e) {
            console.error("Error fetching state:", e)
            setBudget('Error')
        }
    }

    // Update block height
    useEffect(() => {
        const updateHeight = async () => {
            const h = await fetchBlockHeight()
            if (h > 0) {
                setCurrentHeight(h)
                if (!issueStart) setIssueStart((h + 10).toString()) // Suggest start in 10 blocks
            }
        }
        updateHeight()
        const interval = setInterval(updateHeight, 10000)
        return () => clearInterval(interval)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleFundPayroll = async () => {
        if (!publicKey || !fundAmount) return
        setIsTransacting(true)
        try {
            const txId = await requestTransaction(
                wallet?.adapter!,
                publicKey,
                PROGRAM_ID,
                'fund_payroll',
                [fundAmount + 'u64', '1field'], // public amount, public payroll_id
                300_000
            )
            alert("Funding Transaction sent! ID: " + txId)
        } catch (err: any) {
            console.error(err)
            alert("Error: " + err.message)
        } finally {
            setIsTransacting(false)
        }
    }

    const handleIssueCertificate = async () => {
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
            alert("Certificate Issued! Transaction ID: " + txId)
        } catch (err: any) {
            console.error(err)
            alert("Error: " + err.message)
        } finally {
            setIsTransacting(false)
        }
    }

    const handleBulkIssue = async () => {
        if (!publicKey || !bulkRecipients) return
        setIsTransacting(true)
        setBatchStatus('Preparing batch...')

        try {
            const regex = /(aleo1[a-z0-9]{58})\s*,\s*([a-zA-Z]+)/gi
            const items: BatchTransactionItem[] = []

            let match;
            let i = 0;
            while ((match = regex.exec(bulkRecipients)) !== null) {
                const addr = match[1]
                const roleStr = match[2]

                const roles: Record<string, number> = {
                    'junior': 1.0,
                    'senior': 1.5,
                    'executive': 2.0
                }

                const role = roleStr?.toLowerCase() || 'junior'
                const multiplier = roles[role] || 1.0
                const base = parseInt(baseSalary) || 0
                const amount = Math.floor(base * multiplier)

                // transition issue_limit(payroll_id, recipient, amount, start_height, interval)
                // We'll use current height + 10 for start
                const startH = currentHeight > 0 ? currentHeight + 10 : 0

                items.push({
                    id: `batch-${i}`,
                    description: `Issuing to ${addr.slice(0, 6)}... (${role})`,
                    functionName: 'issue_limit',
                    inputs: [
                        '1field',              // payroll_id
                        addr,                  // recipient
                        amount + 'u64',        // amount
                        startH + 'u32',        // start_height
                        bulkInterval + 'u32'   // interval
                    ],
                    fee: 300_000 // 0.3 credits per tx
                })
                i++;
            }

            if (items.length === 0) {
                if (bulkRecipients.trim().length > 0) {
                    console.warn("Text found but no regex matches. Check format.")
                    alert("No valid 'address, role' pairs found. Please check format.")
                    setBatchStatus("Error: Invalid format")
                    setIsTransacting(false)
                    return
                }
            }

            const result = await batchProcessTransactions(
                wallet?.adapter!,
                publicKey,
                PROGRAM_ID,
                items,
                (idx, total, status) => {
                    setBatchStatus(`[${idx}/${total}] ${status}`)
                }
            )

            let msg = `Batch Complete.\nSuccess: ${result.success.length}\nFailed: ${result.failed.length}`
            if (result.failed.length > 0) {
                msg += `\nFirst Error: ${result.failed[0].error}`
            }
            alert(msg)
            setBatchStatus(msg)

        } catch (err: any) {
            console.error(err)
            setBatchStatus("Error: " + err.message)
            alert("Batch Error: " + err.message)
        } finally {
            setIsTransacting(false)
        }
    }

    const handlePrivacyBatch = async () => {
        if (!publicKey || !bulkRecipients) return
        setIsTransacting(true)
        setBatchStatus('Preparing privacy batch...')

        try {
            const regex = /(aleo1[a-z0-9]{58})\s*,\s*([a-zA-Z]+)/gi
            const allRecipients: { addr: string, amount: string, role: string }[] = []

            let match;
            while ((match = regex.exec(bulkRecipients)) !== null) {
                const addr = match[1]
                const roleStr = match[2]

                const roles: Record<string, number> = { 'junior': 1.0, 'senior': 1.5, 'executive': 2.0 }
                const role = roleStr?.toLowerCase() || 'junior'
                const multiplier = roles[role] || 1.0
                const base = parseInt(baseSalary) || 0
                const amount = Math.floor(base * multiplier)

                allRecipients.push({ addr, amount: amount + 'u64', role })
            }

            if (allRecipients.length === 0) {
                alert("No valid recipients found.")
                setIsTransacting(false)
                return
            }

            const items: BatchTransactionItem[] = []
            // Chunk into 3s
            for (let i = 0; i < allRecipients.length; i += 3) {
                const chunk = allRecipients.slice(i, i + 3)

                const startH = currentHeight > 0 ? currentHeight + 10 : 0

                if (chunk.length === 3) {
                    // Use Privacy Batch
                    items.push({
                        id: `privacy-batch-${i / 3}`,
                        description: `Privacy Batch (3) - ${chunk.map(r => r.role).join(', ')}`,
                        functionName: 'issue_limit_batch_3',
                        inputs: [
                            '1field',              // payroll_id
                            chunk[0].addr, chunk[0].amount, startH + 'u32', bulkInterval + 'u32',
                            chunk[1].addr, chunk[1].amount, startH + 'u32', bulkInterval + 'u32',
                            chunk[2].addr, chunk[2].amount, startH + 'u32', bulkInterval + 'u32'
                        ],
                        fee: 500_000 // Higher fee for complex batch (0.5 credits)
                    })
                } else {
                    // Fallback for remainders (< 3)
                    chunk.forEach((r, idx) => {
                        items.push({
                            id: `remainder-${i + idx}`,
                            description: `Issuing to ${r.addr.slice(0, 6)}... (${r.role})`,
                            functionName: 'issue_limit',
                            inputs: [
                                '1field', r.addr, r.amount, startH + 'u32', bulkInterval + 'u32'
                            ],
                            fee: 300_000
                        })
                    })
                }
            }

            const result = await batchProcessTransactions(
                wallet?.adapter!,
                publicKey,
                PROGRAM_ID,
                items,
                (idx, total, status) => setBatchStatus(`[${idx}/${total}] ${status}`)
            )

            let msg = `Batch Complete.\nSuccess: ${result.success.length}\nFailed: ${result.failed.length}`
            if (result.failed.length > 0) {
                msg += `\nFirst Error: ${result.failed[0].error}`
            }
            alert(msg)
            setBatchStatus(msg)

        } catch (err: any) {
            console.error(err)
            alert("Error: " + err.message)
            setBatchStatus("Error: " + err.message)
        } finally {
            setIsTransacting(false)
        }
    }

    const handleGenerateReport = async () => {
        if (!publicKey || !requestRecords) return
        setIsTransacting(true)
        try {
            // 1. Fetch Admin's SpentRecord (Total Spent Tracker)
            const records = await requestRecords(PROGRAM_ID, true)
            const spentRecord = (records as any[]).filter((rec: any) =>
                !rec.spent &&
                rec.recordName === 'SpentRecord' // Best check if available
            ).pop() // Get the latest one

            if (!spentRecord) {
                alert("No active SpentRecord found for this admin.")
                return
            }

            // 2. Prepare Inputs
            // transition generate_audit_report(spent_record, timestamp, pay_period_hash, merkle_root)
            const timestamp = Math.floor(Date.now() / 1000).toString() + 'u32'
            const inputs = [
                spentRecord.plaintext.replace(/\n/g, '').replace(/ /g, ''),
                timestamp,
                periodHash || '0field', // Default if empty
                merkleRoot || '0field'
            ]

            // 3. Request Transaction
            const txId = await requestTransaction(
                wallet?.adapter!,
                publicKey, // Use publicKey from useWallet hook scope
                PROGRAM_ID,
                'generate_audit_report',
                inputs,
                300_000 // 0.3 credit fee
            )

            alert("Transaction sent! ID: " + txId)
        } catch (err: any) {
            console.error(err)
            alert("Error: " + err.message)
        } finally {
            setIsTransacting(false)
        }
    }

    return (
        <main className="flex min-h-screen flex-col items-center p-24 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-gray-100">
            <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

            <div className="w-full max-w-5xl">
                {/* Wallet Connection Status */}
                <div className="mb-8 p-6 bg-white dark:bg-zinc-800 rounded-lg shadow-sm flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-semibold mb-2">Wallet Status</h2>
                        {publicKey ? (
                            <div className="text-green-500 break-all font-mono">
                                Connected: {publicKey}
                            </div>
                        ) : (
                            <div className="text-yellow-500">Not Connected</div>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Block Height</p>
                        <p className="text-2xl font-mono font-bold">{currentHeight || 'Syncing...'}</p>
                    </div>
                </div>

                {/* Dashboard Content (Only if connected) */}
                {publicKey && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Payroll State */}
                        <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-700">
                            <h2 className="text-xl font-bold mb-4">Payroll State</h2>
                            <p>Referenced Payroll ID: <span className="font-mono">1field</span></p>
                            <p>Current Budget: <span className="font-mono">{budget}</span></p>
                            <button
                                onClick={fetchState}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            >
                                Refresh State
                            </button>

                            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-zinc-700">
                                <h3 className="font-semibold mb-2">Fund Payroll Budget</h3>
                                <p className="text-sm text-gray-500 mb-2">Deposit public credits to back employee claims.</p>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="Amount (e.g. 50000)"
                                        className="w-full p-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
                                        value={fundAmount}
                                        onChange={(e) => setFundAmount(e.target.value)}
                                    />
                                    <button
                                        onClick={handleFundPayroll}
                                        disabled={isTransacting}
                                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                    >
                                        Fund
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-700">
                            <h2 className="text-xl font-bold mb-4">Management Actions</h2>

                            {/* Issue Certificate Section */}
                            <div className="mb-6 pb-6 border-b border-gray-200 dark:border-zinc-700">
                                <h3 className="font-semibold mb-2">Issue Salary Certificate</h3>
                                <p className="text-xs text-gray-500 mb-4">Grant an employee the right to claim recurring salary.</p>

                                <input
                                    type="text"
                                    placeholder="Employee Address (aleo1...)"
                                    className="w-full p-2 mb-2 border rounded dark:bg-zinc-700 dark:border-zinc-600 font-mono text-sm"
                                    value={issueRecipient}
                                    onChange={(e) => setIssueRecipient(e.target.value)}
                                />
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <input
                                        type="number"
                                        placeholder="Amount per Claim"
                                        className="w-full p-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
                                        value={issueAmount}
                                        onChange={(e) => setIssueAmount(e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Interval (Blocks)"
                                        className="w-full p-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
                                        value={issueInterval}
                                        onChange={(e) => setIssueInterval(e.target.value)}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="text-xs text-gray-500">Start Block Height</label>
                                    <input
                                        type="number"
                                        placeholder="Start Block"
                                        className="w-full p-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
                                        value={issueStart}
                                        onChange={(e) => setIssueStart(e.target.value)}
                                    />
                                </div>

                                <button
                                    onClick={handleIssueCertificate}
                                    disabled={isTransacting}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
                                >
                                    Issue Certificate
                                </button>
                            </div>

                            {/* Bulk Issue Section */}
                            <div className="mb-6 pb-6 border-b border-gray-200 dark:border-zinc-700">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold">Bulk Issue (Batch Processing)</h3>
                                    {/* Template Loader */}
                                    {Object.keys(templates).length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">Load Template:</span>
                                            <select
                                                className="p-1 text-sm border rounded dark:bg-zinc-700 dark:border-zinc-600"
                                                onChange={(e) => handleLoadTemplate(e.target.value)}
                                                value={selectedTemplate}
                                            >
                                                <option value="">Select...</option>
                                                {Object.keys(templates).map(name => (
                                                    <option key={name} value={name}>{name}</option>
                                                ))}
                                            </select>
                                            {selectedTemplate && (
                                                <button
                                                    onClick={() => handleDeleteTemplate(selectedTemplate)}
                                                    className="text-red-500 text-xs hover:underline"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mb-4">Issue multiple certificates at once. Roles: Junior (1x), Senior (1.5x), Executive (2x).</p>

                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <div>
                                        <label className="text-xs text-gray-500">Base Salary</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
                                            value={baseSalary}
                                            onChange={(e) => setBaseSalary(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Interval (Blocks)</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
                                            value={bulkInterval}
                                            onChange={(e) => setBulkInterval(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="mb-2">
                                    <label className="text-xs text-gray-500">Recipients (Format: address, role)</label>
                                    <textarea
                                        placeholder="aleo1...address, Junior&#10;aleo1...address, Senior"
                                        className="w-full p-2 h-24 border rounded dark:bg-zinc-700 dark:border-zinc-600 font-mono text-xs"
                                        value={bulkRecipients}
                                        onChange={(e) => setBulkRecipients(e.target.value)}
                                    />
                                </div>

                                {batchStatus && (
                                    <div className="mb-4 p-2 bg-gray-100 dark:bg-zinc-900 rounded text-xs font-mono">
                                        {batchStatus}
                                    </div>
                                )}

                                <div className="flex gap-2 mb-4">
                                    <button
                                        onClick={handleBulkIssue}
                                        disabled={isTransacting}
                                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition disabled:opacity-50"
                                    >
                                        {isTransacting ? 'Processing...' : 'Process Batch (Legacy)'}
                                    </button>
                                    <button
                                        onClick={handlePrivacyBatch}
                                        disabled={isTransacting}
                                        className="flex-1 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition disabled:opacity-50 border border-gray-600"
                                    >
                                        {isTransacting ? 'Processing...' : 'Privacy Batch (3x)'}
                                    </button>
                                </div>

                                {/* Save Template */}
                                <div className="flex gap-2 items-center pt-4 border-t border-gray-100 dark:border-zinc-800">
                                    <input
                                        type="text"
                                        placeholder="Template Name (e.g. Monthly Devs)"
                                        className="flex-1 p-2 text-xs border rounded dark:bg-zinc-700 dark:border-zinc-600"
                                        value={newTemplateName}
                                        onChange={(e) => setNewTemplateName(e.target.value)}
                                    />
                                    <button
                                        onClick={handleSaveTemplate}
                                        className="px-3 py-2 bg-gray-200 dark:bg-zinc-700 text-xs rounded hover:bg-gray-300 dark:hover:bg-zinc-600 transition"
                                    >
                                        Save Template
                                    </button>
                                </div>
                            </div>

                            {/* Compliance Section */}
                            <div>
                                <h3 className="font-semibold mb-2">Auditor Compliance</h3>
                                <div className="space-y-2 mb-4">
                                    <input
                                        type="text"
                                        placeholder="Pay Period Hash (Field)"
                                        className="w-full p-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
                                        value={periodHash}
                                        onChange={(e) => setPeriodHash(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Merkle Root (Field)"
                                        className="w-full p-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
                                        value={merkleRoot}
                                        onChange={(e) => setMerkleRoot(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={handleGenerateReport}
                                    disabled={isTransacting}
                                    className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition disabled:opacity-50"
                                >
                                    Generate Audit Report
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    )
}
