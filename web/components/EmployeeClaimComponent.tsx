'use client'

import { useState, useEffect } from 'react'

interface SalaryCertificate {
    id: string
    amount: string
    start_height: number
    interval: number
    claim_count: number
    payroll_id: string
    _record: any // The full Leo record object needed for consumption
}

interface EmployeeClaimProps {
    certificate: SalaryCertificate
    currentBlockHeight: number
    onClaim: (certificate: any) => void
    loading: boolean
}

export function EmployeeClaimComponent({ certificate, currentBlockHeight, onClaim, loading }: EmployeeClaimProps) {
    const [timeRemaining, setTimeRemaining] = useState<string>('')
    const [canClaim, setCanClaim] = useState(false)

    // Parse "amount" string like "5000u64.private" -> "5000"
    const displayAmount = certificate.amount.replace(/u64|u32|field|\.private/g, '')

    // Calculate next claim block
    const nextClaimHeight = certificate.start_height + (certificate.claim_count * certificate.interval)
    const blocksLeft = nextClaimHeight - currentBlockHeight

    useEffect(() => {
        if (blocksLeft <= 0) {
            setCanClaim(true)
            setTimeRemaining('Ready to claim!')
        } else {
            setCanClaim(false)
            // Approx 3 seconds per block on Aleo
            const secondsLeft = blocksLeft * 3
            const minutes = Math.floor(secondsLeft / 60)
            const seconds = secondsLeft % 60
            setTimeRemaining(`${blocksLeft} blocks (~${minutes}m ${seconds}s)`)
        }
    }, [blocksLeft, currentBlockHeight])

    return (
        <div className="glass-card flex flex-col h-full bg-white/5 border border-white/10">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <span className="inline-block px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider bg-white/10 text-white mb-2 border border-white/5">
                        Salary Right
                    </span>
                    <h3 className="text-2xl font-bold font-mono text-white">{displayAmount} <span className="text-sm font-sans font-normal text-gray-400">Credits</span></h3>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Next Withdrawal</p>
                    <p className={`font-mono font-bold ${canClaim ? 'text-green-400' : 'text-orange-400'}`}>
                        {canClaim ? 'NOW' : `Block ${nextClaimHeight}`}
                    </p>
                </div>
            </div>

            <div className="bg-black/20 rounded-lg p-4 mb-6 space-y-2 border border-white/5">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Current Block</span>
                    <span className="font-mono text-gray-300">{currentBlockHeight > 0 ? currentBlockHeight : 'Syncing...'}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Wait Time</span>
                    <span className="font-mono text-gray-300">{timeRemaining}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Withdrawals So Far</span>
                    <span className="font-mono text-gray-300">{certificate.claim_count}</span>
                </div>
            </div>

            <button
                onClick={() => onClaim(certificate._record)}
                disabled={!canClaim || loading}
                className={`w-full py-3 rounded-lg font-bold transition-all border mt-auto ${canClaim
                    ? 'bg-white text-black hover:bg-gray-200 border-transparent shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                    : 'bg-transparent text-gray-600 border-gray-800 cursor-not-allowed'
                    }`}
            >
                {loading ? 'Processing...' : canClaim ? 'Withdraw Funds' : `Locked (${blocksLeft} Blocks)`}
            </button>
        </div>
    )
}
