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
        <main className="flex min-h-screen flex-col items-center p-24 relative overflow-hidden text-gray-100">
            {/* Background Decor */}
            <div className="absolute top-0 right-1/2 translate-x-1/2 w-[600px] h-[600px] bg-white opacity-[0.02] blur-[150px] rounded-full pointer-events-none" />

            <h1 className="text-4xl font-bold mb-8 z-10 tracking-tight">Auditor Portal</h1>

            <div className="w-full max-w-6xl z-10">
                <div className="flex flex-col md:flex-row gap-6 mb-8">
                    {/* Header / Wallet */}
                    <div className="glass-card flex-1 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-semibold mb-2 text-gray-200">Auditor Access</h2>
                            <div className="flex items-center gap-4">
                                <WalletConnectButton />
                            </div>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="glass-card flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-white">Compliance Proofs</h2>
                            <p className="text-xs text-gray-400">Decrypt and verify payroll records.</p>
                        </div>
                        <button
                            onClick={fetchReports}
                            disabled={loading}
                            className="px-6 py-2 bg-white text-black rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors font-bold shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                        >
                            {loading ? 'Verifying...' : 'Fetch Proofs'}
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                {!publicKey ? (
                    <div className="text-center py-20">
                        <p className="text-xl text-gray-500">Please connect your authorized wallet to access audit records.</p>
                    </div>
                ) : (
                    <div className="w-full">
                        {error && (
                            <div className="p-4 mb-6 bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg backdrop-blur-sm">
                                {error}
                            </div>
                        )}

                        {reports.length === 0 && !loading && !error && (
                            <div className="text-center py-16 bg-white/5 rounded-xl border border-white/5 border-dashed">
                                <p className="text-gray-500">No compliance proofs found.</p>
                            </div>
                        )}

                        <div className="grid gap-6">
                            {reports.map((report, idx) => (
                                <div key={idx} className="glass-card group hover:bg-white/10 transition-colors">
                                    <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
                                                <span className="text-sm font-bold text-green-400 uppercase tracking-wider">Verified Proof</span>
                                            </div>
                                            <h3 className="text-lg font-bold text-white font-mono">Payroll ID: {cleanValue(report.data.payroll_id)}</h3>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500 uppercase">Generated On</p>
                                            <p className="font-mono text-gray-300">{new Date(parseInt(cleanValue(report.data.timestamp)) * 1000).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                                        <div className="p-4 bg-black/30 rounded-lg border border-white/5">
                                            <p className="text-gray-500 text-xs uppercase mb-1">Total Payroll Volume</p>
                                            <p className="text-3xl font-bold font-mono text-white tracking-tight">{cleanValue(report.data.total_spent)} <span className="text-sm font-sans font-normal text-gray-500">credits</span></p>
                                        </div>
                                        <div className="p-4 bg-black/30 rounded-lg border border-white/5">
                                            <p className="text-gray-500 text-xs uppercase mb-1">Recipients Paid</p>
                                            <p className="text-3xl font-bold font-mono text-white tracking-tight">{cleanValue(report.data.recipient_count)} <span className="text-sm font-sans font-normal text-gray-500">employees</span></p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-white/5">
                                        <h4 className="text-xs font-bold uppercase text-gray-500 mb-3 tracking-wider">Cryptographic Commitments</h4>
                                        <div className="grid md:grid-cols-2 gap-6 text-xs font-mono break-all text-gray-400">
                                            <div className="group/item">
                                                <span className="block text-gray-600 mb-1 group-hover/item:text-gray-400 transition-colors">Period Hash</span>
                                                <span className="bg-black/20 p-1 rounded">{cleanValue(report.data.pay_period_hash)}</span>
                                            </div>
                                            <div className="group/item">
                                                <span className="block text-gray-600 mb-1 group-hover/item:text-gray-400 transition-colors">Merkle Root</span>
                                                <span className="bg-black/20 p-1 rounded">{cleanValue(report.data.merkle_root)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </main>
    )
}
