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
        <main className="flex min-h-screen flex-col items-center p-24 relative overflow-hidden text-gray-100">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white opacity-[0.02] blur-[150px] rounded-full pointer-events-none" />

            <h1 className="text-4xl font-bold mb-8 z-10 tracking-tight">Employee Portal</h1>

            <div className="w-full max-w-6xl z-10">
                {/* Wallet Connection Status */}
                <div className="mb-8 glass-card flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold mb-2 text-gray-200">My Wallet</h2>
                        {publicKey ? (
                            <div className="flex items-center gap-2 text-green-400 font-mono">
                                <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
                                Connected: {publicKey.slice(0, 10)}...{publicKey.slice(-6)}
                            </div>
                        ) : (
                            <div className="text-yellow-500">Not Connected</div>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Block Height</p>
                        <p className="text-2xl font-mono font-bold text-white">{currentHeight || 'Syncing...'}</p>
                    </div>
                </div>

                {/* Dashboard Content */}
                {publicKey && (
                    <div className="space-y-8">

                        {/* Certificates (Salary Rights) Section */}
                        <div className="glass-card">
                            <div className="flex justify-between items-center mb-8 pb-4 border-b border-glass-border">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Salary Rights (Paychecks)</h2>
                                    <p className="text-sm text-gray-400">Your authorized salary streams.</p>
                                </div>
                                <button
                                    onClick={scanRecords}
                                    disabled={isScanning}
                                    className="px-6 py-2 bg-white text-black rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors font-bold shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                                >
                                    {isScanning ? 'Decrypting...' : 'Check for Paychecks'}
                                </button>
                            </div>

                            {certificates.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                <div className="text-center py-16 bg-white/5 rounded-xl border border-white/5 border-dashed">
                                    <div className="inline-block p-4 rounded-full bg-white/5 mb-4 text-gray-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-300 text-lg mb-2">No active salary rights found.</p>
                                    <p className="text-gray-500 text-sm max-w-md mx-auto">Click &quot;Check for Paychecks&quot; to decrypt your private records from the blockchain.</p>
                                </div>
                            )}
                        </div>

                        {/* Withdraw History */}
                        <div className="glass-card">
                            <h2 className="text-xl font-bold mb-6 text-white">Withdrawal History</h2>
                            {salaryRecords.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left text-sm text-gray-300">
                                        <thead className="bg-white/5 text-gray-100 uppercase font-medium text-xs tracking-wider">
                                            <tr>
                                                <th className="px-4 py-4 rounded-tl-lg">Amount</th>
                                                <th className="px-4 py-4">Payment ID</th>
                                                <th className="px-4 py-4">Payroll ID</th>
                                                <th className="px-4 py-4 text-right rounded-tr-lg">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/10">
                                            {salaryRecords.map((rec, idx) => (
                                                <tr key={idx} className="hover:bg-white/5 transition">
                                                    <td className="px-4 py-4 font-mono font-bold text-white">{rec.amount}</td>
                                                    <td className="px-4 py-4 font-mono text-xs text-gray-500">{rec.payment_id}</td>
                                                    <td className="px-4 py-4 font-mono text-xs text-gray-500">{rec.payroll_id}</td>
                                                    <td className="px-4 py-4 text-right">
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-500/20 text-green-300 border border-green-500/20">
                                                            Withdrawn
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-gray-500 italic py-4">No withdrawal history available.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    )
}
