'use client'

import { useEffect, useMemo, useState } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { toast } from 'sonner'
import GlassCard from '@/components/GlassCard'
import NetworkStatus from '@/components/NetworkStatus'
import { WalletConnectButton } from '@/components/WalletConnectButton'
import { fetchBlockHeight, fetchMappingValue, getRecordField, PROGRAM_ID, requestWalletRecords } from '@/lib/zk-utils'
import { Receipt, Landmark, ShieldCheck, Download, RefreshCw, Users, Wallet } from 'lucide-react'

interface TaxVaultEntry {
    id: string
    payrollId: string
    paymentId: string
    employee: string
    taxAuthority: string
    grossMicro: number
    taxMicro: number
    netMicro: number
    timestamp: number | null
}

const normalizeAddress = (value?: string | null) =>
    String(value || '')
        .replace(/"/g, '')
        .replace(/\.private|\.public/g, '')
        .trim()
        .toLowerCase()

const parseLiteralNumber = (value?: string) => {
    if (!value) return 0
    return parseInt(value.replace(/u64|u32|u16|field|\.private|\.public|_/g, ''), 10) || 0
}

const formatCredits = (micro: number) =>
    (micro / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })

const shortenAddress = (value: string) =>
    value.length > 22 ? `${value.slice(0, 12)}...${value.slice(-8)}` : value

const parsePaymentMetadata = (paymentIdRaw: string) => {
    const id = paymentIdRaw.replace('.private', '').replace('field', '')

    if (id.length === 17 && ['1', '2', '3'].includes(id[0])) {
        const currencyCode = id[0]
        const timestampStr = id.substring(1, 11)
        const timestamp = parseInt(timestampStr, 10)

        if (timestamp > 1704067200 && timestamp < 1893456000) {
            const currency = currencyCode === '1' ? 'CREDITS' : currencyCode === '2' ? 'USDCx' : 'USAD'
            return {
                id,
                currency,
                timestamp,
                date: new Date(timestamp * 1000).toLocaleString(),
            }
        }
    }

    return {
        id,
        currency: 'CREDITS',
        timestamp: null,
        date: 'Time unavailable',
    }
}

