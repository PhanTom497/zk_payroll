'use client'

import { useState } from 'react'
import { WalletConnectButton } from '@/components/WalletConnectButton'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { PROGRAM_ID, getRecordField } from '@/lib/zk-utils'

export default function AuditorDashboard() {
    const { wallet, address, requestRecords } = useWallet()
    const publicKey = address; // Alias for compatibility

    const [reports, setReports] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const fetchReports = async () => {
        if (!publicKey || !requestRecords) return
        setLoading(true)
        setError('')
        try {
            // true = request decrypted records
            const records = await requestRecords(PROGRAM_ID, true)

            // Filter for AuditReport records
            const auditReports = (records as any[])
                .map((rec: any) => {
                    const timestamp = getRecordField(rec, 'timestamp');
                    // If no timestamp, it's likely not an AuditReport (or decryption failed)
                    if (!timestamp) return null;

                    return {
                        data: {
                            timestamp: timestamp,
                            payroll_id: getRecordField(rec, 'payroll_id') || '',
                            total_spent: getRecordField(rec, 'total_spent') || '0u64',
                            recipient_count: getRecordField(rec, 'recipient_count') || '0u32',
                            pay_period_hash: getRecordField(rec, 'pay_period_hash') || '',
                            merkle_root: getRecordField(rec, 'merkle_root') || ''
                        }
                    };
                })
                .filter((rec: any) => rec !== null);

            setReports(auditReports)
        } catch (err: any) {
            console.error(err)
            setError('Failed to fetch audit reports: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    // Helper to clean Aleo values
    const cleanValue = (val: string) => val.replace(/u64|u32|field|\.private/g, '')

    return (
        <main className="flex min-h-screen flex-col items-center p-24 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex mb-12">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">
                    Auditor Portal
                </h1>
                <WalletConnectButton />
            </div>

            {!publicKey ? (
                <div className="text-center mt-20">
                    <p className="text-xl mb-4">Please connect your wallet to access audit records.</p>
                </div>
            ) : (
                <div className="w-full max-w-5xl">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-semibold">Audit Reports</h2>
                        <button
                            onClick={fetchReports}
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {loading ? 'Decrypting...' : 'Fetch & Decrypt Reports'}
                        </button>
                    </div>

                    {error && (
                        <div className="p-4 mb-6 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                            {error}
                        </div>
                    )}

                    {reports.length === 0 && !loading && !error && (
                        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <p className="text-gray-500">No audit reports found.</p>
                        </div>
                    )}

                    <div className="grid gap-6">
                        {reports.map((report, idx) => (
                            <div key={idx} className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 mb-2">
                                            Verified
                                        </span>
                                        <h3 className="text-lg font-bold">Payroll ID: {cleanValue(report.data.payroll_id)}</h3>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">Generated</p>
                                        <p className="font-mono">{new Date(parseInt(cleanValue(report.data.timestamp)) * 1000).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4 text-sm">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <p className="text-gray-500 mb-1">Total Spent</p>
                                        <p className="text-2xl font-bold font-mono">{cleanValue(report.data.total_spent)} credits</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <p className="text-gray-500 mb-1">Recipients Paid</p>
                                        <p className="text-2xl font-bold font-mono">{cleanValue(report.data.recipient_count)}</p>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Commitments</h4>
                                    <div className="grid md:grid-cols-2 gap-4 text-xs font-mono break-all text-gray-600 dark:text-gray-400">
                                        <div>
                                            <span className="block text-gray-400 mb-1">Period Hash</span>
                                            {cleanValue(report.data.pay_period_hash)}
                                        </div>
                                        <div>
                                            <span className="block text-gray-400 mb-1">Merkle Root</span>
                                            {cleanValue(report.data.merkle_root)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </main>
    )
}
