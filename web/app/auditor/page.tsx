'use client'

import { useState, useEffect } from 'react'
import { WalletConnectButton } from '@/components/WalletConnectButton'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { PROGRAM_ID, getRecordField, requestWalletRecords } from '@/lib/zk-utils'
import GlassCard from '@/components/GlassCard'
import WireframeBackground from '@/components/WireframeBackground'
import Link from 'next/link'
import NetworkStatus from '@/components/NetworkStatus'
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
            const records = await requestWalletRecords(
                requestRecords,
                PROGRAM_ID,
                true,
                (wallet as any)?.adapter
            )

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

    const cleanValue = (val: string) => val.replace(/u64|u32|field|\.private/g, '')
    const parseLiteralNumber = (val: string) => parseInt(cleanValue(val).replace(/_/g, ''), 10) || 0
    const formatCredits = (microcredits: number) =>
        (microcredits / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })

    return (
        <div className="relative min-h-screen text-white bg-black selection:bg-white/30 overflow-hidden font-sans">
            <div 
                className="fixed inset-0 z-0 bg-[length:800px] md:bg-[length:1800px] bg-left bg-no-repeat bg-fixed opacity-40"
                style={{ backgroundImage: "url('/assets/milad-fakurian-7W3X1dAuKqg-unsplash.jpg')" }}
            />
            <div className="fixed inset-0 z-0 bg-black/60 backdrop-blur-[2px]" />


            <main className="relative z-10 pt-32 pb-24 px-6 max-w-7xl mx-auto space-y-12">
                <div className="mb-12 border-b border-white/5 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e293b] border border-transparent text-indigo-400 text-xs font-bold tracking-widest uppercase mb-4">
                        Auditor Portal
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2 flex flex-col md:flex-row md:items-center gap-4">
                        <ShieldCheck className="w-10 h-10 md:w-12 md:h-12 text-white hidden md:block" />
                        Payroll Verification
                    </h1>
                    <p className="text-[#a1a1aa] text-lg max-w-2xl mt-2">
                        Inspect audit reports, spending commitments, and period proofs without gaining access to individual compensation data.
                    </p>
                </div>

                <NetworkStatus />

                <div className="grid lg:grid-cols-[380px,1fr] gap-8 items-start">
                    {/* Sidebar / Controls */}
                    <div className="space-y-6 sticky top-32 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                        <GlassCard className="p-8 border-white/5 bg-[#0a0a0a] rounded-3xl group transition-colors">
                            <h2 className="text-2xl font-bold mb-6 text-white tracking-tight">Auditor Access</h2>
                            <div className="mb-8">
                                <WalletConnectButton />
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-3">Connection Status</h3>
                                    {isConnected ? (
                                        <div className="flex items-center gap-3 text-sm text-[#22c55e] bg-white/5 px-4 py-4 rounded-xl border border-white/10 font-medium">
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] border-2 border-black" />
                                            Auditor wallet connected
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 text-sm text-[#eab308] bg-white/5 px-4 py-4 rounded-xl border border-white/10 font-medium">
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#eab308] border-2 border-black" />
                                            Wallet disconnected
                                        </div>
                                    )}
                                </div>
                            </div>
                        </GlassCard>

                        {isConnected && (
                            <GlassCard className="p-8 border-white/5 bg-[#0a0a0a] rounded-3xl">
                                <h2 className="text-xl font-bold mb-3 text-white tracking-tight">Fetch Reports</h2>
                                <p className="text-sm text-[#a1a1aa] mb-8">Scan this auditor wallet for payroll summary reports that are ready for review.</p>
                                <button
                                    onClick={fetchReports}
                                    disabled={loading}
                                    className="w-full py-4 bg-white text-black rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-all active:scale-95 font-bold flex justify-center items-center gap-2 text-lg"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                            Scanning...
                                        </>
                                    ) : (
                                        <>
                                            <Database className="w-5 h-5" />
                                            Scan Audit Reports
                                        </>
                                    )}
                                </button>
                            </GlassCard>
                        )}
                    </div>

                    {/* Main Content Area */}
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                        {!isConnected ? (
                            <GlassCard className="p-16 text-center flex flex-col items-center justify-center border-dashed border-white/5 bg-[#0a0a0a]/50 rounded-3xl min-h-[400px]">
                                <ShieldCheck className="w-20 h-20 text-white/20 mb-8" />
                                <h3 className="text-3xl font-bold mb-4 text-white tracking-tight">Auditor Wallet Required</h3>
                                <p className="text-[#a1a1aa] max-w-md text-lg">Connect the configured auditor wallet to review payroll proofs and reporting records.</p>
                            </GlassCard>
                        ) : (
                            <>
                                {error && (
                                    <div className="p-4 bg-red-900/20 border border-red-500/30 text-red-400 rounded-2xl backdrop-blur-sm text-sm">
                                        {error}
                                    </div>
                                )}

                                {reports.length === 0 && !loading && !error && (
                                    <GlassCard className="p-16 text-center flex flex-col items-center justify-center border-dashed border-white/5 bg-[#0a0a0a]/50 rounded-3xl min-h-[400px]">
                                        <Database className="w-20 h-20 text-white/20 mb-8" />
                                        <h3 className="text-3xl font-bold mb-4 text-white tracking-tight">No Reports Found</h3>
                                        <p className="text-[#a1a1aa] max-w-md text-lg">No payroll summary reports are visible to this wallet yet.</p>
                                    </GlassCard>
                                )}

                                <div className="space-y-8">
                                    {reports.map((report, idx) => (
                                        <GlassCard key={idx} hover={false} className="p-0 overflow-hidden border-white/5 bg-[#0a0a0a] rounded-3xl group mb-6 transition-all">
                                            {/* Report Header */}
                                            <div className="px-8 py-6 bg-white/5 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 relative">
                                                        <ShieldCheck className="w-6 h-6 text-white relative z-10" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-bold text-white tracking-tight">Payroll ID: <span className="text-gray-300 font-mono text-lg">{cleanValue(report.data.payroll_id)}</span></h3>
                                                        <div className="flex items-center gap-2 text-xs text-[#22c55e] font-bold tracking-widest uppercase mt-1">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                                                            Zero-Knowledge Verified
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-left md:text-right bg-[#050505] px-4 py-2 rounded-xl border border-white/5">
                                                    <div className="text-[10px] text-[#a1a1aa] font-bold uppercase tracking-widest mb-1 flex items-center md:justify-end gap-1.5"><Calendar className="w-3 h-3 text-white" /> Verification Date</div>
                                                    <div className="font-mono text-base font-bold text-white">{new Date(parseInt(cleanValue(report.data.timestamp)) * 1000).toLocaleDateString()}</div>
                                                </div>
                                            </div>

                                            {/* Report Metrics */}
                                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="p-6 rounded-2xl bg-[#050505] border border-white/5 group-hover:bg-white/5 transition-colors group-hover:border-white/10 relative overflow-hidden">
                                                    <div className="text-xs text-[#a1a1aa] font-bold uppercase tracking-widest mb-3 relative z-10">Total Volume</div>
                                                    <div className="text-4xl font-black font-mono tracking-tighter text-white flex items-baseline gap-2 relative z-10">
                                                        {formatCredits(parseLiteralNumber(report.data.total_spent))}
                                                        <span className="text-base font-sans font-bold text-gray-400 uppercase tracking-widest ml-1">Credits</span>
                                                    </div>
                                                </div>
                                                <div className="p-6 rounded-2xl bg-[#050505] border border-white/5 group-hover:bg-white/5 transition-colors group-hover:border-white/10 relative overflow-hidden">
                                                    <div className="text-xs text-[#a1a1aa] font-bold uppercase tracking-widest mb-3 relative z-10">Recipients Audited</div>
                                                    <div className="text-4xl font-black font-mono tracking-tighter text-white flex items-baseline gap-2 relative z-10">
                                                        {cleanValue(report.data.recipient_count)}
                                                        <span className="text-base font-sans font-bold text-gray-400 uppercase tracking-widest ml-1">Employees</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Cryptographic Proofs */}
                                            <div className="px-8 py-6 bg-black border-t border-white/5">
                                                <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-[#a1a1aa] mb-6 tracking-widest">
                                                    <FileDigit className="w-4 h-4 text-white" /> Cryptographic Commitments
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Period Hash</div>
                                                        <div className="font-mono text-sm text-white break-all bg-[#050505] p-4 rounded-xl border border-white/5">
                                                            {cleanValue(report.data.pay_period_hash)}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Merkle Root</div>
                                                        <div className="font-mono text-sm text-white break-all bg-[#050505] p-4 rounded-xl border border-white/5">
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
