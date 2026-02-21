'use client'

import { useState, useEffect } from 'react'
import { WalletConnectButton } from '@/components/WalletConnectButton'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { PROGRAM_ID, getRecordField } from '@/lib/zk-utils'
import GlassCard from '@/components/GlassCard'
import WireframeBackground from '@/components/WireframeBackground'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck, Database, FileDigit, Calendar } from 'lucide-react'

export default function AuditorDashboard() {
    const { wallet, address, requestRecords } = useWallet()
    const publicKey = address; // Alias for compatibility

    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    const isConnected = mounted && publicKey;

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
        <div className="relative min-h-screen bg-black text-white selection:bg-white/30 overflow-hidden font-sans">
            <WireframeBackground />

            {/* Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Back to Home
                        </Link>
                        <div className="h-4 w-px bg-white/10" />
                        <span className="text-sm font-bold tracking-tight">Auditor Portal</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <WalletConnectButton />
                    </div>
                </div>
            </nav>

            <main className="relative z-10 pt-32 pb-24 px-6 max-w-7xl mx-auto space-y-12">
                <div className="space-y-4 border-b border-white/10 pb-8">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight flex items-center gap-4">
                        <ShieldCheck className="w-10 h-10 text-white" />
                        Compliance Audit
                    </h1>
                    <p className="text-xl text-muted-foreground">Verify zero-knowledge proofs of budget solvency without accessing private data.</p>
                </div>

                <div className="grid lg:grid-cols-[350px,1fr] gap-8 items-start">
                    {/* Sidebar / Controls */}
                    <div className="space-y-6 sticky top-32">
                        <GlassCard className="p-6">
                            <h2 className="text-lg font-bold mb-4">Auditor Access</h2>
                            <div className="mb-6">
                                <WalletConnectButton />
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-400 mb-1">Status</h3>
                                    {isConnected ? (
                                        <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 px-3 py-2 rounded-lg border border-green-400/20">
                                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                            Auditor Connected
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm text-yellow-500 bg-yellow-500/10 px-3 py-2 rounded-lg border border-yellow-500/20">
                                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                            Wallet Disconnected
                                        </div>
                                    )}
                                </div>
                            </div>
                        </GlassCard>

                        {isConnected && (
                            <GlassCard className="p-6">
                                <h2 className="text-lg font-bold mb-2">Fetch Proofs</h2>
                                <p className="text-sm text-gray-400 mb-6">Scan your connected wallet for decrypted Audit Reports.</p>
                                <button
                                    onClick={fetchReports}
                                    disabled={loading}
                                    className="w-full py-3 bg-white text-black rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors font-bold shadow-[0_0_15px_rgba(255,255,255,0.1)] flex justify-center items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        <>
                                            <Database className="w-4 h-4" />
                                            Scan Records
                                        </>
                                    )}
                                </button>
                            </GlassCard>
                        )}
                    </div>

                    {/* Main Content Area */}
                    <div className="space-y-6">
                        {!isConnected ? (
                            <GlassCard className="p-12 text-center flex flex-col items-center justify-center border-dashed border-white/10">
                                <ShieldCheck className="w-12 h-12 text-gray-600 mb-4" />
                                <h3 className="text-xl font-bold mb-2">Access Required</h3>
                                <p className="text-gray-400 max-w-md">Connect your authorized auditor wallet to scan for compliance proofs.</p>
                            </GlassCard>
                        ) : (
                            <>
                                {error && (
                                    <div className="p-4 bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg backdrop-blur-sm text-sm">
                                        {error}
                                    </div>
                                )}

                                {reports.length === 0 && !loading && !error && (
                                    <GlassCard className="p-12 text-center flex flex-col items-center justify-center border-dashed border-white/10">
                                        <Database className="w-12 h-12 text-gray-600 mb-4" />
                                        <h3 className="text-xl font-bold mb-2">No Reports Found</h3>
                                        <p className="text-gray-400 max-w-md">No decrypted Audit Reports were found for this wallet address.</p>
                                    </GlassCard>
                                )}

                                <div className="space-y-6">
                                    {reports.map((report, idx) => (
                                        <GlassCard key={idx} hover={false} className="p-0 overflow-hidden border-white/10 group">
                                            {/* Report Header */}
                                            <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                                        <ShieldCheck className="w-4 h-4 text-green-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-mono font-bold">Payroll ID: {cleanValue(report.data.payroll_id)}</h3>
                                                        <div className="flex items-center gap-1 text-xs text-green-400 font-medium tracking-wide uppercase mt-0.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)]" />
                                                            Zero-Knowledge Verified
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-0.5 flex items-center justify-end gap-1"><Calendar className="w-3 h-3" /> Date</div>
                                                    <div className="font-mono text-sm text-gray-300">{new Date(parseInt(cleanValue(report.data.timestamp)) * 1000).toLocaleDateString()}</div>
                                                </div>
                                            </div>

                                            {/* Report Metrics */}
                                            <div className="p-6 grid grid-cols-2 gap-4">
                                                <div className="p-4 rounded-lg bg-black/40 border border-white/5 group-hover:bg-black/60 transition-colors">
                                                    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Total Volume</div>
                                                    <div className="text-3xl font-bold font-mono tracking-tight text-white flex items-baseline gap-2">
                                                        {cleanValue(report.data.total_spent)}
                                                        <span className="text-sm font-sans font-normal text-gray-500">Aleo Credits</span>
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-lg bg-black/40 border border-white/5 group-hover:bg-black/60 transition-colors">
                                                    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Recipients Paid</div>
                                                    <div className="text-3xl font-bold font-mono tracking-tight text-white flex items-baseline gap-2">
                                                        {cleanValue(report.data.recipient_count)}
                                                        <span className="text-sm font-sans font-normal text-gray-500">Employees</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Cryptographic Proofs */}
                                            <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5">
                                                <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500 mb-4 tracking-wider">
                                                    <FileDigit className="w-4 h-4" /> Cryptographic Commitments
                                                </h4>
                                                <div className="grid md:grid-cols-2 gap-6">
                                                    <div>
                                                        <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Period Hash</div>
                                                        <div className="font-mono text-xs text-gray-400 break-all bg-black/50 p-2 rounded border border-white/5">
                                                            {cleanValue(report.data.pay_period_hash)}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Merkle Root</div>
                                                        <div className="font-mono text-xs text-gray-400 break-all bg-black/50 p-2 rounded border border-white/5">
                                                            {cleanValue(report.data.merkle_root)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </GlassCard>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
