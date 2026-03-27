'use client'

import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useState, useEffect } from 'react'
import { fetchBlockHeight, requestTransaction, requestWalletRecords, PROGRAM_ID, getRecordField } from '@/lib/zk-utils'
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import GlassCard from "@/components/GlassCard"
import { motion } from "framer-motion"
import { EmployeeClaimComponent } from '@/components/EmployeeClaimComponent'
import { ArrowLeft, Wallet, RefreshCw, Copy, PlusCircle, History, Download } from "lucide-react"
import Link from 'next/link'
import NetworkStatus from '@/components/NetworkStatus'
import { WalletConnectButton } from "@/components/WalletConnectButton"

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
    payment_date: string
    payment_time: string
}

interface TaxPaidProofEntry {
    id: string
    payroll_id: string
    payment_id: string
    tax_authority: string
    gross_amount_micro: number
    tax_amount_micro: number
    net_amount_micro: number
}

const parsePaymentId = (paymentIdRecordString: string) => {
    const id = paymentIdRecordString.replace('.private', '').replace('field', '');

    if (id.length === 17 && ['1', '2', '3'].includes(id[0])) {
        const currencyCode = id[0];
        const timestampStr = id.substring(1, 11);
        const timestamp = parseInt(timestampStr, 10);

        // Sanity check timestamp (between Jan 1 2024 and Jan 1 2030)
        if (timestamp > 1704067200 && timestamp < 1893456000) {
            const currency = currencyCode === '1' ? 'CREDITS' : currencyCode === '2' ? 'USDCx' : 'USAD';
            const displayDate = new Date(timestamp * 1000)
            return {
                currency,
                date: displayDate.toLocaleDateString(),
                time: displayDate.toLocaleTimeString(),
                id
            };
        }
    }

    return { currency: 'CREDITS (Legacy)', date: 'Date unavailable', time: 'Time unavailable', id };
}

const parseLiteralNumber = (value?: string) => {
    if (!value) return 0
    return parseInt(value.replace(/u64|u32|u16|field|\.private|\.public|_/g, ''), 10) || 0
}

