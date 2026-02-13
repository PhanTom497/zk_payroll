'use client'

import { useWallet } from '@demox-labs/aleo-wallet-adapter-react'
import { useState, useEffect } from 'react'
import { requestTransaction, PROGRAM_ID, fetchBlockHeight, fetchMappingValue } from '@/lib/zk-utils'

export default function AdminPage() {
    const { wallet, publicKey, requestRecordPlaintexts } = useWallet()
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

    const handleGenerateReport = async () => {
        if (!publicKey || !requestRecordPlaintexts) return
        setIsTransacting(true)
        try {
            // 1. Fetch Admin's SpentRecord (Total Spent Tracker)
            const records = await requestRecordPlaintexts(PROGRAM_ID)
            const spentRecord = records.filter((rec: any) =>
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
