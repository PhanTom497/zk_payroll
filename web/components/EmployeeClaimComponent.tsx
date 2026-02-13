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
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mb-2">
                        Salary Certificate
                    </span>
                    <h3 className="text-xl font-bold font-mono">{displayAmount} Credits</h3>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500">Next Claim</p>
                    <p className={`font-mono font-bold ${canClaim ? 'text-green-500' : 'text-orange-500'}`}>
                        {canClaim ? 'NOW' : `Block ${nextClaimHeight}`}
                    </p>
                </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Current Block</span>
                    <span className="font-mono">{currentBlockHeight > 0 ? currentBlockHeight : 'Loading...'}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Wait Time</span>
                    <span className="font-mono">{timeRemaining}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Claims So Far</span>
                    <span className="font-mono">{certificate.claim_count}</span>
                </div>
            </div>

            <button
                onClick={() => onClaim(certificate._record)}
                disabled={!canClaim || loading}
                className={`w-full py-3 rounded-lg font-bold transition-all ${canClaim
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                    }`}
            >
                {loading ? 'Processing...' : canClaim ? 'Claim Salary' : `Wait ${blocksLeft} Blocks`}
            </button>
        </div>
    )
}
