'use client'

import { useState, useEffect } from 'react'
import { motion } from "framer-motion"
import { Link, ArrowRight, CheckCircle, Clock } from "lucide-react"

interface SalaryCertificate {
    id: string
    amount: string
    start_height: number
    interval: number
    claim_count: number
    payroll_id: string
    _record: any
    recordName?: string
}

interface EmployeeClaimProps {
    certificate: SalaryCertificate
    currentBlockHeight: number
    onClaim: (recordPlaintext: string, recordName?: string) => void
    loading: boolean
}

export function EmployeeClaimComponent({ certificate, currentBlockHeight, onClaim, loading }: EmployeeClaimProps) {
    const [timeRemaining, setTimeRemaining] = useState<string>('')
    const [canClaim, setCanClaim] = useState(false)

    // Clean display values
    const rawMicro = Number(certificate.amount.replace(/u64|u32|field|\.private|_/g, '')) || 0
    const displayAmount = (rawMicro / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })

    // Calculate details
    const nextClaimHeight = certificate.start_height + (certificate.claim_count * certificate.interval)
    const blocksLeft = nextClaimHeight - currentBlockHeight

    useEffect(() => {
        if (blocksLeft <= 0) {
            setCanClaim(true)
            setTimeRemaining('Ready to claim')
        } else {
            setCanClaim(false)
            // Approx 3 seconds per block on Aleo
            const secondsLeft = blocksLeft * 3
            if (secondsLeft > 120) {
                const minutes = Math.ceil(secondsLeft / 60)
                setTimeRemaining(`~${minutes}m left`)
            } else {
                setTimeRemaining(`~${secondsLeft}s left`)
            }
        }
    }, [blocksLeft, currentBlockHeight])

    return (
        <div className="flex flex-col h-full bg-[#111111] border border-white/5 p-6 rounded-xl hover:border-white/10 transition-colors group relative overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-start mb-6 z-10 relative">
                <div className="flex items-center gap-2 text-gray-500">
                    <Link className="w-4 h-4 rotate-45" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Payroll Right</span>
                </div>
                <div className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${canClaim
                    ? 'bg-[#1A3325] text-[#4ADE80] border-[#4ADE80]/20'
                    : 'bg-[#331A1A] text-[#FB923C] border-[#FB923C]/20'
                    }`}>
                    {canClaim ? 'Available' : 'Locked'}
                </div>
            </div>

            {/* Main Amount */}
            <div className="mb-8 z-10 relative">
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white tracking-tight">{displayAmount}</span>
                    <span className="text-sm text-gray-500 font-medium">credits</span>
                </div>
                <p className="text-xs text-gray-600 mt-1 pl-0.5">{certificate.recordName === 'VestingRecord' ? 'Total vesting allocation' : 'Claimable interval amount'}</p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8 z-10 relative">
                <div className="p-4 bg-black/40 rounded-lg border border-white/5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Status</span>
                    <span className={`text-sm font-bold ${canClaim ? 'text-white' : 'text-gray-400'}`}>
                        {timeRemaining}
                    </span>
                </div>
                <div className="p-4 bg-black/40 rounded-lg border border-white/5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Type</span>
                    <span className="text-sm font-bold text-gray-200">{certificate.recordName === 'VestingRecord' ? 'Time-Locked Vesting' : 'Recurring Claim Stream'}</span>
                </div>
            </div>

            {/* Action Button */}
            <div className="mt-auto z-10 relative">
                <button
                    onClick={() => onClaim(certificate._record, certificate.recordName)}
                    disabled={!canClaim || loading}
                    className={`w-full py-3.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${canClaim && !loading
                        ? 'bg-white text-black hover:bg-gray-200 shadow-lg shadow-white/5'
                        : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                        }`}
                >
                    {loading ? 'Processing...' : canClaim ? (
                        <>
                            Continue Claim <ArrowRight className="w-4 h-4 ml-1" />
                        </>
                    ) : (
                        <>
                            <Clock className="w-4 h-4" /> Wait {blocksLeft} Blocks
                        </>
                    )}
                </button>
            </div>

            {/* Glow Effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
    )
}
