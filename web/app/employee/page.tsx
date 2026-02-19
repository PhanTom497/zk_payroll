'use client'

import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useState, useEffect } from 'react'
import { fetchBlockHeight, requestTransaction, PROGRAM_ID, getRecordField } from '@/lib/zk-utils'
import { EmployeeClaimComponent } from '../../components/EmployeeClaimComponent'

interface SalaryCertificate {
    id: string
    amount: string
    start_height: number
    interval: number
    claim_count: number
    payroll_id: string
    _record: string // The raw record string for transaction input
}

interface SalaryRecord {
    id: string
    amount: string
    payment_id: string
    payroll_id: string
}

export default function EmployeePage() {
    const { wallet, address, requestRecords } = useWallet()
    const publicKey = address; // Alias for compatibility

    const [certificates, setCertificates] = useState<SalaryCertificate[]>([])
    const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]) // New state
    const [isScanning, setIsScanning] = useState(false)
    const [currentHeight, setCurrentHeight] = useState<number>(0)
    const [loadingClaim, setLoadingClaim] = useState(false)

    // Fetch block height on mount and interval
    useEffect(() => {
        const updateHeight = async () => {
            const h = await fetchBlockHeight()
            if (h > 0) setCurrentHeight(h)
        }
        updateHeight()
        const interval = setInterval(updateHeight, 10000) // Update every 10s
        return () => clearInterval(interval)
    }, [])

    const scanRecords = async () => {
        if (!publicKey || !requestRecords) return
        setIsScanning(true)
        console.log("Scanning with PROGRAM_ID:", PROGRAM_ID);
        try {
            // true = request decryped records (requires view key permission userside or auto-decrypt)
            const records = await requestRecords(PROGRAM_ID, true)
            console.log("DEBUG: Raw Records from Wallet:", JSON.stringify(records, null, 2));

            // Scan Certificates
            const certs: SalaryCertificate[] = (records as any[])
                .filter((rec: any) => !rec.spent && rec.recordName === 'SalaryCertificate')
                .map((rec: any) => {
                    console.log("DEBUG: Processing Record:", rec);
                    console.log("DEBUG: Plaintext:", rec.plaintext);

                    const amountRaw = getRecordField(rec, 'amount');
                    const startHeightRaw = getRecordField(rec, 'start_height');
                    const intervalRaw = getRecordField(rec, 'interval');
                    const claimCountRaw = getRecordField(rec, 'claim_count');
                    const payrollIdRaw = getRecordField(rec, 'payroll_id');

                    return {
                        id: rec.serialNumber || 'unknown',
                        amount: amountRaw || '0u64', // Fallback to 0u64 to prevent undefined
                        start_height: startHeightRaw ? parseInt(startHeightRaw.replace('u32', '')) : 0,
                        interval: intervalRaw ? parseInt(intervalRaw.replace('u32', '')) : 0,
                        claim_count: claimCountRaw ? parseInt(claimCountRaw.replace('u32', '')) : 0,
                        payroll_id: payrollIdRaw || 'unknown',
                        _record: rec.recordPlaintext || rec.plaintext
                    };
                })
            setCertificates(certs)

            // Scan Salary Payments (Proofs)
            const payments: SalaryRecord[] = (records as any[])
                .filter((rec: any) => rec.recordName === 'SalaryRecord')
                .map((rec: any) => {
                    const amountRaw = getRecordField(rec, 'amount');
                    const paymentIdRaw = getRecordField(rec, 'payment_id');
                    const payrollIdRaw = getRecordField(rec, 'payroll_id');

                    return {
                        id: rec.serialNumber || 'unknown',
                        amount: amountRaw || '0u64', // Fallback
                        payment_id: paymentIdRaw || 'unknown',
                        payroll_id: payrollIdRaw || 'unknown'
                    };
                })
            setSalaryRecords(payments)

        } catch (e: any) {
            console.error("Error scanning records:", e)
            alert("Error scanning records: " + e.message)
        } finally {
            setIsScanning(false)
        }
    }

    const handleClaim = async (recordPlaintext: string) => {
        if (!publicKey || !wallet) return
        setLoadingClaim(true)
        try {
            await requestTransaction(
                wallet?.adapter!,
                publicKey,
                PROGRAM_ID,
                'claim_salary',
                [recordPlaintext],
                500000 // Fee (0.5 credits)
            )
            alert("Claim transaction submitted! Please wait for a few minutes, then click 'Scan' again to see your new payment record.")
        } catch (e: any) {
            console.error("Error claiming salary:", e)
            alert("Failed to claim salary. Details: " + e.message)
        } finally {
            setLoadingClaim(false)
        }
    }

    return (
        <main className="flex min-h-screen flex-col items-center p-24 bg-gray-900 text-white">
            <h1 className="text-4xl font-bold mb-8">Employee Portal</h1>

            <div className="w-full max-w-5xl">
                {/* Wallet Connection Status */}
                <div className="mb-8 p-6 bg-gray-800 rounded-lg flex justify-between items-center border border-gray-700">
                    <div>
                        <h2 className="text-2xl font-semibold mb-2">My Wallet</h2>
                        {publicKey ? (
                            <div className="text-green-500 font-mono break-all">{publicKey}</div>
                        ) : (
                            <div className="text-yellow-500">Not Connected</div>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-400">Current Block Height</p>
                        <p className="text-2xl font-mono font-bold text-white">{currentHeight > 0 ? currentHeight : 'Syncing...'}</p>
                    </div>
                </div>

                {/* Dashboard Content */}
                {publicKey && (
                    <div className="space-y-8">

                        {/* Certificates Section */}
                        <div className="p-6 border border-gray-700 bg-gray-800/50 rounded-lg">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold">My Salary Certificates</h2>
                                <button
                                    onClick={scanRecords}
                                    disabled={isScanning}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-semibold"
                                >
                                    {isScanning ? 'Decrypting...' : 'Scan for Certificates'}
                                </button>
                            </div>

                            {certificates.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {certificates.map((cert, idx) => (
                                        <EmployeeClaimComponent
                                            key={idx}
                                            certificate={cert}
                                            currentBlockHeight={currentHeight}
                                            onClaim={handleClaim}
                                            loading={loadingClaim}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-700">
                                    <p className="text-gray-400 text-lg mb-2">No active salary certificates found.</p>
                                    <p className="text-gray-500 text-sm">Click &quot;Scan&quot; to check the blockchain for your records.</p>
                                </div>
                            )}
                        </div>

                        {/* Payments Received Section */}
                        <div className="p-6 border border-gray-700 bg-gray-800/50 rounded-lg">
                            <h2 className="text-xl font-bold mb-4">Payment History (Salary Records)</h2>
                            {salaryRecords.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left text-sm text-gray-300">
                                        <thead className="bg-gray-700 text-gray-100 uppercase font-medium">
                                            <tr>
                                                <th className="px-4 py-3">Amount</th>
                                                <th className="px-4 py-3">Payment ID</th>
                                                <th className="px-4 py-3">Payroll ID</th>
                                                <th className="px-4 py-3 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700">
                                            {salaryRecords.map((rec, idx) => (
                                                <tr key={idx} className="hover:bg-gray-700/50 transition">
                                                    <td className="px-4 py-3 font-mono text-green-400">{rec.amount}</td>
                                                    <td className="px-4 py-3 font-mono text-xs">{rec.payment_id}</td>
                                                    <td className="px-4 py-3 font-mono text-xs">{rec.payroll_id}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-300">
                                                            Received
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">No salary payments found yet.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    )
}
