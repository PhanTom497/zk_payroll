'use client'

import { useWallet } from '@demox-labs/aleo-wallet-adapter-react'
import { useState } from 'react'
import { requestTransaction, PROGRAM_ID } from '@/lib/zk-utils'

export default function AdminPage() {
    const { wallet, publicKey, requestRecordPlaintexts } = useWallet()
    const [budget, setBudget] = useState<string>('Loading...')
    const [periodHash, setPeriodHash] = useState('')
    const [merkleRoot, setMerkleRoot] = useState('')
    const [isTransacting, setIsTransacting] = useState(false)

    // Mock function to simulate fetching public state
    const fetchState = () => {
        // In real app: JSON query to Aleo Node
        setTimeout(() => setBudget('1000u64'), 1000)
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
                300_000 // 0.3 credit fee (Aleo fees are in microcredits? No, typically gate. check adapter docs. 3_000_000 is 3 credits. 300_000 is 0.3)
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
                <div className="mb-8 p-6 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
                    <h2 className="text-2xl font-semibold mb-4">Wallet Status</h2>
                    {publicKey ? (
                        <div className="text-green-500 break-all font-mono">
                            Connected: {publicKey}
                        </div>
                    ) : (
                        <div className="text-yellow-500">Not Connected</div>
                    )}
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
                        </div>

                        {/* Actions */}
                        <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-700">
                            <h2 className="text-xl font-bold mb-4">Actions</h2>

                            <div className="mb-4">
                                <h3 className="font-semibold mb-2">Issue Salary</h3>
                                <input
                                    type="text"
                                    placeholder="Recipient Address"
                                    className="w-full p-2 mb-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
                                />
                                <input
                                    type="number"
                                    placeholder="Amount"
                                    className="w-full p-2 mb-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
                                />
                                <button className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
                                    Sign & Issue
                                </button>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-zinc-700">
                                <h3 className="font-semibold mb-2">Compliance</h3>
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
                                    {isTransacting ? 'Processing...' : 'Generate Audit Report'}
                                </button>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-zinc-700">
                                <h3 className="font-semibold mb-2">Initialize New Payroll</h3>
                                <button
                                    onClick={async () => {
                                        if (!publicKey || !requestRecordPlaintexts) return
                                        setIsTransacting(true)
                                        try {
                                            // Demo: Initialize with current user as Admin 1 (others need to be distinct)
                                            // logic: initialize_payroll(budget, id, threshold, a1, a2, a3, auditor)
                                            const inputs = [
                                                '1000000u64', // Budget
                                                '1field',     // Payroll ID (Demo)
                                                '1u64',       // Threshold (1-of-3 for demo simplicity if contract allows, else needs 3)
                                                publicKey,    // Admin 1
                                                'aleo1...',   // Admin 2 (Placeholder)
                                                'aleo1...',   // Admin 3 (Placeholder)
                                                publicKey     // Auditor (Self for demo)
                                            ]
                                            // Note: Contract requires distinct admins for tickets, but initialize might allow repeats?
                                            // Contract: finalize_initialize_payroll sets mappings. 
                                            // create_ticket checks duplicates. 
                                            // So for initialize we can just pass dummy addresses.

                                            // For a real demo, we should prompt or use distinct test accounts.
                                            // Here we alert the user this is a demo stub.

                                            console.log("Deploy New Clicked");
                                            if (!publicKey) {
                                                alert("Please connect wallet first!");
                                                return;
                                            }
                                            console.log("Public Key:", publicKey);

                                            const realInputs = [
                                                '1000000u64',
                                                '1field',
                                                '1u64',
                                                publicKey, // Admin 1
                                                publicKey, // Admin 2 (Placeholder)
                                                publicKey, // Admin 3 (Placeholder)
                                                publicKey  // Auditor (Self for demo)
                                            ];
                                            console.log("Inputs:", realInputs);
                                            const txId = await requestTransaction(
                                                wallet?.adapter!,
                                                publicKey,
                                                PROGRAM_ID,
                                                'initialize_payroll',
                                                realInputs,
                                                300_000
                                            )
                                            alert("Initialization sent! ID: " + txId)
                                        } catch (e: any) {
                                            console.error(e)
                                            alert("Error: " + e.message)
                                        } finally {
                                            setIsTransacting(false)
                                        }
                                    }}
                                    disabled={isTransacting}
                                    className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition disabled:opacity-50"
                                >
                                    Deploy New (Demo)
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    )
}