export default function TaxAuthorityPage() {
    const { wallet, address, requestRecords } = useWallet()
    const publicKey = address

    const [mounted, setMounted] = useState(false)
    const [currentHeight, setCurrentHeight] = useState(0)
    const [taxAuthorityAddress, setTaxAuthorityAddress] = useState('')
    const [activeTaxBps, setActiveTaxBps] = useState(0)
    const [taxCollectedMicro, setTaxCollectedMicro] = useState(0)
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
    const [loadingAuthority, setLoadingAuthority] = useState(true)
    const [loadingRecords, setLoadingRecords] = useState(false)
    const [records, setRecords] = useState<TaxVaultEntry[]>([])
    const [error, setError] = useState('')

    const isConnected = mounted && !!publicKey

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        const updateHeight = async () => {
            const height = await fetchBlockHeight()
            if (height > 0) setCurrentHeight(height)
        }

        updateHeight()
        const interval = setInterval(updateHeight, 10000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const fetchAuthorityState = async () => {
            setLoadingAuthority(true)
            try {
                const [authorityValue, taxBpsValue, collectedValue] = await Promise.all([
                    fetchMappingValue('tax_authority', '1field'),
                    fetchMappingValue('tax_percentage_bps', '1field'),
                    fetchMappingValue('tax_collected_total', '1field'),
                ])

                const cleanedAuthority = normalizeAddress(authorityValue)
                setTaxAuthorityAddress(cleanedAuthority)
                setActiveTaxBps(parseLiteralNumber(taxBpsValue || '0u16'))
                setTaxCollectedMicro(parseLiteralNumber(collectedValue || '0u64'))

                if (!cleanedAuthority) {
                    setIsAuthorized(false)
                } else if (publicKey) {
                    setIsAuthorized(normalizeAddress(publicKey) === cleanedAuthority)
                } else {
                    setIsAuthorized(null)
                }
            } catch (err) {
                console.error('Failed to fetch tax authority state', err)
                setIsAuthorized(false)
            } finally {
                setLoadingAuthority(false)
            }
        }

        fetchAuthorityState()
    }, [publicKey])

    const scanRecords = async () => {
        if (!publicKey || !requestRecords) return
        setLoadingRecords(true)
        setError('')

        try {
            const walletRecords = await requestWalletRecords(
                requestRecords,
                PROGRAM_ID,
                true,
                (wallet as any)?.adapter
            )
            const taxVaultRecords: TaxVaultEntry[] = (walletRecords as any[])
                .filter((record: any) => record.recordName === 'TaxVaultRecord')
                .map((record: any) => {
                    const paymentId = getRecordField(record, 'payment_id') || 'unknown'
                    const paymentMetadata = parsePaymentMetadata(paymentId)

                    return {
                        id: record.serialNumber || record.commitment || `tax-vault-${Math.random()}`,
                        payrollId: (getRecordField(record, 'payroll_id') || 'unknown').replace(/\.private|\.public/g, ''),
                        paymentId: paymentMetadata.id,
                        employee: (getRecordField(record, 'employee') || 'unknown').replace(/\.private|\.public/g, ''),
                        taxAuthority: (getRecordField(record, 'tax_authority') || 'unknown').replace(/\.private|\.public/g, ''),
                        grossMicro: parseLiteralNumber(getRecordField(record, 'gross_amount')),
                        taxMicro: parseLiteralNumber(getRecordField(record, 'tax_amount')),
                        netMicro: parseLiteralNumber(getRecordField(record, 'net_amount')),
                        timestamp: paymentMetadata.timestamp,
                    }
                })
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0) || b.taxMicro - a.taxMicro)

            setRecords(taxVaultRecords)
        } catch (err: any) {
            console.error('Failed to fetch tax vault records', err)
            const message = err?.message || 'Unknown error'
            setError('Failed to fetch tax receipts: ' + message)
            if (message.includes('Program not allowed')) {
                toast.error('New Program Detected: Please disconnect and reconnect your wallet to authorize the current contract.')
            } else {
                toast.error('Failed to fetch tax receipts: ' + message)
            }
        } finally {
            setLoadingRecords(false)
        }
    }

    const handleDownloadReceipt = (entry: TaxVaultEntry) => {
        try {
            const payload = {
                schema: 'zkp_tax_vault_receipt_v1',
                generated_at: new Date().toISOString(),
                program_id: PROGRAM_ID,
                authority_wallet: publicKey,
                receipt: {
                    serial: entry.id,
                    payroll_id: entry.payrollId,
                    payment_id: entry.paymentId,
                    employee: entry.employee,
                    tax_authority: entry.taxAuthority,
                    gross_amount_micro: entry.grossMicro,
                    tax_amount_micro: entry.taxMicro,
                    net_amount_micro: entry.netMicro,
                },
            }

            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = `zkp-tax-vault-${entry.paymentId.replace(/[^a-zA-Z0-9_-]/g, '') || 'record'}.json`
            document.body.appendChild(anchor)
            anchor.click()
            document.body.removeChild(anchor)
            URL.revokeObjectURL(url)
            toast.success('Tax vault receipt JSON downloaded.')
        } catch (err: any) {
            console.error('Failed to download tax vault receipt', err)
            toast.error('Unable to download tax vault receipt: ' + (err?.message || 'unknown error'))
        }
    }

    const totalWithheldFromWallet = useMemo(
        () => records.reduce((sum, entry) => sum + entry.taxMicro, 0),
        [records]
    )

    const uniqueEmployees = useMemo(
        () => new Set(records.map((entry) => normalizeAddress(entry.employee)).filter(Boolean)).size,
        [records]
    )

    const latestReceipt = useMemo(
        () => records.find((entry) => entry.timestamp !== null) || null,
        [records]
    )

    return (
        <main className="min-h-screen relative z-10 font-sans text-gray-100 bg-black selection:bg-white/20 pt-32">
            <div
                className="fixed inset-0 z-0 bg-[length:800px] md:bg-[length:1800px] bg-left bg-no-repeat bg-fixed opacity-40"
                style={{ backgroundImage: "url('/assets/milad-fakurian-7W3X1dAuKqg-unsplash.jpg')" }}
            />
            <div className="fixed inset-0 z-0 bg-black/60 backdrop-blur-[2px]" />

            <div className="w-full max-w-6xl mx-auto px-6 pb-20 relative z-10">
                <div className="mb-12 border-b border-white/5 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e293b] text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4">
                        Tax Authority Portal
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">
                        Tax Receipt Vault
                    </h1>
                    <p className="text-[#a1a1aa] text-lg max-w-3xl">
                        Review withheld payroll amounts, confirm collected totals, and download receipt files for record keeping.
                    </p>
                </div>

                <NetworkStatus />

                {!isConnected ? (
                    <GlassCard hover={false} className="flex flex-col items-center justify-center py-24 bg-[#0a0a0a] border-white/5 rounded-3xl">
                        <div className="p-4 rounded-full bg-white/5 border border-white/10 mb-6">
                            <Wallet className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-2xl text-white font-bold mb-3 tracking-tight">Wallet Not Connected</h2>
                        <p className="text-[#a1a1aa] text-base max-w-md text-center mb-8">
                            Connect the assigned tax authority wallet to review withheld payroll amounts and download receipt files.
                        </p>
                        <WalletConnectButton />
                    </GlassCard>
                ) : loadingAuthority || isAuthorized === null ? (
                    <GlassCard hover={false} className="p-16 text-center flex flex-col items-center justify-center border-dashed border-white/5 bg-[#0a0a0a]/50 rounded-3xl min-h-[320px]">
                        <RefreshCw className="w-16 h-16 text-white/20 mb-6 animate-spin" />
                        <h3 className="text-2xl font-bold mb-3 text-white tracking-tight">Validating Tax Authority Access</h3>
                        <p className="text-[#a1a1aa] max-w-xl">
                            Checking the assigned tax authority wallet and loading the current payroll withholding settings.
                        </p>
                    </GlassCard>
                ) : !taxAuthorityAddress ? (
                    <GlassCard hover={false} className="p-16 text-center flex flex-col items-center justify-center border-dashed border-white/5 bg-[#0a0a0a]/50 rounded-3xl min-h-[320px]">
                        <Landmark className="w-16 h-16 text-white/20 mb-6" />
                        <h3 className="text-2xl font-bold mb-3 text-white tracking-tight">Tax Policy Not Configured</h3>
                        <p className="text-[#a1a1aa] max-w-xl">
                            This payroll has not assigned a tax authority wallet yet. Save a tax policy in the Admin portal first.
                        </p>
                    </GlassCard>
                ) : isAuthorized === false ? (
                    <GlassCard hover={false} className="p-16 text-center flex flex-col items-center justify-center border-dashed border-white/5 bg-[#0a0a0a]/50 rounded-3xl min-h-[320px]">
                        <ShieldCheck className="w-16 h-16 text-white/20 mb-6" />
                        <h3 className="text-2xl font-bold mb-3 text-white tracking-tight">Tax Authority Access Required</h3>
                        <p className="text-[#a1a1aa] max-w-xl mb-4">
                            Switch to the wallet configured on-chain as the payroll tax authority to continue.
                        </p>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">
                            <span className="text-[#a1a1aa]">Expected wallet:</span>
                            <span className="font-mono">{shortenAddress(taxAuthorityAddress)}</span>
                        </div>
                    </GlassCard>
                ) : (
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                            <GlassCard className="border-white/5 bg-[#0a0a0a] p-6 rounded-3xl">
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider">Authority Wallet</span>
                                    <Landmark className="w-5 h-5 text-cyan-400" />
                                </div>
                                <div className="font-mono text-2xl font-bold text-white tracking-tight break-all">
                                    {publicKey}
                                </div>
                                <p className="text-sm text-[#71717a] mt-3">
                                    This is the wallet currently assigned to receive withheld payroll amounts.
                                </p>
                            </GlassCard>

                            <GlassCard className="border-white/5 bg-[#0a0a0a] p-6 rounded-3xl">
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider">Network Status</span>
                                    <RefreshCw className={`w-5 h-5 text-white ${!currentHeight ? 'animate-spin' : ''}`} />
                                </div>
                                <div className="font-mono text-4xl font-black text-white tracking-tight">
                                    #{currentHeight > 0 ? currentHeight : '---'}
                                </div>
                                <p className="text-sm text-[#71717a] mt-3">
                                    Current payroll withholding rate: {(activeTaxBps / 100).toFixed(2)}% on employee withdrawals.
                                </p>
                            </GlassCard>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                            <GlassCard className="border-white/5 bg-[#0a0a0a] p-6 rounded-3xl">
                                <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider mb-3">On-Chain Tax Collected</p>
                                <p className="text-4xl font-black text-white">{formatCredits(taxCollectedMicro)}</p>
                                <p className="text-sm text-cyan-400 mt-2 uppercase tracking-wider font-semibold">Credits</p>
                            </GlassCard>

                            <GlassCard className="border-white/5 bg-[#0a0a0a] p-6 rounded-3xl">
                                <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider mb-3">Wallet Receipts Total</p>
                                <p className="text-4xl font-black text-white">{formatCredits(totalWithheldFromWallet)}</p>
                                <p className="text-sm text-[#71717a] mt-2">Only receipts available to this wallet are included here</p>
                            </GlassCard>

                            <GlassCard className="border-white/5 bg-[#0a0a0a] p-6 rounded-3xl">
                                <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider mb-3">Employees Covered</p>
                                <p className="text-4xl font-black text-white">{uniqueEmployees}</p>
                                <p className="text-sm text-[#71717a] mt-2">Unique employees included in the scanned receipt list</p>
                            </GlassCard>

                            <GlassCard className="border-white/5 bg-[#0a0a0a] p-6 rounded-3xl">
                                <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider mb-3">Latest Receipt</p>
                                <p className="text-2xl font-black text-white leading-tight">
                                    {latestReceipt?.timestamp ? new Date(latestReceipt.timestamp * 1000).toLocaleString() : 'No receipt yet'}
                                </p>
                                <p className="text-sm text-[#71717a] mt-2">Most recent withholding receipt found in this wallet</p>
                            </GlassCard>
                        </div>

                        <GlassCard hover={false} className="border-white/5 bg-[#0a0a0a] rounded-3xl p-8">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                                            <Receipt className="w-5 h-5 text-white" />
                                        </div>
                                        Withholding Receipt Ledger
                                    </h2>
                                    <p className="text-sm text-[#a1a1aa] mt-2 max-w-2xl">
                                        Scan this wallet for payroll withholding receipts and export each one as a receipt file when needed.
                                    </p>
                                </div>
                                <button
                                    onClick={scanRecords}
                                    disabled={loadingRecords}
                                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loadingRecords ? 'animate-spin' : ''}`} />
                                    {loadingRecords ? 'Scanning...' : 'Scan Tax Receipts'}
                                </button>
                            </div>

                            <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm text-[#a1a1aa]">
                                This view only shows receipts available to the connected tax authority wallet. Admin dashboards can see payroll policy and totals, but not these authority-owned receipt details.
                            </div>
                        </GlassCard>

                        {error && (
                            <div className="p-4 bg-red-900/20 border border-red-500/30 text-red-400 rounded-2xl backdrop-blur-sm text-sm">
                                {error}
                            </div>
                        )}

                        <GlassCard hover={false} className="border-white/5 bg-[#0a0a0a] p-0 rounded-3xl overflow-hidden relative">
                            {records.length > 0 ? (
                                <div className="overflow-x-auto relative z-10">
                                    <table className="w-full text-left">
                                        <thead className="bg-[#050505] text-[#a1a1aa] text-[10px] font-bold uppercase tracking-widest border-b border-white/5">
                                            <tr>
                                                <th className="px-6 py-6 font-semibold">Employee</th>
                                                <th className="px-6 py-6 font-semibold">Gross</th>
                                                <th className="px-6 py-6 font-semibold">Withheld</th>
                                                <th className="px-6 py-6 font-semibold">Net</th>
                                                <th className="px-6 py-6 font-semibold">Payroll</th>
                                                <th className="px-6 py-6 font-semibold">Payment</th>
                                                <th className="px-6 py-6 font-semibold text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-sm bg-black/30">
                                            {records.map((entry) => (
                                                <tr key={entry.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="px-6 py-5 font-mono text-[#a1a1aa] group-hover:text-white transition-colors">
                                                        {shortenAddress(entry.employee)}
                                                    </td>
                                                    <td className="px-6 py-5 font-bold text-white">
                                                        {formatCredits(entry.grossMicro)}
                                                    </td>
                                                    <td className="px-6 py-5 text-cyan-300 font-semibold">
                                                        {formatCredits(entry.taxMicro)}
                                                    </td>
                                                    <td className="px-6 py-5 text-zinc-300">
                                                        {formatCredits(entry.netMicro)}
                                                    </td>
                                                    <td className="px-6 py-5 font-mono text-zinc-400">
                                                        {entry.payrollId.replace('field', '')}
                                                    </td>
                                                    <td className="px-6 py-5 text-zinc-400">
                                                        <div className="flex flex-col">
                                                            <span className="font-mono">{entry.paymentId.length > 15 ? `${entry.paymentId.slice(0, 10)}...${entry.paymentId.slice(-4)}` : entry.paymentId}</span>
                                                            <span className="text-[10px] text-gray-500 tracking-wide mt-0.5">
                                                                {entry.timestamp ? new Date(entry.timestamp * 1000).toLocaleString() : 'Time unavailable'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <button
                                                            onClick={() => handleDownloadReceipt(entry)}
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
                                    <Users className="w-8 h-8 text-white/20 mx-auto mb-4" />
                                    No withholding receipts found yet. Process a taxed payroll claim and scan again with the authority wallet.
                                </div>
                            )}
                        </GlassCard>
                    </div>
                )}
            </div>
        </main>
    )
}
