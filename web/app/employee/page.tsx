'use client'

import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useState, useEffect } from 'react'
import { fetchBlockHeight, requestTransaction, PROGRAM_ID, getRecordField } from '@/lib/zk-utils'
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import GlassCard from "@/components/GlassCard"
import { motion } from "framer-motion"
import { EmployeeClaimComponent } from '@/components/EmployeeClaimComponent'
import { ArrowLeft, Wallet, RefreshCw, Copy, PlusCircle, History } from "lucide-react"
import Link from 'next/link'

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
    const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([])
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
            const records = await requestRecords(PROGRAM_ID, true)

            // Scan Certificates
            const allCerts: SalaryCertificate[] = (records as any[])
                .filter((rec: any) => !rec.spent && rec.recordName === 'SalaryCertificate')
                .map((rec: any) => {
                    const amountRaw = getRecordField(rec, 'amount');
                    const startHeightRaw = getRecordField(rec, 'start_height');
                    const intervalRaw = getRecordField(rec, 'interval');
                    const claimCountRaw = getRecordField(rec, 'claim_count');
                    const payrollIdRaw = getRecordField(rec, 'payroll_id');

                    return {
                        id: rec.serialNumber || 'unknown',
                        amount: amountRaw || '0u64',
                        start_height: startHeightRaw ? parseInt(startHeightRaw.replace('u32', '')) : 0,
                        interval: intervalRaw ? parseInt(intervalRaw.replace('u32', '')) : 0,
                        claim_count: claimCountRaw ? parseInt(claimCountRaw.replace('u32', '')) : 0,
                        payroll_id: payrollIdRaw || 'unknown',
                        _record: rec.recordPlaintext || rec.plaintext
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

                    return {
                        id: rec.serialNumber || 'unknown',
                        amount: amountRaw || '0u64',
                        payment_id: paymentIdRaw || 'unknown',
                        payroll_id: payrollIdRaw || 'unknown'
                    };
                })
            setSalaryRecords(payments)

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
            toast.success("Transaction submitted. Update incoming...")
        } catch (e: any) {
            console.error("Error claiming salary:", e)
            toast.error("Failed to claim: " + e.message)
        } finally {
            setLoadingClaim(false)
        }
    }

    return (
        <main className="min-h-screen bg-black text-gray-100 font-sans selection:bg-white/20">
            {/* Top Bar */}
            <div className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-10 relative">
                <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Link>
                {publicKey && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="font-mono text-xs text-gray-300">
                            {publicKey.slice(0, 10)}...{publicKey.slice(-6)}
                        </span>
                    </div>
                )}
            </div>

            {/* Content Container */}
            <div className="w-full max-w-6xl mx-auto px-6 pb-20 z-10 relative">

                {/* Centered Header */}
                <div className="text-center mb-16 mt-4">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">Employee Portal</h1>
                </div>

                {/* Dashboard Grid */}
                {publicKey ? (
                    <div className="space-y-12">

                        {/* Info Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Connected Wallet Card */}
                            <div className="bg-[#111111] border border-white/5 p-6 rounded-xl relative group">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Connected Wallet</span>
                                    <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors">
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="font-mono text-xl text-white tracking-tight">
                                        {publicKey.slice(0, 12)}...{publicKey.slice(-8)}
                                    </span>
                                </div>
                            </div>

                            {/* Network Status Card */}
                            <div className="bg-[#111111] border border-white/5 p-6 rounded-xl relative group">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Network Status</span>
                                    <button
                                        className={`p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors ${!currentHeight && 'animate-spin'}`}
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-2xl font-bold text-white tracking-tight">
                                        #{currentHeight > 0 ? currentHeight : '---'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Salary Rights Section */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <PlusCircle className="w-5 h-5 text-gray-400" />
                                        Salary Rights
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1 ml-7">Your authorized salary streams.</p>
                                </div>
                                <button
                                    onClick={scanRecords}
                                    disabled={isScanning}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-lg font-bold text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                                    {isScanning ? 'Scanning...' : 'Check for Paychecks'}
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
                                <div className="w-full bg-[#111111] border border-white/5 border-dashed rounded-xl p-16 text-center">
                                    <p className="text-gray-500 mb-4">No salary certificates found.</p>
                                    <button onClick={scanRecords} className="text-sm text-white underline underline-offset-4">Scan Network</button>
                                </div>
                            )}
                        </div>

                        {/* Withdrawal History */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <History className="w-5 h-5 text-white" />
                                <h2 className="text-xl font-bold text-white">Withdrawal History</h2>
                            </div>

                            <div className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden">
                                {salaryRecords.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-black/40 text-gray-500 text-[10px] font-bold uppercase tracking-widest border-b border-white/5">
                                                <tr>
                                                    <th className="px-6 py-5 font-medium">Amount</th>
                                                    <th className="px-6 py-5 font-medium">Payment ID</th>
                                                    <th className="px-6 py-5 font-medium">Payroll ID</th>
                                                    <th className="px-6 py-5 font-medium text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5 text-sm">
                                                {salaryRecords.map((rec, idx) => (
                                                    <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                                        <td className="px-6 py-5 font-bold text-white">
                                                            {rec.amount.replace('.private', '').replace('u64', '')} <span className="text-xs text-gray-500 font-normal">credits</span>
                                                        </td>
                                                        <td className="px-6 py-5 font-mono text-gray-500 group-hover:text-gray-400">
                                                            {rec.payment_id.replace('.private', '').replace('field', '')}
                                                        </td>
                                                        <td className="px-6 py-5 font-mono text-gray-500 group-hover:text-gray-400">
                                                            {rec.payroll_id.replace('.private', '').replace('field', '')}
                                                        </td>
                                                        <td className="px-6 py-5 text-right">
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded bg-[#1A3325] text-[#4ADE80] text-[10px] font-bold uppercase tracking-wider">
                                                                Withdrawn
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-gray-500 text-sm">
                                        No withdrawal history found
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-[#111111] border border-white/5 rounded-xl">
                        <Wallet className="w-12 h-12 text-gray-600 mb-6" />
                        <h2 className="text-xl text-white font-bold mb-2">Wallet Not Connected</h2>
                        <p className="text-gray-500 text-sm max-w-md text-center mb-8">
                            Please connect your Leo Wallet to view your salary rights and claim paychecks.
                        </p>
                    </div>
                )}
            </div>

            {/* Background Decor */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/5 blur-[120px] rounded-full" />
                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] opacity-20" />
            </div>
        </main>
    )
}
