'use client'

import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useState, useEffect } from 'react'
import { requestTransaction, PROGRAM_ID, fetchBlockHeight, fetchMappingValue, batchProcessTransactions, BatchTransactionItem } from '@/lib/zk-utils'
import { motion } from "framer-motion"
import {
    LayoutDashboard,
    Wallet,
    ShieldCheck,
    Layers,
    FileCheck,
    ArrowLeft,
    Signal,
    DollarSign,
    Hash,
    Zap,
    BarChart3,
    ArrowUpCircle,
    Copy,
    Check
} from "lucide-react"
import Link from 'next/link'
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import GlassCard from "@/components/GlassCard"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WalletConnectButton } from "@/components/WalletConnectButton"

export default function AdminPage() {
    const { wallet, address, requestRecords } = useWallet()
    const publicKey = address; // Alias for compatibility with existing code

    const [budget, setBudget] = useState<string>('Loading...')
    const [periodHash, setPeriodHash] = useState('')
    const [merkleRoot, setMerkleRoot] = useState('')
    const [isTransacting, setIsTransacting] = useState(false)
    const [currentHeight, setCurrentHeight] = useState<number>(0)

    // Tab State
    const [activeTab, setActiveTab] = useState<'dashboard' | 'deposit' | 'authorize' | 'batch' | 'compliance'>('dashboard')

    // Helper to clean Aleo values
    const cleanValue = (val: string) => val.replace(/u64|u32|field|\.private/g, '')

    // Form States
    const [fundAmount, setFundAmount] = useState('')
    const [issueRecipient, setIssueRecipient] = useState('')
    const [issueAmount, setIssueAmount] = useState('')
    const [issueStart, setIssueStart] = useState('')
    const [issueInterval, setIssueInterval] = useState('100')

    // Initialization State
    const [isInitialized, setIsInitialized] = useState<boolean | null>(null) // null = check pending
    const [initBudget, setInitBudget] = useState('1000000')
    const [initThreshold, setInitThreshold] = useState('2')
    const [admin2, setAdmin2] = useState('')
    const [admin3, setAdmin3] = useState('')
    const [auditorAddr, setAuditorAddr] = useState('')

    // Bulk Issue States
    const [baseSalary, setBaseSalary] = useState('1000')
    const [bulkInterval, setBulkInterval] = useState('15')
    const [bulkRecipients, setBulkRecipients] = useState('')
    const [batchStatus, setBatchStatus] = useState('')

    // Templates State
    const [templates, setTemplates] = useState<Record<string, { baseSalary: string, interval: string, recipients: string }>>({})
    const [selectedTemplate, setSelectedTemplate] = useState('')
    const [newTemplateName, setNewTemplateName] = useState('')

    // Load templates on mount
    useEffect(() => {
        const saved = localStorage.getItem('payroll_templates')
        if (saved) {
            try {
                setTemplates(JSON.parse(saved))
            } catch (e) {
                console.error("Failed to parse templates", e)
            }
        }
    }, [])

    const handleSaveTemplate = () => {
        if (!newTemplateName) return toast.error("Please enter a template name")
        const newTemplates = {
            ...templates,
            [newTemplateName]: {
                baseSalary,
                interval: bulkInterval,
                recipients: bulkRecipients
            }
        }
        setTemplates(newTemplates)
        localStorage.setItem('payroll_templates', JSON.stringify(newTemplates))
        setNewTemplateName('')
        toast.success(`Template "${newTemplateName}" saved!`)
    }

    const handleLoadTemplate = (name: string) => {
        const t = templates[name]
        if (t) {
            setBaseSalary(t.baseSalary)
            setBulkInterval(t.interval)
            setBulkRecipients(t.recipients)
            setSelectedTemplate(name)
        }
    }

    const handleDeleteTemplate = (name: string) => {
        const newTemplates = { ...templates }
        delete newTemplates[name]
        setTemplates(newTemplates)
        localStorage.setItem('payroll_templates', JSON.stringify(newTemplates))
        if (selectedTemplate === name) setSelectedTemplate('')
    }

    // Fetch public state from chain
    const fetchState = async () => {
        // Silent refresh, don't show loading text unless budget is completely unset
        if (!budget) setBudget('Loading...')
        try {
            // Check if initialized by fetching budget mapping
            const budgetVal = await fetchMappingValue('payroll_budgets', '1field')
            if (budgetVal) {
                setBudget(budgetVal)
                setIsInitialized(true)
            } else {
                setBudget('0u64')
                // Double check with another mapping to confirm uninitialized vs just 0 balance
                const thresholdVal = await fetchMappingValue('multisig_threshold', '1field')
                if (thresholdVal) {
                    setIsInitialized(true)
                } else {
                    setIsInitialized(false)
                }
            }
        } catch (e) {
            console.error("Error fetching state:", e)
            setIsInitialized(false)
        }
    }

    const handleInitializePayroll = async () => {
        if (!publicKey || !admin2 || !admin3 || !auditorAddr) {
            toast.error("Please fill all fields (Admins & Auditor)")
            return
        }
        setIsTransacting(true)
        try {
            const txId = await requestTransaction(
                wallet?.adapter!,
                publicKey,
                PROGRAM_ID,
                'initialize_payroll',
                [
                    initBudget + 'u64', // budget_ceiling
                    '1field',           // payroll_id
                    initThreshold + 'u64', // threshold
                    publicKey,          // admin1 (self)
                    admin2,             // admin2
                    admin3,             // admin3
                    auditorAddr         // auditor
                ],
                300_000
            )
            toast.success("Initialization Started! TX ID: " + txId)
        } catch (err: any) {
            console.error(err)
            toast.error("Error: " + err.message)
        } finally {
            setIsTransacting(false)
        }
    }

    // Initial Fetch on mount (Manual refresh mode)
    useEffect(() => {
        fetchState()
    }, [])

    // Update block height
    useEffect(() => {
        const updateHeight = async () => {
            const h = await fetchBlockHeight()
            if (h > 0) {
                setCurrentHeight(h)
                if (!issueStart) setIssueStart((h + 10).toString()) // Suggest start in 10 blocks
            }
        }
        updateHeight()
        const interval = setInterval(updateHeight, 10000)
        return () => clearInterval(interval)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleFundPayroll = async () => {
        if (!publicKey || !fundAmount) return
        setIsTransacting(true)
        try {
            const txId = await requestTransaction(
                wallet?.adapter!,
                publicKey,
                PROGRAM_ID,
                'fund_payroll',
                [fundAmount + 'u64', '1field'], // public amount, public payroll_id
                300_000
            )
            toast.success("Funding Transaction sent! ID: " + txId)
            fetchState() // Update state immediately after
        } catch (err: any) {
            console.error(err)
            toast.error("Error: " + err.message)
        } finally {
            setIsTransacting(false)
        }
    }

    const handleIssueCertificate = async () => {
        if (!publicKey || !issueRecipient || !issueAmount) return
        setIsTransacting(true)
        try {
            // transition issue_limit(payroll_id, recipient, amount, start_height, interval)
            const inputs = [
                '1field',                   // payroll_id (public)
                issueRecipient,             // recipient (private)
                issueAmount + 'u64',        // amount (public)
                issueStart + 'u32',         // start_height (public)
                issueInterval + 'u32'       // interval (public)
            ]

            const txId = await requestTransaction(
                wallet?.adapter!,
                publicKey,
                PROGRAM_ID,
                'issue_limit',
                inputs,
                300_000
            )
            toast.success("Certificate Issued! Transaction ID: " + txId)
        } catch (err: any) {
            console.error(err)
            toast.error("Error: " + err.message)
        } finally {
            setIsTransacting(false)
        }
    }

    const handleBulkIssue = async () => {
        if (!publicKey || !bulkRecipients) return
        setIsTransacting(true)
        setBatchStatus('Preparing batch...')

        try {
            const regex = /(aleo1[a-z0-9]{58})\s*,\s*([a-zA-Z]+)/gi
            const items: BatchTransactionItem[] = []

            let match;
            let i = 0;
            while ((match = regex.exec(bulkRecipients)) !== null) {
                const addr = match[1]
                const roleStr = match[2]

                const roles: Record<string, number> = {
                    'junior': 1.0,
                    'senior': 1.5,
                    'executive': 2.0
                }

                const role = roleStr?.toLowerCase() || 'junior'
                const multiplier = roles[role] || 1.0
                const base = parseInt(baseSalary) || 0
                const amount = Math.floor(base * multiplier)

                // transition issue_limit(payroll_id, recipient, amount, start_height, interval)
                // We'll use current height + 10 for start
                const startH = currentHeight > 0 ? currentHeight + 10 : 0

                items.push({
                    id: `batch-${i}`,
                    description: `Issuing to ${addr.slice(0, 6)}... (${role})`,
                    functionName: 'issue_limit',
                    inputs: [
                        '1field',              // payroll_id
                        addr,                  // recipient
                        amount + 'u64',        // amount
                        startH + 'u32',        // start_height
                        bulkInterval + 'u32'   // interval
                    ],
                    fee: 300_000 // 0.3 credits per tx
                })
                i++;
            }

            if (items.length === 0) {
                if (bulkRecipients.trim().length > 0) {
                    console.warn("Text found but no regex matches. Check format.")
                    toast.error("No valid 'address, role' pairs found. Please check format.")
                    setBatchStatus("Error: Invalid format")
                    setIsTransacting(false)
                    return
                }
            }

            const result = await batchProcessTransactions(
                wallet?.adapter!,
                publicKey,
                PROGRAM_ID,
                items,
                (idx, total, status) => {
                    setBatchStatus(`[${idx}/${total}] ${status}`)
                }
            )

            let msg = `Batch Complete.\nSuccess: ${result.success.length}\nFailed: ${result.failed.length}`
            if (result.failed.length > 0) {
                msg += `\nFirst Error: ${result.failed[0].error}`
            }
            toast.info(msg)
            setBatchStatus(msg)

        } catch (err: any) {
            console.error(err)
            setBatchStatus("Error: " + err.message)
            toast.error("Batch Error: " + err.message)
        } finally {
            setIsTransacting(false)
        }
    }

    const handlePrivacyBatch = async () => {
        if (!publicKey || !bulkRecipients) return
        setIsTransacting(true)
        setBatchStatus('Preparing privacy batch...')

        try {
            const regex = /(aleo1[a-z0-9]{58})\s*,\s*([a-zA-Z]+)/gi
            const allRecipients: { addr: string, amount: string, role: string }[] = []

            let match;
            while ((match = regex.exec(bulkRecipients)) !== null) {
                const addr = match[1]
                const roleStr = match[2]

                const roles: Record<string, number> = { 'junior': 1.0, 'senior': 1.5, 'executive': 2.0 }
                const role = roleStr?.toLowerCase() || 'junior'
                const multiplier = roles[role] || 1.0
                const base = parseInt(baseSalary) || 0
                const amount = Math.floor(base * multiplier)

                allRecipients.push({ addr, amount: amount + 'u64', role })
            }

            if (allRecipients.length === 0) {
                toast.error("No valid recipients found.")
                setIsTransacting(false)
                return
            }

            const items: BatchTransactionItem[] = []
            // Chunk into 3s
            for (let i = 0; i < allRecipients.length; i += 3) {
                const chunk = allRecipients.slice(i, i + 3)

                const startH = currentHeight > 0 ? currentHeight + 10 : 0

                if (chunk.length === 3) {
                    // Use Privacy Batch
                    items.push({
                        id: `privacy-batch-${i / 3}`,
                        description: `Privacy Batch (3) - ${chunk.map(r => r.role).join(', ')}`,
                        functionName: 'issue_limit_batch_3',
                        inputs: [
                            '1field',              // payroll_id
                            chunk[0].addr, chunk[0].amount, startH + 'u32', bulkInterval + 'u32',
                            chunk[1].addr, chunk[1].amount, startH + 'u32', bulkInterval + 'u32',
                            chunk[2].addr, chunk[2].amount, startH + 'u32', bulkInterval + 'u32'
                        ],
                        fee: 500_000 // Higher fee for complex batch (0.5 credits)
                    })
                } else {
                    // Fallback for remainders (< 3)
                    chunk.forEach((r, idx) => {
                        items.push({
                            id: `remainder-${i + idx}`,
                            description: `Issuing to ${r.addr.slice(0, 6)}... (${r.role})`,
                            functionName: 'issue_limit',
                            inputs: [
                                '1field', r.addr, r.amount, startH + 'u32', bulkInterval + 'u32'
                            ],
                            fee: 300_000
                        })
                    })
                }
            }

            const result = await batchProcessTransactions(
                wallet?.adapter!,
                publicKey,
                PROGRAM_ID,
                items,
                (idx, total, status) => setBatchStatus(`[${idx}/${total}] ${status}`)
            )

            let msg = `Batch Complete.\nSuccess: ${result.success.length}\nFailed: ${result.failed.length}`
            if (result.failed.length > 0) {
                msg += `\nFirst Error: ${result.failed[0].error}`
            }
            toast.info(msg)
            setBatchStatus(msg)

        } catch (err: any) {
            console.error(err)
            toast.error("Error: " + err.message)
            setBatchStatus("Error: " + err.message)
        } finally {
            setIsTransacting(false)
        }
    }

    const handleGenerateReport = async () => {
        if (!publicKey || !requestRecords) return
        setIsTransacting(true)
        try {
            // 1. Fetch Admin's SpentRecord (Total Spent Tracker)
            const records = await requestRecords(PROGRAM_ID, true)
            const spentRecord = (records as any[]).filter((rec: any) =>
                !rec.spent &&
                rec.recordName === 'SpentRecord' // Best check if available
            ).pop() // Get the latest one

            if (!spentRecord) {
                toast.error("No active SpentRecord found for this admin.")
                return
            }

            // 2. Prepare Inputs
            // transition generate_audit_report(spent_record, timestamp, pay_period_hash, merkle_root)
            const timestamp = Math.floor(Date.now() / 1000).toString() + 'u32'
            const inputs = [
                spentRecord.plaintext.replace(/\n/g, '').replace(/ /g, ''),
                timestamp,
                periodHash || '0field', // Default if empty
                merkleRoot || '0field'
            ]

            // 3. Request Transaction
            const txId = await requestTransaction(
                wallet?.adapter!,
                publicKey, // Use publicKey from useWallet hook scope
                PROGRAM_ID,
                'generate_audit_report',
                inputs,
                300_000 // 0.3 credit fee
            )

            toast.success("Transaction sent! ID: " + txId)
        } catch (err: any) {
            console.error(err)
            toast.error("Error: " + err.message)
        } finally {
            setIsTransacting(false)
        }
    }

    const navItems = [
        { id: 'dashboard', title: "Dashboard", icon: LayoutDashboard },
        { id: 'deposit', title: "Deposit Fund", icon: Wallet },
        { id: 'authorize', title: "Authorize Payroll", icon: ShieldCheck },
        { id: 'batch', title: "Batch Run", icon: Layers },
        { id: 'compliance', title: "Compliance & Audit", icon: FileCheck },
    ]

    return (
        <div className="flex min-h-screen relative z-10 font-sans">
            {/* Background */}
            <div className="fixed inset-0 z-0 bg-background" />

            {/* Sidebar */}
            <aside className="w-64 border-r border-white/10 bg-black/40 backdrop-blur-xl flex flex-col fixed inset-y-0 left-0 z-50">
                <div className="p-6 border-b border-white/10">
                    <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm">Back to Home</span>
                    </Link>
                    <h2 className="text-xl font-bold mt-4 text-foreground">Admin Portal</h2>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id;
                        const Icon = item.icon;

                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id as any)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-300 group relative",
                                    isActive
                                        ? "bg-white/10 text-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-foreground rounded-full" />
                                )}
                                <Icon className="w-4 h-4" />
                                <span>{item.title}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Network status */}
                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Signal className="w-3 h-3" />
                        <span>Aleo Testnet</span>
                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-xs font-mono">{currentHeight > 0 ? `#${currentHeight}` : '...'}</span>
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 flex flex-col ml-64 relative z-10">
                {/* Top bar */}
                <header className="h-16 border-b border-white/10 bg-black/20 backdrop-blur-sm flex items-center justify-end px-6 sticky top-0 z-40">
                    <WalletConnectButton />
                </header>

                <div className="flex-1 p-8 overflow-auto">
                    {!publicKey ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center h-[60vh] text-center max-w-md mx-auto"
                        >
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                <Wallet className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-foreground">Connect Your Wallet</h2>
                            <p className="text-muted-foreground mb-8">
                                Please connect your Aleo wallet to access the Admin Portal and manage payroll.
                            </p>
                            <WalletConnectButton />
                        </motion.div>
                    ) : isInitialized === false ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-2xl mx-auto"
                        >
                            <GlassCard className="border-yellow-500/20 shadow-[0_0_50px_-20px_rgba(234,179,8,0.2)]">
                                <div className="flex items-start gap-4 mb-8">
                                    <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-500">
                                        <Zap className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-foreground">System Not Initialized</h3>
                                        <p className="text-muted-foreground text-sm mt-1">
                                            This payroll instance (ID 1) has not been set up on-chain yet.
                                            You must initialize it to create the <span className="text-foreground font-semibold">SpentRecord</span> required for compliance proofs.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Budget Ceiling</Label>
                                            <Input
                                                type="number"
                                                value={initBudget}
                                                onChange={e => setInitBudget(e.target.value)}
                                                className="bg-white/5 border-white/10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Multi-Sig Threshold</Label>
                                            <Input
                                                type="number"
                                                value={initThreshold}
                                                onChange={e => setInitThreshold(e.target.value)}
                                                className="bg-white/5 border-white/10"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Admin 2 Address</Label>
                                        <Input
                                            placeholder="aleo1..."
                                            value={admin2}
                                            onChange={e => setAdmin2(e.target.value)}
                                            className="bg-white/5 border-white/10 font-mono"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Admin 3 Address</Label>
                                        <Input
                                            placeholder="aleo1..."
                                            value={admin3}
                                            onChange={e => setAdmin3(e.target.value)}
                                            className="bg-white/5 border-white/10 font-mono"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Auditor Address</Label>
                                        <Input
                                            placeholder="aleo1..."
                                            value={auditorAddr}
                                            onChange={e => setAuditorAddr(e.target.value)}
                                            className="bg-white/5 border-white/10 font-mono"
                                        />
                                    </div>

                                    <button
                                        onClick={handleInitializePayroll}
                                        disabled={isTransacting}
                                        className="glow-btn w-full mt-4"
                                    >
                                        {isTransacting ? 'Initializing...' : 'Initialize System'}
                                    </button>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ) : (
                        <div className="space-y-8">
                            <div>
                                <h1 className="text-3xl font-bold text-foreground mb-2 capitalize">
                                    {activeTab === 'batch' ? 'Batch Run' : activeTab}
                                </h1>
                                <p className="text-muted-foreground text-sm">
                                    {activeTab === 'dashboard' && 'Overview of your ZK Payroll system'}
                                    {activeTab === 'deposit' && 'Add funds to the payroll liquidity pool'}
                                    {activeTab === 'authorize' && 'Authorize individual payroll payments'}
                                    {activeTab === 'batch' && 'Run payroll for multiple employees at once'}
                                    {activeTab === 'compliance' && 'Generate and verify compliance proofs'}
                                </p>
                            </div>

                            {/* Dashboard Stats View */}
                            {activeTab === 'dashboard' && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                            <GlassCard className="relative group overflow-hidden">
                                                <div className="flex items-start justify-between relative z-10">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground mb-1">Liquidity Pool</p>
                                                        <div className="flex items-baseline gap-2">
                                                            <p className="text-2xl font-bold text-foreground font-mono">{cleanValue(budget)}</p>
                                                            <span className="text-xs text-muted-foreground">credits</span>
                                                        </div>
                                                    </div>
                                                    <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                                                        <DollarSign className="w-5 h-5 text-foreground" />
                                                    </div>
                                                </div>
                                                <button onClick={fetchState} className="absolute inset-0 w-full h-full cursor-pointer z-20" title="Refresh" />
                                            </GlassCard>
                                        </motion.div>

                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                            <GlassCard>
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground mb-1">Active Payroll ID</p>
                                                        <p className="text-2xl font-bold text-foreground font-mono">#1</p>
                                                    </div>
                                                    <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                                                        <Hash className="w-5 h-5 text-foreground" />
                                                    </div>
                                                </div>
                                            </GlassCard>
                                        </motion.div>

                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                                            <GlassCard className="cursor-pointer hover:border-white/20" onClick={() => setActiveTab('authorize')}>
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground mb-1">Quick Action</p>
                                                        <p className="text-xl font-bold text-foreground">Issue Salary</p>
                                                    </div>
                                                    <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                                                        <Zap className="w-5 h-5 text-foreground" />
                                                    </div>
                                                </div>
                                            </GlassCard>
                                        </motion.div>
                                    </div>

                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                                        <GlassCard hover={false} className="min-h-[300px]">
                                            <div className="flex items-center gap-2 mb-6">
                                                <BarChart3 className="w-5 h-5 text-foreground" />
                                                <h2 className="text-lg font-semibold text-foreground">System Overview</h2>
                                            </div>
                                            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                                                <div className="text-center">
                                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-white/10 flex items-center justify-center">
                                                        <BarChart3 className="w-8 h-8 text-muted-foreground/50" />
                                                    </div>
                                                    Spending analytics pending...
                                                </div>
                                            </div>
                                        </GlassCard>
                                    </motion.div>

                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => setIsInitialized(false)}
                                            className="text-xs text-muted-foreground hover:text-yellow-500 underline"
                                        >
                                            Force Re-Initialize System (Debug)
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Deposit Tab */}
                            {activeTab === 'deposit' && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                    <GlassCard hover={false} className="max-w-xl">
                                        <div className="flex items-center gap-3 mb-8 p-4 bg-white/5 rounded-lg border border-white/5">
                                            <Wallet className="w-5 h-5 text-foreground" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Current Balance</p>
                                                <p className="text-lg font-bold text-foreground font-mono">{cleanValue(budget)} ALEO</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <Label>Deposit Amount</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="Enter amount in ALEO"
                                                    value={fundAmount}
                                                    onChange={(e) => setFundAmount(e.target.value)}
                                                    className="bg-white/5 border-white/10"
                                                />
                                            </div>
                                            <button
                                                onClick={handleFundPayroll}
                                                disabled={isTransacting}
                                                className="glow-btn w-full flex items-center justify-center gap-2 mt-4"
                                            >
                                                {isTransacting ? (
                                                    'Processing...'
                                                ) : (
                                                    <>
                                                        <ArrowUpCircle className="w-4 h-4" />
                                                        Deposit Funds
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            )}

                            {/* Authorize Payroll Tab */}
                            {activeTab === 'authorize' && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                    <GlassCard hover={false} className="max-w-xl">
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <Label>Employee Address</Label>
                                                <Input
                                                    placeholder="aleo1..."
                                                    value={issueRecipient}
                                                    onChange={(e) => setIssueRecipient(e.target.value)}
                                                    className="bg-white/5 border-white/10 font-mono"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Salary Amount</Label>
                                                    <Input
                                                        type="number"
                                                        placeholder="Credits"
                                                        value={issueAmount}
                                                        onChange={(e) => setIssueAmount(e.target.value)}
                                                        className="bg-white/5 border-white/10"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Interval (Blocks)</Label>
                                                    <Input
                                                        type="number"
                                                        value={issueInterval}
                                                        onChange={(e) => setIssueInterval(e.target.value)}
                                                        className="bg-white/5 border-white/10"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Start Block Height (Current: {currentHeight})</Label>
                                                <Input
                                                    type="number"
                                                    value={issueStart}
                                                    onChange={(e) => setIssueStart(e.target.value)}
                                                    className="bg-white/5 border-white/10"
                                                />
                                            </div>

                                            <button
                                                onClick={handleIssueCertificate}
                                                disabled={isTransacting}
                                                className="glow-btn w-full flex items-center justify-center gap-2 mt-4"
                                            >
                                                {isTransacting ? 'Processing...' : (
                                                    <>
                                                        <ShieldCheck className="w-4 h-4" />
                                                        Authorize Payroll
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            )}

                            {/* Batch Payroll Tab */}
                            {activeTab === 'batch' && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                    <GlassCard hover={false} className="max-w-2xl">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="font-semibold text-foreground">Batch Configuration</h3>
                                            {/* Template Loader */}
                                            {Object.keys(templates).length > 0 && (
                                                <select
                                                    className="bg-black/50 border border-white/10 text-xs rounded p-2 text-gray-300 outline-none focus:border-white transition-colors"
                                                    onChange={(e) => handleLoadTemplate(e.target.value)}
                                                    value={selectedTemplate}
                                                >
                                                    <option value="">Load Template...</option>
                                                    {Object.keys(templates).map(name => (
                                                        <option key={name} value={name}>{name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="space-y-2">
                                                <Label>Base Salary</Label>
                                                <Input
                                                    type="number"
                                                    value={baseSalary}
                                                    onChange={(e) => setBaseSalary(e.target.value)}
                                                    className="bg-white/5 border-white/10"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Interval</Label>
                                                <Input
                                                    type="number"
                                                    value={bulkInterval}
                                                    onChange={(e) => setBulkInterval(e.target.value)}
                                                    className="bg-white/5 border-white/10"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-6">
                                            <Label>Recipients (Address, Role)</Label>
                                            <textarea
                                                placeholder="aleo1...address, Junior&#10;aleo1...address, Senior"
                                                className="bg-white/5 border border-white/10 rounded-lg w-full h-32 font-mono text-sm p-3 outline-none focus:border-white/50 transition-colors text-foreground placeholder:text-muted-foreground/50"
                                                value={bulkRecipients}
                                                onChange={(e) => setBulkRecipients(e.target.value)}
                                            />
                                        </div>

                                        {batchStatus && (
                                            <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg text-sm font-mono text-gray-300">
                                                {batchStatus}
                                            </div>
                                        )}

                                        <div className="flex gap-4 mb-8">
                                            <button
                                                onClick={handleBulkIssue}
                                                disabled={isTransacting}
                                                className="flex-1 py-3 border border-white/20 rounded-lg text-foreground hover:bg-white/5 transition disabled:opacity-50 font-medium"
                                            >
                                                Legacy Batch
                                            </button>
                                            <button
                                                onClick={handlePrivacyBatch}
                                                disabled={isTransacting}
                                                className="glow-btn flex-1 flex items-center justify-center gap-2"
                                            >
                                                <Zap className="w-4 h-4" />
                                                Private Batch Run
                                            </button>
                                        </div>

                                        <div className="flex gap-3 items-center pt-6 border-t border-white/10">
                                            <Input
                                                type="text"
                                                placeholder="Template Name"
                                                value={newTemplateName}
                                                onChange={(e) => setNewTemplateName(e.target.value)}
                                                className="bg-white/5 border-white/10"
                                            />
                                            <button
                                                onClick={handleSaveTemplate}
                                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            )}

                            {/* Compliance Tab */}
                            {activeTab === 'compliance' && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                    <GlassCard hover={false} className="max-w-xl">
                                        <p className="text-sm text-gray-400 mb-6">
                                            Generate ZK proofs of solvency for auditors without revealing individual salary data.
                                        </p>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Pay Period Hash (Optional)</Label>
                                                <Input
                                                    value={periodHash}
                                                    onChange={e => setPeriodHash(e.target.value)}
                                                    placeholder="e.g. 1234field"
                                                    className="bg-white/5 border-white/10 font-mono"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Merkle Root (Optional)</Label>
                                                <Input
                                                    value={merkleRoot}
                                                    onChange={e => setMerkleRoot(e.target.value)}
                                                    placeholder="e.g. 5678field"
                                                    className="bg-white/5 border-white/10 font-mono"
                                                />
                                            </div>

                                            <button
                                                onClick={handleGenerateReport}
                                                disabled={isTransacting}
                                                className="glow-btn w-full flex items-center justify-center gap-2 mt-4"
                                            >
                                                {isTransacting ? 'Generating...' : (
                                                    <>
                                                        <FileCheck className="w-4 h-4" />
                                                        Generate Compliance Report
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