export default function EmployeePage() {
    const { wallet, address, requestRecords } = useWallet()
    const publicKey = address; // Alias for compatibility

    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    const isConnected = mounted && publicKey;

    const [certificates, setCertificates] = useState<SalaryCertificate[]>([])
    const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([])
    const [taxProofs, setTaxProofs] = useState<TaxPaidProofEntry[]>([])
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
            const records = await requestWalletRecords(
                requestRecords,
                PROGRAM_ID,
                true,
                (wallet as any)?.adapter
            )

            // Scan Certificates
            const allCerts: SalaryCertificate[] = (records as any[])
                .filter((rec: any) => !rec.spent && (rec.recordName === 'SalaryCertificate' || rec.recordName === 'VestingRecord'))
                .map((rec: any) => {
                    const amountRaw = getRecordField(rec, 'amount');
                    const startHeightRaw = getRecordField(rec, 'start_height') || getRecordField(rec, 'unlock_height');
                    const intervalRaw = getRecordField(rec, 'interval');
                    const claimCountRaw = getRecordField(rec, 'claim_count');
                    const payrollIdRaw = getRecordField(rec, 'payroll_id');

                    const plaintext = rec.recordPlaintext || rec.plaintext;
                    let detectedRecordName = 'SalaryCertificate';
                    if (plaintext && plaintext.includes('unlock_height')) {
                        detectedRecordName = 'VestingRecord';
                    } else if (rec.recordName) {
                        detectedRecordName = rec.recordName;
                    }

                    return {
                        id: rec.serialNumber || 'unknown',
                        amount: amountRaw || '0u64',
                        start_height: startHeightRaw ? parseInt(startHeightRaw.replace('u32', '')) : 0,
                        interval: intervalRaw ? parseInt(intervalRaw.replace('u32', '')) : 0,
                        claim_count: claimCountRaw ? parseInt(claimCountRaw.replace('u32', '')) : 0,
                        payroll_id: payrollIdRaw || 'unknown',
                        _record: plaintext,
                        recordName: detectedRecordName
                    };
                })

            // Deduplicate: Keep only the certificate with the highest claim_count for the same right
            const certMap = new Map<string, SalaryCertificate>()
            allCerts.forEach(cert => {
                // Determine uniqueness by payroll_id, amount, and start_height (defines the "Right")
                const key = `${cert.payroll_id}-${cert.amount}-${cert.start_height}`
                const existing = certMap.get(key)
                if (!existing || cert.claim_count > existing.claim_count) {
                    certMap.set(key, cert)
                }
            })
            setCertificates(Array.from(certMap.values()))

            // Scan Salary Payments (Proofs)
            const payments: SalaryRecord[] = (records as any[])
                .filter((rec: any) => rec.recordName === 'SalaryRecord')
                .map((rec: any) => {
                    const amountRaw = getRecordField(rec, 'amount');
                    const paymentIdRaw = getRecordField(rec, 'payment_id');
                    const payrollIdRaw = getRecordField(rec, 'payroll_id');
                    const parsed = parsePaymentId(paymentIdRaw || 'unknown')

                    return {
                        id: rec.serialNumber || 'unknown',
                        amount: amountRaw || '0u64',
                        payment_id: paymentIdRaw || 'unknown',
                        payroll_id: payrollIdRaw || 'unknown',
                        payment_date: parsed.date,
                        payment_time: parsed.time,
                    };
                })
            setSalaryRecords(payments)

            const proofs: TaxPaidProofEntry[] = (records as any[])
                .filter((rec: any) => rec.recordName === 'TaxPaidProof')
                .map((rec: any) => {
                    const payrollIdRaw = getRecordField(rec, 'payroll_id') || 'unknown'
                    const paymentIdRaw = getRecordField(rec, 'payment_id') || 'unknown'
                    const authorityRaw = getRecordField(rec, 'tax_authority') || 'unknown'
                    const grossRaw = getRecordField(rec, 'gross_amount')
                    const taxRaw = getRecordField(rec, 'tax_amount')
                    const netRaw = getRecordField(rec, 'net_amount')

                    return {
                        id: rec.serialNumber || rec.commitment || `proof-${Math.random()}`,
                        payroll_id: payrollIdRaw,
                        payment_id: paymentIdRaw,
                        tax_authority: authorityRaw.replace(/\.private|\.public/g, ''),
                        gross_amount_micro: parseLiteralNumber(grossRaw),
                        tax_amount_micro: parseLiteralNumber(taxRaw),
                        net_amount_micro: parseLiteralNumber(netRaw),
                    }
                })
                .sort((a, b) => b.net_amount_micro - a.net_amount_micro)
            setTaxProofs(proofs)

        } catch (e: any) {
            console.error("Error scanning records:", e)
            if (e.message && e.message.includes("Program not allowed")) {
                toast.error("New Program Detected: Please DISCONNECT and RECONNECT your wallet to authorize the new contract.")
            } else {
                toast.error("Error scanning records: " + e.message)
            }
        } finally {
            setIsScanning(false)
        }
    }

    const handleClaim = async (recordPlaintext: string, recordName?: string) => {
        if (!publicKey || !wallet) return
        setLoadingClaim(true)
        try {
            if (recordName === 'VestingRecord') {
                const isRetryable = (error: any) => {
                    const msg = String(error?.message || error || '').toLowerCase()
                    return msg.includes('no response') || msg.includes('disconnected port') || msg.includes('not connected')
                }

                let lastError: any = null
                for (let attempt = 1; attempt <= 2; attempt++) {
                    try {
                        await requestTransaction(
                            wallet?.adapter!,
                            publicKey,
                            PROGRAM_ID,
                            'claim_vested',
                            [recordPlaintext],
                            500000 // Fee (0.5 credits)
                        )
                        lastError = null
                        break
                    } catch (err) {
                        lastError = err
                        if (!isRetryable(err) || attempt === 2) break
                        await new Promise((resolve) => setTimeout(resolve, 250))
                    }
                }
                if (lastError) throw lastError
                toast.success("Vesting Unlocked! Please rescan your wallet to claim the resulting Salary Certificate.")
            } else {
                const pendingClaims = JSON.parse(localStorage.getItem('pending_pull_claims') || '[]');
                pendingClaims.push({
                    employee: publicKey,
                    certificateRecord: recordPlaintext,
                    timestamp: Date.now()
                });
                localStorage.setItem('pending_pull_claims', JSON.stringify(pendingClaims));

                toast.success("Pull Request sent to Admin Relayer! Your funds will be processed automatically.")
            }
        } catch (e: any) {
            console.error("Error claiming salary:", e)
            toast.error("Failed to claim: " + e.message)
        } finally {
            setLoadingClaim(false)
        }
    }

    const handleDownloadTaxProof = (proof: TaxPaidProofEntry) => {
        try {
            const payload = {
                schema: 'zkp_tax_paid_proof_v1',
                generated_at: new Date().toISOString(),
                program_id: PROGRAM_ID,
                employee_wallet: publicKey,
                proof: {
                    serial: proof.id,
                    payroll_id: proof.payroll_id,
                    payment_id: proof.payment_id,
                    tax_authority: proof.tax_authority,
                    gross_amount_micro: proof.gross_amount_micro,
                    tax_amount_micro: proof.tax_amount_micro,
                    net_amount_micro: proof.net_amount_micro,
                },
            }

            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const anchor = document.createElement('a')
            const safePaymentId = proof.payment_id.replace(/[^a-zA-Z0-9_-]/g, '')
            anchor.href = url
            anchor.download = `zkp-tax-proof-${safePaymentId || 'record'}.json`
            document.body.appendChild(anchor)
            anchor.click()
            document.body.removeChild(anchor)
            URL.revokeObjectURL(url)
            toast.success('Tax proof JSON downloaded.')
        } catch (error: any) {
            console.error('Failed to download tax proof', error)
            toast.error('Unable to download tax proof: ' + (error?.message || 'unknown error'))
        }
    }

    return (
        <main className="min-h-screen relative z-10 font-sans text-gray-100 bg-black selection:bg-white/20 pt-32">
            <div 
                className="fixed inset-0 z-0 bg-[length:800px] md:bg-[length:1800px] bg-left bg-no-repeat bg-fixed opacity-40"
                style={{ backgroundImage: "url('/assets/milad-fakurian-7W3X1dAuKqg-unsplash.jpg')" }}
            />
            <div className="fixed inset-0 z-0 bg-black/60 backdrop-blur-[2px]" />

            {/* Content Container */}
            <div className="w-full max-w-6xl mx-auto px-6 pb-20 z-10 relative">

                {/* Header */}
                <div className="mb-12 border-b border-white/5 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e293b] text-blue-400 text-xs font-bold tracking-widest uppercase mb-4">
                        Employee Portal
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">
                        My Payroll Workspace
                    </h1>
                    <p className="text-[#a1a1aa] text-lg max-w-2xl">
                        Review salary rights, unlock vesting, submit pull requests, and keep your private payout and tax records organized.
                    </p>
                </div>

                <NetworkStatus />

                {/* Dashboard Grid */}
                {isConnected ? (
                    <div className="space-y-12">

                        {/* Info Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                            {/* Connected Wallet Card */}
                            <GlassCard className="border-white/5 bg-[#0a0a0a] p-6 rounded-3xl group hover:border-white/10 transition-colors relative overflow-hidden">
                                <div className="flex justify-between items-start mb-6">
                                    <span className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider">Connected Wallet</span>
                                    <button className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/10">
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="relative flex items-center justify-center">
                                        <div className="w-4 h-4 rounded-full bg-blue-500 relative z-10 border-2 border-black" />
                                    </div>
                                    <span className="font-mono text-2xl font-bold text-white tracking-tight">
                                        {publicKey.slice(0, 12)}...{publicKey.slice(-8)}
                                    </span>
                                </div>
                            </GlassCard>

                            {/* Network Status Card */}
                            <GlassCard className="border-white/5 bg-[#0a0a0a] p-6 rounded-3xl group hover:border-white/10 transition-colors relative overflow-hidden">
                                <div className="flex justify-between items-start mb-6">
                                    <span className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider">Network Status</span>
                                    <button
                                        className={`p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/10 ${!currentHeight && 'animate-spin'}`}
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-4xl font-black text-white tracking-tight">
                                        #{currentHeight > 0 ? currentHeight : '---'}
                                    </span>
                                </div>
                            </GlassCard>
                        </div>

                        {/* Salary Rights Section */}
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight">
                                        <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                                            <PlusCircle className="w-5 h-5 text-white" />
                                        </div>
                                        Aleo Salary Rights
                                    </h2>
                                    <p className="text-sm text-[#a1a1aa] mt-2">Vesting streams and payroll pull claims appear here when your wallet has something to unlock or redeem.</p>
                                </div>
                                <button
                                    onClick={scanRecords}
                                    disabled={isScanning}
                                    className="flex items-center justify-center md:justify-start gap-2 px-6 py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                                    {isScanning ? 'Scanning...' : 'Scan Payroll Records'}
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
                                <GlassCard className="w-full border-white/5 bg-[#0a0a0a]/50 p-16 text-center border-dashed rounded-3xl">
                                    <p className="text-[#a1a1aa] mb-4 text-lg">No claimable payroll rights found yet.</p>
                                    <button onClick={scanRecords} className="text-sm font-semibold text-white underline underline-offset-4 hover:text-gray-300 transition-colors">Scan Again</button>
                                </GlassCard>
                            )}
                        </div>

                        {/* Withdrawal History */}
                        <div className="space-y-6">
                            <div className="flex items-start md:items-center gap-4 mb-6">
                                <div className="p-2 rounded-lg bg-white/5 border border-white/10 mt-1 md:mt-0 shrink-0">
                                    <History className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight">Private Payment History</h2>
                                    <p className="text-sm text-[#a1a1aa] mt-2 max-w-2xl">
                                        Completed payroll payments appear here after they are settled to your wallet.
                                        <span className="block mt-1 text-gray-500">Some claim-based payouts may arrive without the same payment memo details, but the amount and payroll reference remain visible here whenever a history entry is created.</span>
                                    </p>
                                </div>
                            </div>

                            <GlassCard hover={false} className="border-white/5 bg-[#0a0a0a] p-0 rounded-3xl overflow-hidden relative">
                                {salaryRecords.length > 0 ? (
                                    <div className="overflow-x-auto relative z-10">
                                        <table className="w-full text-left">
                                            <thead className="bg-[#050505] text-[#a1a1aa] text-[10px] font-bold uppercase tracking-widest border-b border-white/5">
                                                <tr>
                                                    <th className="px-6 py-6 font-semibold">Amount</th>
                                                    <th className="px-6 py-6 font-semibold">Payment ID</th>
                                                    <th className="px-6 py-6 font-semibold">Date &amp; Time</th>
                                                    <th className="px-6 py-6 font-semibold">Payroll ID</th>
                                                    <th className="px-6 py-6 font-semibold text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5 text-sm bg-black/30">
                                                {salaryRecords.map((rec, idx) => {
                                                    const parsed = parsePaymentId(rec.payment_id);
                                                    return (
                                                        <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                                            <td className="px-6 py-5 font-bold text-white text-base">
                                                                {(Number(rec.amount.replace('.private', '').replace('u64', '')) / 1000000).toLocaleString(undefined, { maximumFractionDigits: 6 })} <span className="text-xs text-blue-400 font-medium uppercase ml-1">{parsed.currency}</span>
                                                            </td>
                                                            <td className="px-6 py-5 text-[#a1a1aa] group-hover:text-white transition-colors">
                                                                <span className="font-mono">{parsed.id.length > 15 ? `${parsed.id.slice(0, 10)}...${parsed.id.slice(-4)}` : parsed.id}</span>
                                                            </td>
                                                            <td className="px-6 py-5 text-[#a1a1aa] group-hover:text-white transition-colors">
                                                                <div className="flex flex-col">
                                                                    <span>{rec.payment_date}</span>
                                                                    <span className="text-[10px] text-gray-500 tracking-wide mt-0.5">{rec.payment_time}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5 font-mono text-[#a1a1aa] group-hover:text-white transition-colors">
                                                                {rec.payroll_id.replace('.private', '').replace('field', '')}
                                                            </td>
                                                            <td className="px-6 py-5 text-right">
                                                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest">
                                                                    Processed
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-16 text-center text-[#a1a1aa] text-sm relative z-10">
                                        <History className="w-8 h-8 text-white/20 mx-auto mb-4" />
                                        No payment history found yet
                                    </div>
                                )}
                            </GlassCard>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-start md:items-center gap-4 mb-6">
                                <div className="p-2 rounded-lg bg-white/5 border border-white/10 mt-1 md:mt-0 shrink-0">
                                    <Download className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight">Tax Withholding Proofs</h2>
                                    <p className="text-sm text-[#a1a1aa] mt-2 max-w-2xl">
                                        When payroll withholding is applied, you can download your proof file from here for your records.
                                    </p>
                                </div>
                            </div>

                            <GlassCard hover={false} className="border-white/5 bg-[#0a0a0a] p-0 rounded-3xl overflow-hidden relative">
                                {taxProofs.length > 0 ? (
                                    <div className="overflow-x-auto relative z-10">
                                        <table className="w-full text-left">
                                            <thead className="bg-[#050505] text-[#a1a1aa] text-[10px] font-bold uppercase tracking-widest border-b border-white/5">
                                                <tr>
                                                    <th className="px-6 py-6 font-semibold">Gross</th>
                                                    <th className="px-6 py-6 font-semibold">Tax</th>
                                                    <th className="px-6 py-6 font-semibold">Net</th>
                                                    <th className="px-6 py-6 font-semibold">Authority</th>
                                                    <th className="px-6 py-6 font-semibold text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5 text-sm bg-black/30">
                                                {taxProofs.map((proof) => (
                                                    <tr key={proof.id} className="hover:bg-white/5 transition-colors group">
                                                        <td className="px-6 py-5 font-bold text-white">
                                                            {(proof.gross_amount_micro / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                                                        </td>
                                                        <td className="px-6 py-5 text-zinc-300">
                                                            {(proof.tax_amount_micro / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                                                        </td>
                                                        <td className="px-6 py-5 text-zinc-300">
                                                            {(proof.net_amount_micro / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                                                        </td>
                                                        <td className="px-6 py-5 font-mono text-[#a1a1aa] group-hover:text-white transition-colors">
                                                            {proof.tax_authority.length > 20
                                                                ? `${proof.tax_authority.slice(0, 12)}...${proof.tax_authority.slice(-8)}`
                                                                : proof.tax_authority}
                                                        </td>
                                                        <td className="px-6 py-5 text-right">
                                                            <button
                                                                onClick={() => handleDownloadTaxProof(proof)}
                                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-black text-white text-xs font-bold hover:border-white/30 transition-colors"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                                Download JSON
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-16 text-center text-[#a1a1aa] text-sm relative z-10">
                                        <Download className="w-8 h-8 text-white/20 mx-auto mb-4" />
                                        No tax proofs found yet. Process a taxed payroll claim and scan this wallet again.
                                    </div>
                                )}
                            </GlassCard>
                        </div>

                    </div>
                ) : (
                    <GlassCard hover={false} className="flex flex-col items-center justify-center py-24 bg-[#0a0a0a] border-white/5 rounded-3xl">
                        <div className="p-4 rounded-full bg-white/5 border border-white/10 mb-6">
                            <Wallet className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-2xl text-white font-bold mb-3 tracking-tight">Wallet Not Connected</h2>
                        <p className="text-[#a1a1aa] text-base max-w-md text-center mb-8">
                            Please connect your Aleo wallet using the button in the top right to view salary rights, claim vesting, and manage private payroll records.
                        </p>
                    </GlassCard>
                )}
            </div>

            {/* Background Decor */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] opacity-20" />
            </div>
        </main>
    )
}
