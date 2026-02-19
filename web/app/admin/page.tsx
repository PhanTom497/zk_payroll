'use client'

import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useState, useEffect } from 'react'
import { requestTransaction, PROGRAM_ID, fetchBlockHeight, fetchMappingValue, batchProcessTransactions, BatchTransactionItem } from '@/lib/zk-utils'

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
        if (!newTemplateName) return alert("Please enter a template name")
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
        alert(`Template "${newTemplateName}" saved!`)
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
            alert("Please fill all fields (Admins & Auditor)")
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
            alert("Initialization Started! TX ID: " + txId)
        } catch (err: any) {
            console.error(err)
            alert("Error: " + err.message)
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
            alert("Funding Transaction sent! ID: " + txId)
            fetchState() // Update state immediately after
        } catch (err: any) {
            console.error(err)
            alert("Error: " + err.message)
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
            alert("Certificate Issued! Transaction ID: " + txId)
        } catch (err: any) {
            console.error(err)
            alert("Error: " + err.message)
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
                    alert("No valid 'address, role' pairs found. Please check format.")
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
            alert(msg)
            setBatchStatus(msg)

        } catch (err: any) {
            console.error(err)
            setBatchStatus("Error: " + err.message)
            alert("Batch Error: " + err.message)
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
                alert("No valid recipients found.")
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
            alert(msg)
            setBatchStatus(msg)

        } catch (err: any) {
            console.error(err)
            alert("Error: " + err.message)
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
                alert("No active SpentRecord found for this admin.")
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

            alert("Transaction sent! ID: " + txId)
        } catch (err: any) {
            console.error(err)
            alert("Error: " + err.message)
        } finally {
            setIsTransacting(false)
        }
    }

    return (
        <main className="flex min-h-screen bg-black text-gray-100 font-sans">
            {/* Background Decor */}
            <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black -z-10" />
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-white opacity-[0.02] blur-[150px] rounded-full pointer-events-none -z-10" />

            {/* Sidebar Navigation */}
            <aside className="w-64 border-r border-white/10 flex flex-col h-screen fixed top-0 left-0 bg-black/40 backdrop-blur-xl">
                <div className="p-6 border-b border-white/5">
                    <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                        <div className="w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                        ZK Admin
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
                        { id: 'deposit', label: 'Deposit Fund', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                        { id: 'authorize', label: 'Authorize Payroll', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                        { id: 'batch', label: 'Batch Run', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
                        { id: 'compliance', label: 'Compliance & Audit', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === item.id
                                ? 'bg-white text-black shadow-lg shadow-white/10'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                            </svg>
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-6 border-t border-white/5">
                    <p className="text-xs text-gray-500 uppercase mb-2">Network Status</p>
                    <div className="flex justify-between items-center bg-white/5 rounded px-3 py-2">
                        <span className="text-xs text-gray-400">Height</span>
                        <span className="text-sm font-mono font-bold text-white">{currentHeight || '...'}</span>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="ml-64 flex-1 p-12 overflow-y-auto h-screen">
                <div className="max-w-5xl mx-auto">

                    {/* Header */}
                    <div className="flex justify-between items-center mb-12">
                        <h2 className="text-3xl font-bold tracking-tight text-white capitalize">
                            {activeTab.replace(/([A-Z])/g, ' $1').trim()}
                        </h2>
                        {publicKey ? (
                            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                                <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-pulse"></div>
                                <span className="text-sm font-mono text-gray-300">{publicKey.slice(0, 6)}...{publicKey.slice(-4)}</span>
                            </div>
                        ) : (
                            <div className="text-yellow-500 text-sm font-bold bg-yellow-500/10 px-4 py-2 rounded-full border border-yellow-500/20">Wallet Disconnected</div>
                        )}
                    </div>

                    {/* Content Views */}
                    {!publicKey ? (
                        <div className="glass-card flex flex-col items-center justify-center p-20 text-center">
                            <p className="text-gray-400 text-lg mb-4">Please connect your wallet to access the Admin Portal.</p>
                        </div>
                    ) : isInitialized === false ? (
                        <div className="glass-card max-w-2xl mx-auto border-yellow-500/30">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">System Not Initialized</h3>
                                    <p className="text-gray-400 text-sm mt-1">
                                        This payroll instance (ID 1) has not been set up on-chain yet.
                                        You must initialize it to create the <b>SpentRecord</b> required for compliance proofs.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500 ml-1 mb-1 block">Budget Ceiling</label>
                                        <input type="number" value={initBudget} onChange={e => setInitBudget(e.target.value)} className="glass-input w-full" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 ml-1 mb-1 block">Multi-Sig Threshold</label>
                                        <input type="number" value={initThreshold} onChange={e => setInitThreshold(e.target.value)} className="glass-input w-full" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 ml-1 mb-1 block">Admin 2 Address</label>
                                    <input type="text" placeholder="aleo1..." value={admin2} onChange={e => setAdmin2(e.target.value)} className="glass-input w-full font-mono text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 ml-1 mb-1 block">Admin 3 Address</label>
                                    <input type="text" placeholder="aleo1..." value={admin3} onChange={e => setAdmin3(e.target.value)} className="glass-input w-full font-mono text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 ml-1 mb-1 block">Auditor Address (For Reports)</label>
                                    <input type="text" placeholder="aleo1..." value={auditorAddr} onChange={e => setAuditorAddr(e.target.value)} className="glass-input w-full font-mono text-sm" />
                                </div>

                                <button
                                    onClick={handleInitializePayroll}
                                    disabled={isTransacting}
                                    className="w-full py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] mt-4"
                                >
                                    {isTransacting ? 'Initializing...' : 'Initialize System'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Dashboard Stats View */}
                            {activeTab === 'dashboard' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="glass-card p-6 bg-gradient-to-br from-white/5 to-transparent relative group">
                                            <button
                                                onClick={fetchState}
                                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                                title="Refresh Balance"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            </button>
                                            <p className="text-gray-400 text-sm mb-1 uppercase tracking-wide">Liquidity Pool</p>
                                            <div className="flex items-baseline gap-2">
                                                <h3 className="text-4xl font-bold font-mono text-white">{cleanValue(budget)}</h3>
                                                <span className="text-sm text-gray-500">credits</span>
                                            </div>
                                            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                                                On-Chain Balance
                                            </div>
                                        </div>

                                        <div className="glass-card p-6">
                                            <p className="text-gray-400 text-sm mb-1 uppercase tracking-wide">Payroll ID</p>
                                            <h3 className="text-4xl font-bold font-mono text-white">1</h3>
                                            <p className="mt-4 text-xs text-gray-500">Global identifier for this payroll instance.</p>
                                        </div>

                                        <div className="glass-card p-6 hover:bg-white/5 transition cursor-pointer" onClick={() => setActiveTab('authorize')}>
                                            <p className="text-gray-400 text-sm mb-1 uppercase tracking-wide">Quick Action</p>
                                            <h3 className="text-xl font-bold text-white mb-2">Issue New Salary</h3>
                                            <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="glass-card p-8 mt-8">
                                        <h3 className="text-xl font-bold text-white mb-4">System Overview</h3>
                                        <div className="h-48 bg-white/5 rounded-lg flex items-center justify-center border border-white/5">
                                            <p className="text-gray-500 text-sm">[Chart Placeholder: Spending History]</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Deposit Tab */}
                            {activeTab === 'deposit' && (
                                <div className="glass-card max-w-xl">
                                    <h3 className="font-semibold mb-2 text-gray-200">Deposit Liquidity</h3>
                                    <p className="text-sm text-gray-500 mb-6">Add public credits to the payroll pool. This balance is viewable by auditors.</p>

                                    <div className="p-4 bg-black/30 rounded-lg mb-6 border border-white/5 flex justify-between items-center">
                                        <span className="text-gray-400 text-sm">Current Balance</span>
                                        <span className="font-mono text-xl font-bold text-white">{cleanValue(budget)}</span>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs text-gray-500 ml-1 mb-1 block">Amount to Deposit</label>
                                            <input
                                                type="number"
                                                placeholder="e.g. 50000"
                                                className="glass-input w-full"
                                                value={fundAmount}
                                                onChange={(e) => setFundAmount(e.target.value)}
                                            />
                                        </div>
                                        <button
                                            onClick={handleFundPayroll}
                                            disabled={isTransacting}
                                            className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                        >
                                            {isTransacting ? 'Processing...' : 'Confirm Deposit'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Authorize Payroll Tab */}
                            {activeTab === 'authorize' && (
                                <div className="glass-card max-w-xl">
                                    <p className="text-sm text-gray-500 mb-6">Issue a salary rights record to a specific employee address.</p>

                                    <div className="space-y-5">
                                        <div>
                                            <label className="text-xs text-gray-500 ml-1 mb-1 block">Employee Address</label>
                                            <input
                                                type="text"
                                                placeholder="aleo1..."
                                                className="glass-input w-full font-mono text-sm"
                                                value={issueRecipient}
                                                onChange={(e) => setIssueRecipient(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-gray-500 ml-1 mb-1 block">Salary Amount</label>
                                                <input
                                                    type="number"
                                                    placeholder="Credits"
                                                    className="glass-input w-full"
                                                    value={issueAmount}
                                                    onChange={(e) => setIssueAmount(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 ml-1 mb-1 block">Interval</label>
                                                <input
                                                    type="number"
                                                    placeholder="Blocks"
                                                    className="glass-input w-full"
                                                    value={issueInterval}
                                                    onChange={(e) => setIssueInterval(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 ml-1 mb-1 block">Start Block Height</label>
                                            <input
                                                type="number"
                                                placeholder="Block Height"
                                                className="glass-input w-full"
                                                value={issueStart}
                                                onChange={(e) => setIssueStart(e.target.value)}
                                            />
                                            <p className="text-[10px] text-gray-500 mt-1 ml-1">Current Height: {currentHeight}</p>
                                        </div>

                                        <button
                                            onClick={handleIssueCertificate}
                                            disabled={isTransacting}
                                            className="w-full py-3 bg-white text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all disabled:opacity-50 mt-4"
                                        >
                                            Authorize Payroll
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Batch Payroll Tab */}
                            {activeTab === 'batch' && (
                                <div className="glass-card max-w-2xl">
                                    <div className="flex justify-between items-center mb-6">
                                        <p className="text-sm text-gray-500">Run payroll for multiple employees at once.</p>
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

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="text-xs text-gray-500 ml-1 mb-1 block">Base Salary</label>
                                            <input
                                                type="number"
                                                className="glass-input w-full"
                                                value={baseSalary}
                                                onChange={(e) => setBaseSalary(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 ml-1 mb-1 block">Interval</label>
                                            <input
                                                type="number"
                                                className="glass-input w-full"
                                                value={bulkInterval}
                                                onChange={(e) => setBulkInterval(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="text-xs text-gray-500 ml-1 mb-1 block">Recipients (Address, Role)</label>
                                        <textarea
                                            placeholder="aleo1...address, Junior&#10;aleo1...address, Senior"
                                            className="glass-input w-full h-32 font-mono text-xs"
                                            value={bulkRecipients}
                                            onChange={(e) => setBulkRecipients(e.target.value)}
                                        />
                                    </div>

                                    {batchStatus && (
                                        <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded text-xs font-mono text-gray-300 fade-in">
                                            {batchStatus}
                                        </div>
                                    )}

                                    <div className="flex gap-4 mb-6">
                                        <button
                                            onClick={handleBulkIssue}
                                            disabled={isTransacting}
                                            className="flex-1 py-3 border border-gray-600 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition disabled:opacity-50 font-medium"
                                        >
                                            Legacy Batch
                                        </button>
                                        <button
                                            onClick={handlePrivacyBatch}
                                            disabled={isTransacting}
                                            className="flex-1 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition disabled:opacity-50 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                                        >
                                            Private Batch Run (3x)
                                        </button>
                                    </div>

                                    {/* Save Template */}
                                    <div className="flex gap-3 items-center pt-4 border-t border-glass-border">
                                        <input
                                            type="text"
                                            placeholder="Template Name"
                                            className="glass-input flex-1 py-2 text-sm"
                                            value={newTemplateName}
                                            onChange={(e) => setNewTemplateName(e.target.value)}
                                        />
                                        <button
                                            onClick={handleSaveTemplate}
                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition"
                                        >
                                            Save Template
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Compliance & Audit Tab */}
                            {activeTab === 'compliance' && (
                                <div className="glass-card max-w-xl">
                                    <h3 className="font-semibold mb-4 text-gray-300">Generate Compliance Proof</h3>
                                    <p className="text-sm text-gray-500 mb-6">Create a Zero-Knowledge proof of total spending and recipient count without revealing individual salaries.</p>

                                    <div className="space-y-4 mb-6">
                                        <div>
                                            <label className="text-xs text-gray-500 ml-1 mb-1 block">Pay Period Hash (Optional)</label>
                                            <input
                                                type="text"
                                                placeholder="Field Element"
                                                className="glass-input w-full text-sm"
                                                value={periodHash}
                                                onChange={(e) => setPeriodHash(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 ml-1 mb-1 block">Merkle Root (Optional)</label>
                                            <input
                                                type="text"
                                                placeholder="Field Element"
                                                className="glass-input w-full text-sm"
                                                value={merkleRoot}
                                                onChange={(e) => setMerkleRoot(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleGenerateReport}
                                        disabled={isTransacting}
                                        className="w-full py-3 border border-purple-500/50 text-purple-300 rounded-lg hover:bg-purple-900/20 transition disabled:opacity-50 font-bold tracking-wide"
                                    >
                                        Generate Compliance Proof
                                    </button>

                                    {/* Advanced Initialization Option */}
                                    <div className="mt-12 pt-8 border-t border-white/5">
                                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Advanced: System Initialization</h4>
                                        <p className="text-xs text-gray-600 mb-4">
                                            If you are seeing "No active SpentRecord" errors, you may need to re-initialize your admin connection to the payroll instance.
                                        </p>

                                        <details className="group">
                                            <summary className="text-xs text-yellow-500 cursor-pointer hover:text-yellow-400 transition mb-2">
                                                Show Initialization Form
                                            </summary>
                                            <div className="space-y-3 p-4 bg-yellow-900/10 rounded border border-yellow-500/10 mt-2">
                                                <input
                                                    type="number"
                                                    placeholder="Budget (e.g. 1000000)"
                                                    className="glass-input w-full text-xs"
                                                    value={initBudget}
                                                    onChange={(e) => setInitBudget(e.target.value)}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Admin 2 Address"
                                                    className="glass-input w-full text-xs"
                                                    value={admin2}
                                                    onChange={(e) => setAdmin2(e.target.value)}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Admin 3 Address"
                                                    className="glass-input w-full text-xs"
                                                    value={admin3}
                                                    onChange={(e) => setAdmin3(e.target.value)}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Auditor Address"
                                                    className="glass-input w-full text-xs"
                                                    value={auditorAddr}
                                                    onChange={(e) => setAuditorAddr(e.target.value)}
                                                />
                                                <button
                                                    onClick={handleInitializePayroll}
                                                    disabled={isTransacting}
                                                    className="w-full py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 text-xs rounded transition"
                                                >
                                                    Force Initialize
                                                </button>
                                            </div>
                                        </details>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </main>
    )
}
