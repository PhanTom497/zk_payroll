'use client'

import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useState, useEffect, useMemo, type ComponentType } from 'react'
import { requestTransaction, PROGRAM_ID, fetchBlockHeight, fetchMappingValue, getRecordField } from '@/lib/zk-utils'
import {
    ANALYTICS_STORAGE_KEY,
    appendAnalyticsEvent,
    readAnalyticsEvents,
    type AdminAnalyticsEvent,
    type AnalyticsTimePreset,
    filterEventsByPreset,
    buildPayoutSeries,
    buildTokenBreakdown,
    getLatestPayoutTimestamp,
    getUniqueRecipientCount,
    getTotalPayoutMicro,
    microToCredits,
} from '@/lib/analytics-utils'
import { motion, AnimatePresence } from "framer-motion"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts'
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
    Check,
    Activity,
    AlertCircle
} from "lucide-react"
import Link from 'next/link'
import NetworkStatus from '@/components/NetworkStatus'
import { toast } from "sonner"
import GlassCard from "@/components/GlassCard"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WalletConnectButton } from "@/components/WalletConnectButton"

function getMicrocredits(record: any): number {
    try {
        if (!record) return 0;

        // Fast path for explicit object properties
        if (record.data && record.data.microcredits) {
            return parseInt(String(record.data.microcredits).replace(/u64|\.private/g, ''));
        }
        if (record.data && record.data.amount) {
            return parseInt(String(record.data.amount).replace(/u128|\.private/g, ''));
        }

        // Fallback: Stringify the entire object to bypass any Wallet Adapter JS-object wrapping or nesting
        const fullStr = typeof record === 'string' ? record : JSON.stringify(record);

        // Match any format variant anywhere in the record: microcredits: 1000u64, "microcredits":"1000u64.private", etc.
        const match = fullStr.match(/(?:microcredits|"microcredits"|amount|"amount")\s*:\s*["']?([\d_]+)/);
        if (match && match[1]) {
            return parseInt(match[1].replace(/_/g, ''));
        }

        return 0;
    } catch (e) {
        console.error("Record parse bug:", e);
        return 0;
    }
}

type DashboardContextSnapshot = {
    latestSpentTotalMicro: number
    latestRecipientCount: number
    latestAuditTimestamp: number | null
}

const INITIAL_BUDGET_STORAGE_KEY = 'zkp_admin_initial_budget_1field'

const CHART_COLORS = {
    credits: '#fafafa',
    usdcx: '#bdbdbd',
    usad: '#737373',
} as const

const PRESET_LABELS: Record<AnalyticsTimePreset, string> = {
    today: 'Today',
    last_7_days: 'Last 7 Days',
    this_month: 'This Month',
    last_month: 'Last Month',
    all_time: 'All Time',
}

function formatCredits(amountMicro: number): string {
    const credits = microToCredits(amountMicro)
    return credits.toLocaleString(undefined, { maximumFractionDigits: 6 })
}

function formatTaxRate(bps: number): string {
    return `${(bps / 100).toFixed(2)}%`
}

function parseMicroValue(raw?: string): number {
    if (!raw) return 0
    return parseInt(raw.replace(/u64|u32|field|\.private|\.public|_/g, '')) || 0
}

function normalizeAddress(raw?: string | null): string {
    if (!raw) return ''
    return raw.replace(/"/g, '').trim().toLowerCase()
}

function normalizeRecordPlaintext(raw?: string | null): string {
    if (!raw) return ''
    return raw.replace(/\\n/g, '').replace(/\n/g, '').replace(/ /g, '')
}

function getNormalizedRecordOwner(record: any, plaintext?: string): string {
    const ownerRaw =
        getRecordField(plaintext ? { ...record, plaintext } : record, 'owner') ||
        record?.owner ||
        ''

    return normalizeAddress(String(ownerRaw).replace(/\.private|\.public/g, ''))
}

type SpentRecordSnapshot = {
    plaintext: string
    totalSpent: number
    recipientCount: number
    serial: string
}

type AdminTab = 'dashboard' | 'deposit' | 'authorize' | 'batch' | 'compliance' | 'relayer'

const HR_TAB_TITLES: Record<AdminTab, string> = {
    dashboard: 'Overview',
    deposit: 'Add Budget',
    authorize: 'Pay One Employee',
    batch: 'Run Payroll Cycle',
    relayer: 'Employee Claims',
    compliance: 'Reports & Audit',
}

const HR_TAB_DESCRIPTIONS: Record<AdminTab, string> = {
    dashboard: 'Track payroll activity, budget, and workforce health in one place.',
    deposit: 'Add payroll budget and prepare payment funds with guided steps.',
    authorize: 'Create and approve a payment for a single employee.',
    batch: 'Run a full payroll cycle for multiple employees using familiar templates.',
    relayer: 'Review and approve employee-initiated claim requests.',
    compliance: 'Generate audit-ready payroll summaries without exposing private salaries.',
}

const HR_TEMPLATE_PRESETS: Array<{ name: string; baseSalary: string; interval: string; hint: string }> = [
    { name: 'Monthly Salaried', baseSalary: '4000', interval: '30', hint: 'Best for fixed monthly teams.' },
    { name: 'Biweekly Payroll', baseSalary: '2000', interval: '14', hint: 'Best for 2-week payroll cycles.' },
    { name: 'Weekly Contractors', baseSalary: '1000', interval: '7', hint: 'Best for weekly contributor payouts.' },
]

const FUNDING_TOKEN_META = {
    credits: {
        label: 'ALEO',
        program: 'credits.aleo',
        amountLiteral: 'u64',
    },
    usdcx: {
        label: 'USDCx',
        program: 'test_usdcx_stablecoin.aleo',
        amountLiteral: 'u128',
    },
    usad: {
        label: 'USAD',
        program: 'test_usad_stablecoin.aleo',
        amountLiteral: 'u128',
    },
} as const

export default function AdminPage() {
    const { wallet, address, requestRecords, decrypt } = useWallet()
    const publicKey = address; // Alias for compatibility

    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    const isConnected = mounted && publicKey;

    // Multisig UI State
    const [isSigModalOpen, setIsSigModalOpen] = useState(false)
    const [sig1, setSig1] = useState<string | null>(null)
    const [sig2, setSig2] = useState<string | null>(null)
    const [sig3, setSig3] = useState<string | null>(null)
    const [pendingTxPayload, setPendingTxPayload] = useState<any>(null)

    const [budget, setBudget] = useState<string>('Loading...')
    const [periodHash, setPeriodHash] = useState('')
    const [merkleRoot, setMerkleRoot] = useState('')
    const [isTransacting, setIsTransacting] = useState(false)
    const [currentHeight, setCurrentHeight] = useState<number>(0)

    // Tab State
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')

    // Helper to clean Aleo values and convert u64 (microcredits) to Credits
    const cleanValue = (val: string, forceMicrocredits: boolean = false) => {
        if (!val) return '0'
        const isMicrocredits = forceMicrocredits || val.includes('u64')
        let clean = val.replace(/u64|u32|field|\.private/g, '').replace(/_/g, '')
        if (isMicrocredits) {
            return (parseFloat(clean) / 1_000_000).toString()
        }
        return clean
    }

    // Form States
    const [fundAmount, setFundAmount] = useState('')
    const [fundingToken, setFundingToken] = useState<'credits' | 'usdcx' | 'usad'>('credits')
    const [issueRecipient, setIssueRecipient] = useState('')
    const [issueAmount, setIssueAmount] = useState('')
    const [issueStart, setIssueStart] = useState('')
    const [issueVestingDelay, setIssueVestingDelay] = useState('0')

    // Initialization State
    const [isInitialized, setIsInitialized] = useState<boolean | null>(null) // null = check pending
    const [currency, setCurrency] = useState<'credits' | 'usdcx' | 'usad'>('credits')
    const [initBudget, setInitBudget] = useState('1000')
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
    const [analyticsEvents, setAnalyticsEvents] = useState<AdminAnalyticsEvent[]>([])
    const [timePreset, setTimePreset] = useState<AnalyticsTimePreset>('this_month')
    const [dashboardContext, setDashboardContext] = useState<DashboardContextSnapshot>({
        latestSpentTotalMicro: 0,
        latestRecipientCount: 0,
        latestAuditTimestamp: null,
    })
    const [configuredBudgetMicro, setConfiguredBudgetMicro] = useState<number | null>(null)
    const [taxRateInput, setTaxRateInput] = useState('10')
    const [taxAuthorityInput, setTaxAuthorityInput] = useState('')
    const [activeTaxBps, setActiveTaxBps] = useState(0)
    const [activeTaxAuthority, setActiveTaxAuthority] = useState<string>('Not configured')
    const [taxCollectedMicro, setTaxCollectedMicro] = useState(0)
    const [isAdminAuthorized, setIsAdminAuthorized] = useState<boolean | null>(null)

    const readLatestSpentRecord = async (): Promise<SpentRecordSnapshot | null> => {
        if (!requestRecords) return null

        const records = await requestRecords(PROGRAM_ID, true)
        const candidates = (records as any[])
            .filter((rec: any) => !rec.spent && rec.recordName === 'SpentRecord')
            .map((rec: any) => {
                const plaintextRaw = rec.plaintext || rec.recordPlaintext || rec.ciphertext || ''
                const plaintext = typeof plaintextRaw === 'string'
                    ? plaintextRaw.replace(/\\n/g, '').replace(/\n/g, '').replace(/ /g, '')
                    : ''

                return {
                    plaintext,
                    totalSpent: parseMicroValue(getRecordField(rec, 'total_spent')),
                    recipientCount: parseMicroValue(getRecordField(rec, 'recipient_count')),
                    serial: String(rec.serialNumber || rec.commitment || plaintext),
                }
            })
            .sort((a, b) => {
                if (b.recipientCount !== a.recipientCount) return b.recipientCount - a.recipientCount
                return b.totalSpent - a.totalSpent
            })

        return candidates[0] || null
    }

    const waitForNextSpentRecord = async (
        previous: SpentRecordSnapshot,
        expectedAmountMicro: number
    ): Promise<SpentRecordSnapshot> => {
        const maxAttempts = 40
        const minRecipientCount = previous.recipientCount + 1
        const minTotalSpent = previous.totalSpent + expectedAmountMicro

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const latest = await readLatestSpentRecord()
            if (
                latest &&
                latest.serial !== previous.serial &&
                latest.recipientCount >= minRecipientCount &&
                latest.totalSpent >= minTotalSpent
            ) {
                return latest
            }

            await new Promise((resolve) => setTimeout(resolve, 2000))
        }

        throw new Error('Payroll state did not refresh after the previous payout. Please rescan and continue.')
    }

    const findSpendableCreditsRecord = async (requiredMicrocredits: number): Promise<string | null> => {
        const candidateSources: any[] = []

        try {
            const adapterRecords = await (wallet as any)?.adapter?.requestRecords?.('credits.aleo', false)
            if (Array.isArray(adapterRecords)) candidateSources.push(...adapterRecords)
        } catch (error) {
            console.warn('Raw credits request failed:', error)
        }

        try {
            const decryptedRecords = await requestRecords?.('credits.aleo', true)
            if (Array.isArray(decryptedRecords)) candidateSources.push(...decryptedRecords)
        } catch (error) {
            console.warn('Decrypted credits request failed:', error)
        }

        if (!candidateSources.length) return null

        const signer = normalizeAddress(publicKey)
        const seen = new Set<string>()
        const candidates: Array<{ amount: number; record: string }> = []

        for (const r of candidateSources as any[]) {
            if (!r || r.spent) continue

            const identity = String(r.serialNumber || r.commitment || r.ciphertext || r.recordCiphertext || JSON.stringify(r))
            if (seen.has(identity)) continue
            seen.add(identity)

            let plaintext = r.plaintext || r.recordPlaintext || ''
            const encrypted = r.recordCiphertext || r.ciphertext || ''

            if (!plaintext && encrypted && decrypt) {
                try {
                    const decryptedStr = await decrypt(encrypted)
                    if (decryptedStr) {
                        plaintext = typeof decryptedStr === 'string' ? decryptedStr : String(decryptedStr)
                    }
                } catch (error) {
                    console.warn('Credits record decrypt failed:', error)
                }
            }

            const normalizedPlaintext = typeof plaintext === 'string'
                ? normalizeRecordPlaintext(plaintext)
                : ''

            if (!normalizedPlaintext) continue

            const amount = getMicrocredits(normalizedPlaintext)
            const owner = getNormalizedRecordOwner(r, normalizedPlaintext)

            if (!owner || (signer && owner !== signer)) continue
            if (amount < requiredMicrocredits) continue

            candidates.push({ amount, record: normalizedPlaintext })
        }

        candidates.sort((a, b) => a.amount - b.amount)
        return candidates[0]?.record || null
    }

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

    useEffect(() => {
        const raw = localStorage.getItem(INITIAL_BUDGET_STORAGE_KEY)
        if (!raw) return
        const parsed = Number(raw)
        if (Number.isFinite(parsed) && parsed >= 0) {
            setConfiguredBudgetMicro(parsed)
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

    const handleApplyPreset = (preset: { name: string; baseSalary: string; interval: string }) => {
        setBaseSalary(preset.baseSalary)
        setBulkInterval(preset.interval)
        toast.success(`Template applied: ${preset.name}`)
    }

    const refreshAnalyticsFromStorage = () => {
        try {
            setAnalyticsEvents(readAnalyticsEvents())
        } catch (error) {
            console.warn('Failed to refresh analytics from storage', error)
            setAnalyticsEvents([])
        }
    }

    const fetchDashboardContextFromWallet = async () => {
        if (!requestRecords) return

        try {
            const records = await requestRecords(PROGRAM_ID, true)

            let latestSpentTotalMicro = 0
            let latestRecipientCount = 0
            let latestAuditTimestamp: number | null = null

            for (const rec of records as any[]) {
                if (rec?.spent) continue

                const name = rec?.recordName
                if (name === 'SpentRecord') {
                    const totalSpent = parseMicroValue(getRecordField(rec, 'total_spent'))
                    const recipientCount = parseMicroValue(getRecordField(rec, 'recipient_count'))
                    if (totalSpent >= latestSpentTotalMicro) {
                        latestSpentTotalMicro = totalSpent
                        latestRecipientCount = recipientCount
                    }
                }

                if (name === 'AuditReport') {
                    const ts = parseMicroValue(getRecordField(rec, 'timestamp'))
                    if (ts > 0 && (!latestAuditTimestamp || ts > latestAuditTimestamp)) {
                        latestAuditTimestamp = ts
                    }
                }
            }

            setDashboardContext({
                latestSpentTotalMicro,
                latestRecipientCount,
                latestAuditTimestamp,
            })
        } catch (error) {
            console.warn('Failed to fetch dashboard context from wallet records', error)
        }
    }

    const refreshDashboardAnalytics = async () => {
        refreshAnalyticsFromStorage()
        await fetchDashboardContextFromWallet()
    }

    // Fetch public state from chain
    const fetchState = async () => {
        // Silent refresh, don't show loading text unless budget is completely unset
        if (!budget) setBudget('Loading...')
        try {
            let initialized = false

            // Check if initialized by fetching budget mapping
            const budgetVal = await fetchMappingValue('payroll_budgets', '1field')
            if (budgetVal) {
                setBudget(budgetVal)
                setIsInitialized(true)
                initialized = true
            } else {
                setBudget('0u64')
                // Double check with another mapping to confirm uninitialized vs just 0 balance
                const thresholdVal = await fetchMappingValue('multisig_threshold', '1field')
                if (thresholdVal) {
                    setIsInitialized(true)
                    initialized = true
                } else {
                    setIsInitialized(false)
                    initialized = false
                }
            }

            if (initialized && publicKey) {
                const [a1, a2, a3] = await Promise.all([
                    fetchMappingValue('admin_1', '1field'),
                    fetchMappingValue('admin_2', '1field'),
                    fetchMappingValue('admin_3', '1field'),
                ])
                const current = normalizeAddress(publicKey)
                const adminSet = new Set([normalizeAddress(a1), normalizeAddress(a2), normalizeAddress(a3)])
                setIsAdminAuthorized(adminSet.has(current))
            } else {
                // During first-time setup, allow access to setup screen.
                setIsAdminAuthorized(true)
            }

            const [taxBpsVal, taxAuthorityVal, taxCollectedVal] = await Promise.all([
                fetchMappingValue('tax_percentage_bps', '1field'),
                fetchMappingValue('tax_authority', '1field'),
                fetchMappingValue('tax_collected_total', '1field'),
            ])

            if (taxBpsVal) {
                const parsedBps = parseInt(taxBpsVal.replace(/u16|u64|\.public|\.private|"/g, '')) || 0
                setActiveTaxBps(parsedBps)
                if (parsedBps > 0) {
                    setTaxRateInput((parsedBps / 100).toString())
                }
            } else {
                setActiveTaxBps(0)
            }

            if (taxAuthorityVal) {
                const cleanedAuthority = taxAuthorityVal.replace(/"/g, '')
                setActiveTaxAuthority(cleanedAuthority)
                setTaxAuthorityInput(cleanedAuthority)
            } else {
                setActiveTaxAuthority('Not configured')
            }

            if (taxCollectedVal) {
                setTaxCollectedMicro(parseMicroValue(taxCollectedVal))
            } else {
                setTaxCollectedMicro(0)
            }
        } catch (e) {
            console.error("Error fetching state:", e)
            setIsInitialized(false)
            setIsAdminAuthorized(false)
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
                    (parseInt(initBudget) * 1_000_000) + 'u64', // budget_ceiling in microcredits
                    '1field',           // payroll_id
                    initThreshold + 'u64', // threshold
                    publicKey,          // admin1 (self)
                    admin2,             // admin2
                    admin3,             // admin3
                    auditorAddr         // auditor
                ],
                300_000
            )
            toast.success("Payroll workspace setup started. Waiting for confirmation...")

            // Poll for completion (up to 60s)
            let attempts = 0
            const checkInterval = setInterval(async () => {
                attempts++
                try {
                    const check = await fetchMappingValue('payroll_budgets', '1field')
                    if (check) {
                        clearInterval(checkInterval)
                        setBudget(check)
                        setIsInitialized(true)
                        const configuredMicro = Math.max(0, Math.floor(Number(initBudget || '0') * 1_000_000))
                        setConfiguredBudgetMicro(configuredMicro)
                        localStorage.setItem(INITIAL_BUDGET_STORAGE_KEY, String(configuredMicro))
                        toast.success("Payroll workspace created successfully.")
                    } else if (attempts > 30) {
                        clearInterval(checkInterval)
                        toast.warning("Verification taking longer than expected. Please refresh manually.")
                    }
                } catch (e) {
                    console.error("Polling error", e)
                }
            }, 2000)

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (!isConnected) {
            setIsAdminAuthorized(null)
            return
        }
        setIsAdminAuthorized(null)
        void fetchState()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [publicKey, isConnected])

    useEffect(() => {
        refreshAnalyticsFromStorage()
    }, [])

    useEffect(() => {
        const onStorage = (ev: StorageEvent) => {
            if (ev.key && ev.key !== ANALYTICS_STORAGE_KEY) return
            refreshAnalyticsFromStorage()
        }
        window.addEventListener('storage', onStorage)
        return () => window.removeEventListener('storage', onStorage)
    }, [])

    useEffect(() => {
        if (!isConnected || activeTab !== 'dashboard') return
        void refreshDashboardAnalytics()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected, activeTab, requestRecords])

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

    const [pendingPulls, setPendingPulls] = useState<any[]>([])

    // Load pending pulls
    useEffect(() => {
        const loadPulls = () => {
            const pulls = JSON.parse(localStorage.getItem('pending_pull_claims') || '[]')
            setPendingPulls(pulls)
        }

        if (activeTab === 'relayer') {
            loadPulls()
        }

        // Listen for cross-tab local storage changes
        window.addEventListener('storage', loadPulls)
        return () => window.removeEventListener('storage', loadPulls)
    }, [activeTab])

    const filteredAnalyticsEvents = useMemo(
        () => filterEventsByPreset(analyticsEvents, timePreset),
        [analyticsEvents, timePreset]
    )

    const payoutSeries = useMemo(
        () => buildPayoutSeries(filteredAnalyticsEvents, timePreset),
        [filteredAnalyticsEvents, timePreset]
    )

    const tokenBreakdown = useMemo(
        () => buildTokenBreakdown(filteredAnalyticsEvents),
        [filteredAnalyticsEvents]
    )

    const totalPayoutMicro = useMemo(
        () => getTotalPayoutMicro(filteredAnalyticsEvents),
        [filteredAnalyticsEvents]
    )

    const allTimePayoutMicro = useMemo(
        () => getTotalPayoutMicro(analyticsEvents),
        [analyticsEvents]
    )

    const activeEmployeesCount = useMemo(
        () => getUniqueRecipientCount(filteredAnalyticsEvents),
        [filteredAnalyticsEvents]
    )

    const latestPayoutTs = useMemo(
        () => getLatestPayoutTimestamp(filteredAnalyticsEvents),
        [filteredAnalyticsEvents]
    )

    const chartSeriesData = useMemo(
        () =>
            payoutSeries.map((point) => ({
                label: point.label,
                totalCredits: microToCredits(point.totalMicro),
            })),
        [payoutSeries]
    )

    const pieData = useMemo(
        () =>
            tokenBreakdown
                .filter((item) => item.totalMicro > 0)
                .map((item) => ({
                    name: item.label,
                    value: microToCredits(item.totalMicro),
                    percentage: item.percentage,
                    color: CHART_COLORS[item.currency],
                })),
        [tokenBreakdown]
    )

    const safeLogAnalyticsEvent = (
        payload: Omit<AdminAnalyticsEvent, 'id' | 'timestamp'> & { timestamp?: number }
    ) => {
        try {
            const updated = appendAnalyticsEvent({
                ...payload,
                timestamp: payload.timestamp || Date.now(),
            })
            setAnalyticsEvents(updated)
        } catch (error) {
            console.warn('Non-blocking analytics log failure', error)
        }
    }

    const effectiveLastPayoutTs =
        latestPayoutTs || (dashboardContext.latestAuditTimestamp ? dashboardContext.latestAuditTimestamp * 1000 : null)
    const displayActiveEmployees = activeEmployeesCount || dashboardContext.latestRecipientCount
    const displayAllTimePayoutMicro =
        allTimePayoutMicro > 0 ? allTimePayoutMicro : dashboardContext.latestSpentTotalMicro
    const chainBudgetMicro = parseMicroValue(budget)
    const hasPayrollActivity = displayAllTimePayoutMicro > 0
    const hasAuditSnapshot = Boolean(dashboardContext.latestAuditTimestamp)

    const payrollAssistantSteps: Array<{
        id: string
        title: string
        detail: string
        tab: AdminTab
        state: 'done' | 'active' | 'pending'
    }> = [
            {
                id: 'setup',
                title: 'Set payroll policy',
                detail: 'Define ceiling, approvers, and auditor.',
                tab: 'dashboard',
                state: isInitialized ? 'done' : 'active',
            },
            {
                id: 'fund',
                title: 'Add payroll budget',
                detail: 'Prepare payroll funds and top up the spend limit.',
                tab: 'deposit',
                state: chainBudgetMicro > 0 ? 'done' : 'active',
            },
            {
                id: 'run',
                title: 'Run payroll',
                detail: 'Pay one employee or process a full pay cycle.',
                tab: 'batch',
                state: hasPayrollActivity ? 'done' : 'active',
            },
            {
                id: 'claims',
                title: 'Process employee claims',
                detail: 'Approve employee claim requests when they appear.',
                tab: 'relayer',
                state: pendingPulls.length > 0 ? 'active' : hasPayrollActivity ? 'done' : 'pending',
            },
            {
                id: 'audit',
                title: 'Export audit report',
                detail: 'Generate a compliant payroll summary for auditors.',
                tab: 'compliance',
                state: hasAuditSnapshot ? 'done' : 'pending',
            },
        ]

    const renderBarTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null
        const value = Number(payload[0]?.value || 0)
        return (
            <div className="rounded-xl border border-white/15 bg-black/95 px-3 py-2 shadow-2xl backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 mb-1">{label}</p>
                <p className="text-sm font-bold text-zinc-100">
                    {value.toLocaleString(undefined, { maximumFractionDigits: 6 })} credits
                </p>
            </div>
        )
    }

    const renderPieTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null
        const point = payload[0]?.payload
        const name = point?.name || 'Token'
        const value = Number(point?.value || 0)
        const percentage = Number(point?.percentage || 0)
        return (
            <div className="rounded-xl border border-white/15 bg-black/95 px-3 py-2 shadow-2xl backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 mb-1">{name}</p>
                <p className="text-sm font-bold text-zinc-100">
                    {value.toLocaleString(undefined, { maximumFractionDigits: 6 })} credits
                </p>
                <p className="text-xs text-zinc-300">{percentage.toFixed(1)}% of selected range</p>
            </div>
        )
    }

    const handleSaveTaxPolicy = async () => {
        if (!publicKey || !wallet?.adapter) return

        const taxRatePercent = Number(taxRateInput)
        if (!Number.isFinite(taxRatePercent) || taxRatePercent <= 0 || taxRatePercent > 100) {
            toast.error('Tax rate must be between 0.01 and 100 percent.')
            return
        }

        const authority = taxAuthorityInput.trim()
        if (!authority) {
            toast.error('Please provide a tax authority wallet address.')
            return
        }

        const taxBps = Math.round(taxRatePercent * 100)
        if (taxBps < 1 || taxBps > 10000) {
            toast.error('Computed tax basis points are out of range.')
            return
        }

        setIsTransacting(true)
        try {
            const txId = await requestTransaction(
                wallet.adapter,
                publicKey,
                PROGRAM_ID,
                'set_tax_policy',
                ['1field', `${taxBps}u16`, authority],
                300_000
            )
            toast.success(`Tax policy updated. Tx: ${txId}`)
            await fetchState()
        } catch (err: any) {
            console.error('set_tax_policy failed:', err)
            toast.error('Failed to update tax policy: ' + err.message)
        } finally {
            setIsTransacting(false)
        }
    }

    const handleProcessPull = async (pullReq: any, index: number) => {
        if (!publicKey || !requestRecords) return
        setIsTransacting(true)
        try {
            const signer = normalizeAddress(publicKey)
            const certStr = pullReq.certificateRecord.replace(/\n/g, '').replace(/ /g, '')
            const amountMatch = certStr.match(/amount:([\d_]+)u64/)
            const reqAmount = amountMatch ? parseInt(amountMatch[1].replace(/_/g, '')) : 0
            if (reqAmount <= 0) {
                toast.error("This claim request is invalid because amount could not be parsed.")
                setIsTransacting(false)
                return
            }

            const paymentMatch = certStr.match(/payment_id:([a-zA-Z0-9_\.]+)/)
            let paymentId = paymentMatch ? paymentMatch[1] : null

            if (!paymentId) {
                toast.error("This request could not be processed because it is missing a valid payment reference.")
                setIsTransacting(false)
                return
            }
            paymentId = paymentId.replace(/\.private|\.public/g, '')

            toast.info("1/3: Loading payroll claim context...")
            const records = await requestRecords(PROGRAM_ID, true)

            const treasuryCandidates = (records as any[])
                .filter((rec: any) => !rec.spent && rec.recordName === 'TreasuryRecord')
                .map((rec: any) => {
                    const plaintext = normalizeRecordPlaintext(rec.plaintext || rec.recordPlaintext || '')
                    const owner = getNormalizedRecordOwner(rec, plaintext)
                    const balance = parseMicroValue(getRecordField(plaintext ? { ...rec, plaintext } : rec, 'balance'))
                    return { rec, owner, balance, plaintext }
                })
                .filter((item: any) => item.plaintext && item.owner === signer && item.balance >= reqAmount)
                .sort((a: any, b: any) => b.balance - a.balance)

            const treasuryRecord = treasuryCandidates.length > 0 ? treasuryCandidates[0] : null

            if (!treasuryRecord) {
                toast.error("No signer-owned treasury record with enough balance was found. Switch to the funding admin wallet or add funds.")
                setIsTransacting(false)
                return
            }
            const treasuryStr = treasuryRecord.plaintext

            toast.info("2/3: Checking available payroll funds...")
            const payRecordStr = await findSpendableCreditsRecord(reqAmount)
            if (!payRecordStr) {
                toast.error(`No decrypted signer-owned private credits record can cover ${reqAmount / 1_000_000} ALEO. Refresh wallet records, reconnect if needed, or consolidate funds first.`)
                setIsTransacting(false)
                return
            }

            const [taxBpsVal, taxAuthorityVal] = await Promise.all([
                fetchMappingValue('tax_percentage_bps', '1field'),
                fetchMappingValue('tax_authority', '1field'),
            ])
            const configuredTaxBps = taxBpsVal
                ? parseInt(taxBpsVal.replace(/u16|u64|\.private|\.public|"/g, '')) || 0
                : 0
            const configuredTaxAuthority = taxAuthorityVal ? taxAuthorityVal.replace(/"/g, '') : ''

            if (configuredTaxBps <= 0 || !configuredTaxAuthority) {
                toast.error('Tax policy is not configured. Set rate and authority in Add Budget before processing claims.')
                setIsTransacting(false)
                return
            }

            toast.info("3/3: Approving employee claim...")
            const txId = await requestTransaction(
                wallet?.adapter!,
                publicKey,
                PROGRAM_ID,
                'claim_salary',
                [
                    treasuryStr,
                    payRecordStr,
                    pullReq.employee,
                    reqAmount + "u64",
                    paymentId,
                    configuredTaxBps + 'u16',
                    configuredTaxAuthority,
                ],
                600_000
            )

            toast.success("Employee claim approved successfully. Tx: " + txId)
            safeLogAnalyticsEvent({
                txId,
                payrollId: '1field',
                recipient: pullReq.employee,
                currency: 'credits',
                amountMicro: reqAmount,
                actionType: 'claim_salary',
            })
            const newPulls = [...pendingPulls]
            newPulls.splice(index, 1)
            setPendingPulls(newPulls)
            localStorage.setItem('pending_pull_claims', JSON.stringify(newPulls))
            await fetchState()

        } catch (err: any) {
            console.error("Relayer Error:", err)
            toast.error("Failed to process employee claim: " + err.message)
        } finally {
            setIsTransacting(false)
        }
    }

    const handleFundPayroll = async () => {
        if (!publicKey || !fundAmount) return
        setIsTransacting(true)
        try {
            toast.info("1/2: Checking private payroll funds...")
            const microcredits = Math.floor(parseFloat(fundAmount) * 1_000_000)
            const payRecordStr = await findSpendableCreditsRecord(microcredits)
            if (!payRecordStr) {
                toast.error(`No private ALEO funding record found for ${fundAmount} credits. Prepare ALEO funds in Step 1 before increasing spend limit.`)
                setIsTransacting(false)
                return
            }

            toast.info("2/2: Updating payroll budget...")

            const txId = await requestTransaction(
                wallet?.adapter!,
                publicKey,
                PROGRAM_ID,
                'fund_payroll',
                [payRecordStr, publicKey, microcredits + 'u64', '1field'],
                600_000
            )
            toast.success("Payroll budget updated successfully. Tx: " + txId)
            fetchState()
        } catch (err: any) {
            console.error(err)
            toast.error("Error: " + err.message)
        } finally {
            setIsTransacting(false)
        }
    }

    const handleConvertPublicToPrivate = async () => {
        if (!publicKey || !fundAmount) {
            toast.error("Please enter a valid amount to convert.")
            return
        }
        setIsTransacting(true)
        try {
            const microAmount = Math.floor(parseFloat(fundAmount) * 1_000_000)
            if (!Number.isFinite(microAmount) || microAmount <= 0) {
                toast.error("Please enter a valid positive amount.")
                setIsTransacting(false)
                return
            }

            const tokenMeta = FUNDING_TOKEN_META[fundingToken]

            const txId = await requestTransaction(
                wallet?.adapter!,
                publicKey,
                tokenMeta.program,
                'transfer_public_to_private',
                [publicKey, microAmount + tokenMeta.amountLiteral],
                300_000
            )
            toast.success(`Private ${tokenMeta.label} funds are being prepared. Tx: ${txId}`)
        } catch (err: any) {
            console.error(err)
            toast.error("Error: " + err.message)
        } finally {
            setIsTransacting(false)
        }
    }

    // Triggered when clicking 'Sign Message' in the Modal
    const handleSignMessage = async (step: number) => {
        try {
            if (!pendingTxPayload) return;
            // Leo's internal verify() expects the signature to be validated against the signer's address string!
            // However, snarkVM serializes this 63-char string into a 32-byte affine x-coordinate during `verify()`.
            let adminAddressToSign = pendingTxPayload.admin1 as string;
            if (step === 2) adminAddressToSign = pendingTxPayload.admin2 as string;
            if (step === 3) adminAddressToSign = pendingTxPayload.admin3 as string;

            toast.info("Preparing secure approval payload...");

            const serverRes = await fetch('/api/get-address-bytes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: adminAddressToSign })
            });
            const addrData = await serverRes.json();
            if (!serverRes.ok) throw new Error(addrData.error || "Failed to fetch Address bytes");

            const msgBytes = new Uint8Array(addrData.bytes);

            toast.info("Requesting wallet signature...");
            const sigBytes = await (wallet as any)?.adapter?.signMessage(msgBytes);
            if (!sigBytes) throw new Error("Signature rejected or failed");

            // Send Uint8Array to NextJS server API to completely bypass Webpack SSR Polyfill crashes
            const res = await fetch('/api/parse-sig', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bytes: Array.from(sigBytes) })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to parse signature");

            const signatureStr = data.signature;

            if (step === 1) setSig1(signatureStr)
            if (step === 2) setSig2(signatureStr)
            if (step === 3) setSig3(signatureStr)

            toast.success(`Approver ${step} signature captured.`)
        } catch (err: any) {
            console.error("Signing error:", err)
            toast.error("Failed to sign: " + err.message)
        }
    }

    // Executes the actual transaction after all 3 signatures are collected
    const executeIssueSalary = async () => {
        if (!pendingTxPayload || !sig1 || !sig2 || !sig3) return;
        setIsTransacting(true)
        setIsSigModalOpen(false)
        try {
            toast.info("Submitting payout for approval...")

            const amountLiteral = pendingTxPayload.currency === 'credits' ? 'u64' : 'u128';
            let inputs = [
                pendingTxPayload.payRecordStr as string,
                pendingTxPayload.spentRecordStr as string,
                pendingTxPayload.issueRecipient as string,
                (pendingTxPayload.requiredMicrocredits + amountLiteral) as string,
                pendingTxPayload.paymentId as string
            ]

            if (pendingTxPayload.proofsStr) {
                inputs.push(pendingTxPayload.proofsStr as string);
            }

            const funcName = pendingTxPayload.currency === 'credits' ? 'issue_salary' :
                (pendingTxPayload.currency === 'usdcx' ? 'issue_salary_usdcx' : 'issue_salary_usad');

            const txId = await requestTransaction(
                wallet?.adapter!,
                publicKey!,
                PROGRAM_ID,
                funcName,
                inputs,
                400_000
            )
            toast.success("Payout submitted successfully. Transaction ID: " + txId)
            safeLogAnalyticsEvent({
                txId,
                payrollId: '1field',
                recipient: pendingTxPayload.issueRecipient as string,
                currency: pendingTxPayload.currency as 'credits' | 'usdcx' | 'usad',
                amountMicro: Number(pendingTxPayload.requiredMicrocredits || 0),
                actionType: 'issue_salary',
            })

            toast.info("Refreshing wallet state...")
            setTimeout(() => {
                toast.success("Wallet synchronized. Ready for the next payout.")
                fetchState()
            }, 10000)

            // Clean up
            setPendingTxPayload(null)
            setSig1(null)
            setSig2(null)
            setSig3(null)
        } catch (err: any) {
            console.error(err)
            toast.error("Error: " + err.message)
        } finally {
            setIsTransacting(false)
        }
    }



    const handleIssueCertificate = async () => {
        if (!publicKey || !issueRecipient || !issueAmount) {
            toast.error("Please provide an employee wallet and payout amount.")
            return
        }
        setIsTransacting(true)
        try {
            toast.info("1/3: Checking current payroll totals...")
            // 1. Fetch Spent Record automatically
            const ourRecords = await (wallet as any)?.adapter?.requestRecords(PROGRAM_ID, true)
            const spentRec = (ourRecords as any[])?.filter((rec: any) =>
                !rec.spent && (rec.recordName === 'SpentRecord' || (rec.plaintext && rec.plaintext.includes('total_spent')))
            ).pop()

            if (!spentRec) {
                toast.error("Payroll setup is incomplete. Please initialize the system first.")
                setIsTransacting(false)
                return
            }

            let spentRecordStr = spentRec.plaintext || spentRec.recordPlaintext;
            if (!spentRecordStr && spentRec.ciphertext) spentRecordStr = spentRec.ciphertext;
            if (typeof spentRecordStr === 'string') spentRecordStr = spentRecordStr.replace(/\\n/g, '').replace(/ /g, '');

            const requiredMicrocredits = Math.floor(parseFloat(issueAmount) * 1_000_000)
            const delayBlocks = parseInt(issueVestingDelay) || 0;

            if (delayBlocks > 0) {
                const ts = Math.floor(Date.now() / 1000);
                const rPart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
                const prefix = currency === 'credits' ? '1' : currency === 'usdcx' ? '2' : '3';
                const paymentId = `${prefix}${ts}${rPart}field`;

                let unlockHeight = delayBlocks;
                try {
                    const currentBlockHeight = await fetchBlockHeight() || 0;
                    unlockHeight = currentBlockHeight + delayBlocks;
                } catch (e) { console.warn(e) }

                toast.info(`Scheduling delayed payout until block ${unlockHeight}...`)

                const txId = await requestTransaction(
                    wallet?.adapter!,
                    publicKey,
                    PROGRAM_ID,
                    'issue_vested_salary',
                    [
                        spentRecordStr,
                        issueRecipient,
                        requiredMicrocredits + 'u64',
                        paymentId,
                        unlockHeight + 'u32'
                    ],
                    50_000 // Lightweight execution since no multisig/tokens are explicitly spent
                )
                toast.success("Delayed payout scheduled successfully.")
                safeLogAnalyticsEvent({
                    txId,
                    payrollId: '1field',
                    recipient: issueRecipient,
                    currency: 'credits',
                    amountMicro: requiredMicrocredits,
                    actionType: 'issue_vested_salary',
                })
                setIssueRecipient('')
                setIssueAmount('')
                setIssueVestingDelay('0')
                setIsTransacting(false)
                return;
            }

            toast.info(`2/3: Locating available ${currency.toUpperCase()} funds...`)

            const targetProgramId = currency === 'credits' ? 'credits.aleo' : (currency === 'usdcx' ? 'test_usdcx_stablecoin.aleo' : 'test_usad_stablecoin.aleo');
            const targetRecords = await (wallet as any)?.adapter?.requestRecords(targetProgramId, false)
            console.log("RAW SHIELD WALLET RECORDS:", targetRecords)

            let payRecordStr: string | null = null;
            if (targetRecords && Array.isArray(targetRecords)) {
                for (const r of (targetRecords as any[])) {
                    if (r.spent) continue;
                    let valMicrocredits = getMicrocredits(r); // val is in microcredits

                    if (valMicrocredits === 0 && r.recordCiphertext && !r.plaintext && decrypt) {
                        try {
                            const decryptedStr = await decrypt(r.recordCiphertext);
                            if (decryptedStr) {
                                r.plaintext = typeof decryptedStr === 'string' ? decryptedStr : String(decryptedStr);
                                valMicrocredits = getMicrocredits(r);
                            }
                        } catch (e) {
                            console.warn("Manual Shield wallet decrypt failed:", e);
                        }
                    }

                    const isSpendable = !!(r.plaintext || r.nonce || r._nonce || r.data?._nonce || r.ciphertext);
                    // Match required microcredits with the record's microcredits value
                    if (isSpendable && valMicrocredits >= requiredMicrocredits) {
                        payRecordStr = r.plaintext || r.recordPlaintext;

                        if (!payRecordStr) {
                            const nonce = r.nonce || r._nonce || r.data?._nonce;
                            if (nonce) {
                                const storedVal = getMicrocredits(r.data);
                                if (currency === 'credits') {
                                    payRecordStr = `{ owner: ${r.owner}.private, microcredits: ${storedVal}u64.private, _nonce: ${nonce}.public }`;
                                } else {
                                    payRecordStr = `{ owner: ${r.owner}.private, amount: ${storedVal}u128.private, _nonce: ${nonce}.public }`;
                                }
                            } else if (r.ciphertext) {
                                payRecordStr = r.ciphertext;
                            } else {
                                payRecordStr = String(r);
                            }
                        }
                        if (typeof payRecordStr === 'string') {
                            payRecordStr = payRecordStr.replace(/\\n/g, '').replace(/ /g, '');
                        }
                        break;
                    }
                }
            }

            if (!payRecordStr) {
                toast.error(`Available funds are fragmented. Please prepare or consolidate funds before paying ${issueAmount} ${currency.toUpperCase()}.`)
                setIsTransacting(false)
                return
            }

            toast.info("3/3: Preparing admin approval request...")

            let proofsStr = undefined;
            if (currency !== 'credits') {
                const s = Array(16).fill('0field').join(', ');
                const rawProof = `{ siblings: [${s}], leaf_index: 1u32 }`;
                proofsStr = `[${rawProof}, ${rawProof}]`;
            }

            const a1 = await fetchMappingValue('admin_1', '1field')
            const a2 = await fetchMappingValue('admin_2', '1field')
            const a3 = await fetchMappingValue('admin_3', '1field')

            if (!a1 || !a2 || !a3) {
                toast.error("Approver wallets were not found. Please confirm payroll setup is complete.")
                setIsTransacting(false)
                return
            }

            const ts = Math.floor(Date.now() / 1000);
            const rPart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
            const prefix = currency === 'credits' ? '1' : currency === 'usdcx' ? '2' : '3';
            const paymentId = `${prefix}${ts}${rPart}field`;

            setPendingTxPayload({
                payRecordStr,
                spentRecordStr,
                issueRecipient,
                requiredMicrocredits,
                paymentId,
                currency,
                proofsStr,
                admin1: a1.replace(/"/g, ''),
                admin2: a2.replace(/"/g, ''),
                admin3: a3.replace(/"/g, '')
            })

            setIsSigModalOpen(true)
            toast.success("Ready for admin signatures.")
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
        setBatchStatus('Preparing payroll cycle...')

        try {
            const regex = /(aleo1[a-z0-9]{58})\s*,\s*([a-zA-Z]+)/gi
            const parsedRecipients: { addr: string, amountMicrocredits: number, role: string }[] = []

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
                const base = parseFloat(baseSalary) || 0
                const amountMicrocredits = Math.floor(base * multiplier * 1_000_000)
                
                parsedRecipients.push({ addr, amountMicrocredits, role })
                i++;
            }

            if (parsedRecipients.length === 0) {
                if (bulkRecipients.trim().length > 0) {
                    toast.error("No valid 'wallet, role' rows were found. Please check the format.")
                } else {
                    toast.error("Roster is empty.")
                }
                setIsTransacting(false)
                return
            }

            let successCount = 0;
            let failureCount = 0;
            let currentSpentRecord = await readLatestSpentRecord()

            if (!currentSpentRecord) {
                throw new Error("Payroll state is unavailable. Please reinitialize or refresh and try again.");
            }

            for (let idx = 0; idx < parsedRecipients.length; idx++) {
                const { addr, amountMicrocredits } = parsedRecipients[idx];
                
                setBatchStatus(`[${idx + 1}/${parsedRecipients.length}] Syncing payroll state...`)

                const ts = Math.floor(Date.now() / 1000);
                const rPart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
                const paymentId = `1${ts}${idx.toString().padStart(2, '0')}${rPart}field`;
                const startH = currentHeight > 0 ? currentHeight : 0;

                setBatchStatus(`[${idx + 1}/${parsedRecipients.length}] Submitting payout...`)

                const txId = await requestTransaction(
                    wallet?.adapter!,
                    publicKey,
                    PROGRAM_ID,
                    'issue_vested_salary',
                    [
                        currentSpentRecord.plaintext,
                        addr,
                        amountMicrocredits + 'u64', 
                        paymentId,
                        startH + 'u32'
                    ],
                    300_000 // 0.3 credits per tx
                );

                successCount++;
                setBatchStatus(`[${idx + 1}/${parsedRecipients.length}] Submitted. Opening next payout approval...`)
                safeLogAnalyticsEvent({
                    txId,
                    payrollId: '1field',
                    recipient: addr,
                    currency: 'credits',
                    amountMicro: amountMicrocredits,
                    actionType: 'batch_issue',
                })

                if (idx < parsedRecipients.length - 1) {
                    setBatchStatus(`[${idx + 1}/${parsedRecipients.length}] Waiting for payroll state to refresh before the next approval...`)
                    currentSpentRecord = await waitForNextSpentRecord(currentSpentRecord, amountMicrocredits)
                }
            }

            let msg = `Payroll cycle complete.\nSuccess: ${successCount}\nFailed: ${failureCount}`
            toast.success(msg)
            setBatchStatus(msg)

        } catch (err: any) {
            console.error(err)
            setBatchStatus("Run failed: " + err.message)
            toast.error("Payroll cycle failed: " + err.message)
        } finally {
            setIsTransacting(false)
        }
    }

    const handlePrivacyBatch = async () => {
        if (!publicKey || !bulkRecipients) return
        setIsTransacting(true)
        setBatchStatus('Preparing assisted privacy run...')

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
                const base = parseFloat(baseSalary) || 0
                const amount = Math.floor(base * multiplier * 1_000_000)

                allRecipients.push({ addr, amount: amount + 'u64', role })
            }

            if (allRecipients.length === 0) {
                toast.error("No valid roster entries found.")
                setIsTransacting(false)
                return
            }

            let successCount = 0;
            let failureCount = 0;
            let currentSpentRecord = await readLatestSpentRecord()

            if (!currentSpentRecord) {
                throw new Error("Payroll state is unavailable. Please reinitialize or refresh and try again.");
            }

            for (let idx = 0; idx < allRecipients.length; idx++) {
                const { addr, amount } = allRecipients[idx];
                
                setBatchStatus(`[${idx + 1}/${allRecipients.length}] Syncing payroll state...`)

                const ts = Math.floor(Date.now() / 1000);
                const rPart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
                const paymentId = `9${ts}${idx.toString().padStart(2, '0')}${rPart}field`;
                const startH = currentHeight > 0 ? currentHeight : 0;

                setBatchStatus(`[${idx + 1}/${allRecipients.length}] Submitting payout...`)

                const txId = await requestTransaction(
                    wallet?.adapter!,
                    publicKey,
                    PROGRAM_ID,
                    'issue_vested_salary',
                    [
                        currentSpentRecord.plaintext,
                        addr,
                        amount, 
                        paymentId,
                        startH + 'u32'
                    ],
                    300_000 
                );

                successCount++;
                setBatchStatus(`[${idx + 1}/${allRecipients.length}] Submitted. Opening next payout approval...`)
                safeLogAnalyticsEvent({
                    txId,
                    payrollId: '1field',
                    recipient: addr,
                    currency: 'credits',
                    amountMicro: parseMicroValue(amount),
                    actionType: 'batch_issue',
                })

                if (idx < allRecipients.length - 1) {
                    setBatchStatus(`[${idx + 1}/${allRecipients.length}] Waiting for payroll state to refresh before the next approval...`)
                    currentSpentRecord = await waitForNextSpentRecord(currentSpentRecord, parseMicroValue(amount))
                }
            }

            let msg = `Assisted privacy run complete.\nSuccess: ${successCount}\nFailed: ${failureCount}`;
            toast.success(msg);
            setBatchStatus(msg);

        } catch (err: any) {
            console.error(err);
            setBatchStatus("Run failed: " + err.message);
            toast.error("Privacy run failed: " + err.message);
        } finally {
            setIsTransacting(false);
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
                toast.error("No payroll totals record found yet for this workspace.")
                return
            }

            // 2. Prepare Inputs
            // transition generate_audit_report(spent_record, timestamp, pay_period_hash, merkle_root)
            const timestamp = Math.floor(Date.now() / 1000).toString() + 'u32'

            // Handle different wallet response structures (plaintext vs recordPlaintext)
            const safePlaintext = spentRecord.plaintext || spentRecord.recordPlaintext

            if (!safePlaintext) {
                console.error("Invalid record structure:", spentRecord)
                toast.error("Error: Could not retrieve record plaintext from wallet.")
                return
            }

            const inputs = [
                safePlaintext.replace(/\n/g, '').replace(/ /g, ''),
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

    const navItems: Array<{ id: AdminTab; title: string; icon: ComponentType<{ className?: string }> }> = [
        { id: 'dashboard', title: HR_TAB_TITLES.dashboard, icon: LayoutDashboard },
        { id: 'deposit', title: HR_TAB_TITLES.deposit, icon: Wallet },
        { id: 'authorize', title: HR_TAB_TITLES.authorize, icon: ShieldCheck },
        { id: 'batch', title: HR_TAB_TITLES.batch, icon: Layers },
        { id: 'relayer', title: HR_TAB_TITLES.relayer, icon: Activity },
        { id: 'compliance', title: HR_TAB_TITLES.compliance, icon: FileCheck },
    ]
    return (
        <div className="min-h-screen relative z-10 font-sans text-white bg-black">
            <div 
                className="fixed inset-0 z-0 bg-[length:800px] md:bg-[length:1800px] bg-left bg-no-repeat bg-fixed opacity-40"
                style={{ backgroundImage: "url('/assets/milad-fakurian-7W3X1dAuKqg-unsplash.jpg')" }}
            />
            <div className="fixed inset-0 z-0 bg-black/60 backdrop-blur-[2px]" />

            <main className="relative z-10 pt-32 pb-24 px-6 w-full flex flex-col items-center">
                
                {/* Main Heading */}
                <div className="text-center mb-12 w-full">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
                        Admin Portal
                    </h1>
                    <div className="flex items-center justify-center gap-4 text-[#a1a1aa] text-lg max-w-2xl mx-auto">
                        <p>Run payroll, approve payouts, and export audit-ready reports with a familiar HR flow.</p>
                    </div>
                </div>

                <NetworkStatus />

                {/* Second-level Nav Pill */}
                <div className="flex justify-center w-full mb-16">
                    <div className="flex items-center gap-2 bg-[#0a0a0a]/80 border border-white/10 rounded-full p-2 backdrop-blur-xl overflow-x-auto max-w-full shadow-2xl">
                        {navItems.map((item) => {
                            const isActive = activeTab === item.id;
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                                        isActive
                                            ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                                            : 'text-white/60 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.title}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content Area */}
                <div className="w-full max-w-5xl mx-auto min-w-0">
                    {!isConnected ? (
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
                    ) : isAdminAuthorized === null ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center h-[60vh] text-center max-w-md mx-auto"
                        >
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 animate-pulse">
                                <ShieldCheck className="w-8 h-8 text-white/70" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-white">Validating Admin Access</h2>
                            <p className="text-[#a1a1aa] mb-8">
                                Checking whether this wallet belongs to the configured payroll admin set.
                            </p>
                        </motion.div>
                    ) : isAdminAuthorized === false ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-2xl mx-auto"
                        >
                            <GlassCard className="border-red-500/30 bg-gradient-to-b from-red-500/10 to-[#0a0a0a]">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="p-3 bg-red-500/20 rounded-lg text-red-400">
                                        <AlertCircle className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Admin Access Required</h3>
                                        <p className="text-red-200/80 text-sm mt-1">
                                            This wallet is not one of the configured payroll admins for this workspace.
                                        </p>
                                    </div>
                                </div>
                                <p className="text-sm text-[#a1a1aa]">
                                    Switch to an authorized admin wallet to continue. Employee and auditor wallets should use their own portals.
                                </p>
                            </GlassCard>
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
                                        <h3 className="text-xl font-bold text-foreground">Payroll Setup Required</h3>
                                        <p className="text-muted-foreground text-sm mt-1">
                                            Complete this one-time setup to define payroll policy, approvers, and audit access.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Starting Spend Limit</Label>
                                            <Input
                                                type="number"
                                                value={initBudget}
                                                onChange={e => setInitBudget(e.target.value)}
                                                className="bg-white/5 border-white/10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Approval Threshold</Label>
                                            <Input
                                                type="number"
                                                value={initThreshold}
                                                onChange={e => setInitThreshold(e.target.value)}
                                                className="bg-white/5 border-white/10"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Approver 2 Wallet</Label>
                                        <Input
                                            placeholder="aleo1..."
                                            value={admin2}
                                            onChange={e => setAdmin2(e.target.value)}
                                            className="bg-white/5 border-white/10 font-mono"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Approver 3 Wallet</Label>
                                        <Input
                                            placeholder="aleo1..."
                                            value={admin3}
                                            onChange={e => setAdmin3(e.target.value)}
                                            className="bg-white/5 border-white/10 font-mono"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Audit Wallet</Label>
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
                                        {isTransacting ? 'Creating Workspace...' : 'Create Payroll Workspace'}
                                    </button>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="border-b border-white/5 pb-8">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#042f2e] text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4">
                                    Admin Operations
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2 capitalize">
                                    {HR_TAB_TITLES[activeTab]}
                                </h1>
                                <p className="text-[#a1a1aa] text-lg max-w-2xl">
                                    {HR_TAB_DESCRIPTIONS[activeTab]}
                                </p>
                            </div>

                            {/* Dashboard Stats View */}
                            {activeTab === 'dashboard' && (
                                <div className="space-y-8">
                                    <GlassCard className="border-white/10 bg-gradient-to-b from-white/[0.05] to-[#060606] p-6 rounded-3xl">
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                                            <div>
                                                <p className="text-xs font-bold tracking-widest uppercase text-[#a1a1aa] mb-2">Payroll Assistant</p>
                                                <h3 className="text-xl font-bold text-white">Follow this HR-style payroll checklist</h3>
                                            </div>
                                            <p className="text-sm text-gray-400">Click any step to jump directly to that workspace.</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                                            {payrollAssistantSteps.map((step, idx) => (
                                                <button
                                                    key={step.id}
                                                    onClick={() => setActiveTab(step.tab)}
                                                    className="text-left p-4 rounded-2xl border border-white/10 bg-black/60 hover:border-white/25 transition-colors"
                                                >
                                                    <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-zinc-500 mb-1">Step {idx + 1}</p>
                                                    <p className="text-sm font-semibold text-white">{step.title}</p>
                                                    <p className="text-xs text-zinc-400 mt-1">{step.detail}</p>
                                                    <p className={`text-[11px] font-semibold mt-3 uppercase tracking-wider ${step.state === 'done' ? 'text-emerald-400' : step.state === 'active' ? 'text-cyan-400' : 'text-zinc-500'}`}>
                                                        {step.state === 'done' ? 'Complete' : step.state === 'active' ? 'Action Needed' : 'Upcoming'}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    </GlassCard>

                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                        <div className="flex flex-wrap gap-2">
                                            {(Object.keys(PRESET_LABELS) as AnalyticsTimePreset[]).map((preset) => (
                                                <button
                                                    key={preset}
                                                    onClick={() => setTimePreset(preset)}
                                                    className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-colors ${timePreset === preset
                                                        ? 'bg-white text-black border border-white shadow-[0_10px_30px_rgba(255,255,255,0.18)]'
                                                        : 'bg-black/75 border border-white/10 text-[#a1a1aa] hover:text-white hover:border-white/30'
                                                        }`}
                                                >
                                                    {PRESET_LABELS[preset]}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => {
                                                fetchState()
                                                void refreshDashboardAnalytics()
                                            }}
                                            className="px-4 py-2 rounded-full border border-white/10 text-xs font-bold tracking-widest uppercase text-[#a1a1aa] hover:text-white hover:border-white/30 transition-colors"
                                        >
                                            Refresh Analytics
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                                        <GlassCard className="border-white/10 bg-gradient-to-b from-white/[0.045] to-[#060606] p-6 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                            <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">Current Spend Limit</p>
                                            <div className="flex items-baseline gap-2">
                                                <p className="text-3xl font-black text-white">{formatCredits(chainBudgetMicro)}</p>
                                                <span className="text-xs text-cyan-400 font-medium uppercase">credits</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                {configuredBudgetMicro !== null
                                                    ? `Configured ceiling: ${formatCredits(configuredBudgetMicro)} credits`
                                                    : 'Configured ceiling is captured at initialization from this portal'}
                                            </p>
                                        </GlassCard>

                                        <GlassCard className="border-white/10 bg-gradient-to-b from-white/[0.045] to-[#060606] p-6 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                            <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">Total Payout</p>
                                            <div className="flex items-baseline gap-2">
                                                <p className="text-3xl font-black text-white">{formatCredits(totalPayoutMicro)}</p>
                                                <span className="text-xs text-cyan-400 font-medium uppercase">credits</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">All-time: {formatCredits(displayAllTimePayoutMicro)} credits</p>
                                        </GlassCard>

                                        <GlassCard className="border-white/10 bg-gradient-to-b from-white/[0.045] to-[#060606] p-6 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                            <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">Active Employees</p>
                                            <p className="text-3xl font-black text-white">{displayActiveEmployees}</p>
                                            <p className="text-xs text-gray-500 mt-2">Unique recipient addresses in selected range</p>
                                        </GlassCard>

                                        <GlassCard className="border-white/10 bg-gradient-to-b from-white/[0.045] to-[#060606] p-6 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                            <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">Last Payout Time</p>
                                            <p className="text-lg font-bold text-white leading-tight">
                                                {effectiveLastPayoutTs ? new Date(effectiveLastPayoutTs).toLocaleString() : 'No payout data yet'}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-2">Fallback uses latest on-chain audit snapshot</p>
                                        </GlassCard>
                                    </div>

                                    <GlassCard className="border-white/10 bg-gradient-to-b from-white/[0.04] to-[#060606] p-6 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                            <div>
                                                <p className="text-xs font-bold tracking-widest uppercase text-[#a1a1aa] mb-2">Tax Policy Status</p>
                                                <p className="text-2xl font-black text-white">{activeTaxBps > 0 ? formatTaxRate(activeTaxBps) : 'Not configured'}</p>
                                                <p className="text-xs text-gray-500 mt-2">Current withholding rate used during employee claim processing.</p>
                                            </div>
                                            <div className="md:text-right">
                                                <p className="text-xs font-bold tracking-widest uppercase text-[#a1a1aa] mb-2">Tax Collected</p>
                                                <p className="text-2xl font-black text-white">{formatCredits(taxCollectedMicro)} <span className="text-sm text-cyan-400 font-semibold uppercase">credits</span></p>
                                                <p className="text-xs text-gray-500 mt-2">Authority: {activeTaxAuthority === 'Not configured' ? activeTaxAuthority : `${activeTaxAuthority.slice(0, 14)}...${activeTaxAuthority.slice(-8)}`}</p>
                                            </div>
                                        </div>
                                    </GlassCard>

                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                        <GlassCard hover={false} className="border-white/10 bg-gradient-to-b from-white/[0.04] to-[#060606] p-8 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                                                    <BarChart3 className="w-5 h-5 text-white" />
                                                </div>
                                                <h2 className="text-2xl font-bold text-white tracking-tight">Payout Trend</h2>
                                            </div>
                                            {chartSeriesData.length > 0 ? (
                                                <div className="h-[300px] w-full rounded-2xl border border-white/5 bg-[#050505]/70 p-3">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={chartSeriesData} margin={{ top: 8, right: 8, left: -8, bottom: 4 }}>
                                                            <defs>
                                                                <linearGradient id="zkpPayoutBar" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#fafafa" stopOpacity={1} />
                                                                    <stop offset="95%" stopColor="#a3a3a3" stopOpacity={0.9} />
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" vertical={false} />
                                                            <XAxis
                                                                dataKey="label"
                                                                tickLine={false}
                                                                axisLine={false}
                                                                tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 500 }}
                                                            />
                                                            <YAxis
                                                                tickLine={false}
                                                                axisLine={false}
                                                                tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 500 }}
                                                            />
                                                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={renderBarTooltip} />
                                                            <Bar dataKey="totalCredits" fill="url(#zkpPayoutBar)" radius={[10, 10, 0, 0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center h-48 text-[#a1a1aa] text-sm border border-white/5 rounded-2xl bg-[#050505]">
                                                    No payout events available in this range.
                                                </div>
                                            )}
                                        </GlassCard>

                                        <GlassCard hover={false} className="border-white/10 bg-gradient-to-b from-white/[0.04] to-[#060606] p-8 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                                                    <Activity className="w-5 h-5 text-white" />
                                                </div>
                                                <h2 className="text-2xl font-bold text-white tracking-tight">Token Distribution</h2>
                                            </div>
                                            {pieData.length > 0 ? (
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
                                                    <div className="h-[260px] w-full rounded-2xl border border-white/5 bg-[#050505]/70 p-3">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <PieChart>
                                                                <Tooltip content={renderPieTooltip} />
                                                                <Pie
                                                                    data={pieData}
                                                                    dataKey="value"
                                                                    nameKey="name"
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    outerRadius={92}
                                                                    innerRadius={54}
                                                                    paddingAngle={1.5}
                                                                    stroke="rgba(255,255,255,0.18)"
                                                                    strokeWidth={1}
                                                                >
                                                                    {pieData.map((entry) => (
                                                                        <Cell key={entry.name} fill={entry.color} />
                                                                    ))}
                                                                </Pie>
                                                            </PieChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {tokenBreakdown.map((item) => (
                                                            <div key={item.currency} className="flex items-center justify-between p-3 bg-black/80 border border-white/10 rounded-xl">
                                                                <div className="flex items-center gap-3">
                                                                    <span
                                                                        className="w-3 h-3 rounded-full"
                                                                        style={{ backgroundColor: CHART_COLORS[item.currency] }}
                                                                    />
                                                                    <span className="text-sm text-white font-semibold">{item.label}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm text-white font-bold">{item.percentage.toFixed(1)}%</p>
                                                                    <p className="text-[11px] text-gray-500">{formatCredits(item.totalMicro)} credits</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center h-48 text-[#a1a1aa] text-sm border border-white/5 rounded-2xl bg-[#050505]">
                                                    No token distribution data available in this range.
                                                </div>
                                            )}
                                        </GlassCard>
                                    </div>

                                    <GlassCard className="border-white/10 bg-gradient-to-b from-white/[0.04] to-[#060606] p-6 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                        <p className="text-xs font-bold tracking-widest uppercase text-[#a1a1aa] mb-3">Data Scope</p>
                                        <p className="text-sm text-gray-400">
                                            Analytics are derived from this admin wallet context and local ledger events captured by this portal. Values are aggregate-only and privacy-preserving.
                                        </p>
                                        <div className="mt-4 pt-4 border-t border-white/5 text-xs text-gray-500">
                                            On-chain snapshot fallback: spent {formatCredits(dashboardContext.latestSpentTotalMicro)} credits, recipients {dashboardContext.latestRecipientCount}, latest audit{' '}
                                            {dashboardContext.latestAuditTimestamp
                                                ? new Date(dashboardContext.latestAuditTimestamp * 1000).toLocaleString()
                                                : 'not available'}.
                                        </div>
                                    </GlassCard>

                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => setIsInitialized(false)}
                                            className="text-xs text-muted-foreground hover:text-white underline transition-colors"
                                        >
                                            Force Re-Initialize System (Debug)
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Deposit Tab */}
                            {activeTab === 'deposit' && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                    <GlassCard hover={false} className="max-w-xl border-white/5 bg-[#0a0a0a] rounded-3xl p-8">
                                        <div className="flex items-center justify-between mb-8 p-6 bg-[#050505] rounded-2xl border border-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-full bg-white/5 border border-white/10">
                                                    <Wallet className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider mb-1">Current Spend Limit</p>
                                                    <p className="text-3xl font-black text-white">{formatCredits(chainBudgetMicro)} <span className="text-base text-gray-400 font-medium">ALEO</span></p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-8 p-5 rounded-2xl border border-white/10 bg-black/70 space-y-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-xs font-bold tracking-widest uppercase text-[#a1a1aa] mb-1">Tax Withholding Policy</p>
                                                    <p className="text-sm text-gray-400">Set the claim-time withholding rate and the authority wallet that receives tax receipts.</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-[#a1a1aa] uppercase tracking-widest">Active Rate</p>
                                                    <p className="text-lg font-bold text-white">{activeTaxBps > 0 ? formatTaxRate(activeTaxBps) : 'Not set'}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <Label className="text-[#a1a1aa] font-medium tracking-wide">Tax Rate (%)</Label>
                                                    <Input
                                                        type="number"
                                                        min="0.01"
                                                        max="100"
                                                        step="0.01"
                                                        value={taxRateInput}
                                                        onChange={(e) => setTaxRateInput(e.target.value)}
                                                        className="bg-black border border-white/10 rounded-xl px-4 py-4 text-white font-mono focus:border-white/30 transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[#a1a1aa] font-medium tracking-wide">Tax Authority Wallet</Label>
                                                    <Input
                                                        placeholder="aleo1..."
                                                        value={taxAuthorityInput}
                                                        onChange={(e) => setTaxAuthorityInput(e.target.value)}
                                                        className="bg-black border border-white/10 rounded-xl px-4 py-4 text-white font-mono focus:border-white/30 transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-xs text-gray-500">Collected so far: {formatCredits(taxCollectedMicro)} credits</p>
                                                <button
                                                    onClick={handleSaveTaxPolicy}
                                                    disabled={isTransacting}
                                                    className="px-4 py-2 rounded-lg bg-white text-black text-sm font-bold hover:bg-gray-200 disabled:opacity-50 transition-colors"
                                                >
                                                    Save Tax Policy
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-[#a1a1aa] font-medium tracking-wide">Amount To Add</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="Enter amount"
                                                    value={fundAmount}
                                                    onChange={(e) => setFundAmount(e.target.value)}
                                                    className="bg-black border border-white/10 rounded-xl px-4 py-6 text-lg text-white font-mono focus:border-white/30 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[#a1a1aa] font-medium tracking-wide">Step 1 Token</Label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {(Object.keys(FUNDING_TOKEN_META) as Array<'credits' | 'usdcx' | 'usad'>).map((token) => (
                                                        <button
                                                            key={token}
                                                            type="button"
                                                            onClick={() => setFundingToken(token)}
                                                            className={`py-2.5 rounded-xl border text-sm font-semibold transition-colors ${fundingToken === token
                                                                ? 'bg-white text-black border-white'
                                                                : 'bg-black text-white border-white/10 hover:border-white/30'
                                                                }`}
                                                        >
                                                            {FUNDING_TOKEN_META[token].label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleFundPayroll}
                                                disabled={isTransacting}
                                                className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-white text-black font-bold text-lg hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                {isTransacting ? (
                                                    'Processing...'
                                                ) : (
                                                    <>
                                                        <ArrowUpCircle className="w-5 h-5" />
                                                        Step 2: Add To Payroll Budget
                                                    </>
                                                )}
                                            </button>
                                            <p className="text-xs text-gray-500 -mt-2">
                                                Step 2 updates the payroll spend limit using ALEO funding.
                                            </p>

                                            <div className="relative py-4">
                                                <div className="absolute inset-0 flex items-center">
                                                    <span className="w-full border-t border-white/10" />
                                                </div>
                                                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
                                                    <span className="bg-[#0a0a0a] px-3 font-semibold text-xs tracking-widest uppercase text-[#a1a1aa]">Guided Funding</span>
                                                </div>
                                            </div>

                                            <p className="text-sm text-[#a1a1aa] mb-4 text-center">
                                                Step 1 prepares private funds for the selected token in this same portal flow.
                                            </p>

                                            <button
                                                onClick={handleConvertPublicToPrivate}
                                                disabled={isTransacting}
                                                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/10 bg-black text-white font-semibold hover:bg-white/5 transition-all active:scale-95"
                                            >
                                                {isTransacting ? (
                                                    'Processing...'
                                                ) : (
                                                    <>
                                                        <ArrowUpCircle className="w-4 h-4" />
                                                        Step 1: Prepare Private {FUNDING_TOKEN_META[fundingToken].label} Funds
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
                                    <GlassCard hover={false} className="max-w-xl border-white/5 bg-[#0a0a0a] p-8 rounded-3xl">
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-[#a1a1aa] font-medium tracking-wide">Employee Wallet</Label>
                                                <Input
                                                    placeholder="aleo1..."
                                                    value={issueRecipient}
                                                    onChange={(e) => setIssueRecipient(e.target.value)}
                                                    className="bg-[#050505] border border-white/10 rounded-xl px-4 py-6 text-white font-mono focus:border-white/30 transition-all"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-[#a1a1aa] font-medium tracking-wide">Pay Currency</Label>
                                                <select
                                                    className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-4 text-white outline-none focus:border-white/30 transition-colors"
                                                    value={currency}
                                                    onChange={(e) => {
                                                        const val = e.target.value as any;
                                                        setCurrency(val);
                                                        if (val !== 'credits' && parseInt(issueVestingDelay) > 0) {
                                                            setIssueVestingDelay('0');
                                                            toast.info("Programmable Vesting is currently only supported for Native ALEO.");
                                                        }
                                                    }}
                                                >
                                                    <option value="credits">Aleo Credits (Native)</option>
                                                    <option value="usdcx">USDCx (Stablecoin)</option>
                                                    <option value="usad">USAD (Stablecoin)</option>
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[#a1a1aa] font-medium tracking-wide">Payout Amount</Label>
                                                    <Input
                                                        type="number"
                                                        placeholder="Tokens"
                                                        value={issueAmount}
                                                        onChange={(e) => setIssueAmount(e.target.value)}
                                                        className="bg-[#050505] border border-white/10 rounded-xl px-4 py-6 text-white text-lg focus:border-white/30 transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[#a1a1aa] font-medium tracking-wide">Optional Delay (Blocks)</Label>
                                                    <Input
                                                        type="number"
                                                        placeholder={currency === 'credits' ? "0 for instant" : "N/A"}
                                                        value={issueVestingDelay}
                                                        disabled={currency !== 'credits'}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setIssueVestingDelay(val);
                                                            if (parseInt(val) > 0 && currency !== 'credits') {
                                                                setCurrency('credits');
                                                                toast.info("Vesting streams automatically converted to Native ALEO.");
                                                            }
                                                        }}
                                                        className={`border-white/10 rounded-xl px-4 py-6 text-white text-lg focus:border-white/30 transition-all ${currency !== 'credits' ? 'bg-black opacity-50 cursor-not-allowed' : 'bg-[#050505]'}`}
                                                    />
                                                    {currency !== 'credits' && (
                                                        <p className="text-[10px] text-[#a1a1aa] mt-1">Delayed release is currently available for native ALEO payouts.</p>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleIssueCertificate}
                                                disabled={isTransacting}
                                                className="w-full flex items-center justify-center gap-2 py-4 px-6 mt-4 rounded-xl bg-[#22c55e] text-black font-bold text-lg hover:bg-[#16a34a] transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                {isTransacting ? 'Processing...' : (
                                                    <>
                                                        <ShieldCheck className="w-5 h-5" />
                                                        Review & Approve Payout
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
                                    {/* WAVE 4 DISCLAIMER */}
                                    <div className="mb-6 p-4 border border-white/10 bg-[#0a0a0a] rounded-xl text-white">
                                        <div className="flex gap-3">
                                            <AlertCircle className="w-5 h-5 text-gray-400 shrink-0" />
                                            <div className="text-sm">
                                                <p className="font-semibold mb-1">Payroll Run Mode</p>
                                                <p className="text-[#a1a1aa]">
                                                    This cycle currently runs each employee payout safely one-by-one. Faster multi-currency and true parallel rollups are being prepared in upcoming Wave 4 updates.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <GlassCard hover={false} className="max-w-2xl border-white/5 bg-[#0a0a0a] rounded-3xl p-8">
                                        <div className="flex justify-between items-center mb-8">
                                            <h3 className="font-bold text-2xl text-white tracking-tight">Payroll Cycle Builder</h3>
                                            {/* Template Loader */}
                                            {Object.keys(templates).length > 0 && (
                                                <select
                                                    className="bg-[#050505] border border-white/10 text-sm rounded-lg px-4 py-2 text-white outline-none focus:border-white/30 transition-colors cursor-pointer"
                                                    onChange={(e) => handleLoadTemplate(e.target.value)}
                                                    value={selectedTemplate}
                                                >
                                                    <option value="">Load Saved Template...</option>
                                                    {Object.keys(templates).map(name => (
                                                        <option key={name} value={name}>{name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>

                                        <div className="mb-8">
                                            <p className="text-xs font-bold tracking-widest uppercase text-[#a1a1aa] mb-3">Quick Start Templates</p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                {HR_TEMPLATE_PRESETS.map((preset) => (
                                                    <button
                                                        key={preset.name}
                                                        onClick={() => handleApplyPreset(preset)}
                                                        className="text-left p-4 rounded-xl border border-white/10 bg-[#050505] hover:border-white/30 transition-colors"
                                                    >
                                                        <p className="text-sm font-semibold text-white">{preset.name}</p>
                                                        <p className="text-xs text-gray-400 mt-1">{preset.hint}</p>
                                                        <p className="text-[11px] text-cyan-400 mt-2">
                                                            Base {preset.baseSalary} credits | Every {preset.interval} days
                                                        </p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6 mb-8">
                                            <div className="space-y-2">
                                                <Label className="text-[#a1a1aa] font-medium tracking-wide">Step 1: Base Salary (credits)</Label>
                                                <Input
                                                    type="number"
                                                    value={baseSalary}
                                                    onChange={(e) => setBaseSalary(e.target.value)}
                                                    className="bg-[#050505] border border-white/10 rounded-xl px-4 py-6 text-white text-lg focus:border-white/30 transition-all text-center font-mono"
                                                />
                                                <p className="text-[11px] text-[#a1a1aa]">
                                                    Example: `0.5` means 0.5 credits for junior level before role multiplier.
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[#a1a1aa] font-medium tracking-wide">Pay Cycle (Days)</Label>
                                                <Input
                                                    type="number"
                                                    value={bulkInterval}
                                                    onChange={(e) => setBulkInterval(e.target.value)}
                                                    className="bg-[#050505] border border-white/10 rounded-xl px-4 py-6 text-white text-lg focus:border-white/30 transition-all text-center font-mono"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-8">
                                            <Label className="text-[#a1a1aa] font-medium tracking-wide">Step 2: Team Roster (Wallet, Role)</Label>
                                            <textarea
                                                placeholder="aleo1...address, Junior&#10;aleo1...address, Senior"
                                                className="bg-[#050505] border border-white/10 rounded-xl w-full h-40 font-mono text-sm p-4 outline-none focus:border-white/30 transition-colors text-white placeholder:text-[#a1a1aa]/50 resize-none"
                                                value={bulkRecipients}
                                                onChange={(e) => setBulkRecipients(e.target.value)}
                                            />
                                        </div>

                                        {batchStatus && (
                                            <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-xl text-sm font-mono text-white relative overflow-hidden">
                                                {batchStatus}
                                            </div>
                                        )}

                                        <div className="flex gap-4 mb-8">
                                            <button
                                                onClick={handleBulkIssue}
                                                disabled={isTransacting}
                                                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-white text-black font-bold text-sm lg:text-base hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
                                                title="Recommended: runs each payout safely in order."
                                            >
                                                {isTransacting ? 'Processing...' : 'Step 3: Run Payroll Cycle'}
                                            </button>
                                            <button
                                                onClick={handlePrivacyBatch}
                                                disabled={isTransacting}
                                                className="flex-1 py-4 px-6 border border-white/10 rounded-xl bg-black text-white font-bold text-sm lg:text-base hover:bg-white/5 transition-all disabled:opacity-50 active:scale-95"
                                                title="Advanced mode with extra privacy routing (beta)."
                                            >
                                                Assisted Privacy Run (Beta)
                                            </button>
                                        </div>

                                        <div className="flex gap-3 items-center pt-8 border-t border-white/5">
                                            <Input
                                                type="text"
                                                placeholder="Save this setup as..."
                                                value={newTemplateName}
                                                onChange={(e) => setNewTemplateName(e.target.value)}
                                                className="bg-[#050505] border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-gray-600 focus:border-white/30"
                                            />
                                            <button
                                                onClick={handleSaveTemplate}
                                                className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all active:scale-95"
                                            >
                                                Save Template
                                            </button>
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            )}

                            {/* Compliance Tab */}
                            {activeTab === 'compliance' && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                    <GlassCard hover={false} className="max-w-xl border-white/5 bg-[#0a0a0a] rounded-3xl p-8">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="p-3 rounded-full bg-white/5 border border-white/10">
                                                <FileCheck className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white tracking-tight">Audit Report Export</h3>
                                                <p className="text-sm text-[#a1a1aa]">Create a privacy-preserving payroll summary for compliance and audit teams.</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-[#a1a1aa] font-medium tracking-wide">Payroll Period Reference (Optional)</Label>
                                                <Input
                                                    value={periodHash}
                                                    onChange={e => setPeriodHash(e.target.value)}
                                                    placeholder="e.g. 1234field"
                                                    className="bg-[#050505] border border-white/10 rounded-xl px-4 py-4 text-white font-mono focus:border-white/30 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[#a1a1aa] font-medium tracking-wide">Team Snapshot Hash (Optional)</Label>
                                                <Input
                                                    value={merkleRoot}
                                                    onChange={e => setMerkleRoot(e.target.value)}
                                                    placeholder="e.g. 5678field"
                                                    className="bg-[#050505] border border-white/10 rounded-xl px-4 py-4 text-white font-mono focus:border-white/30 transition-all"
                                                />
                                            </div>

                                            <button
                                                onClick={handleGenerateReport}
                                                disabled={isTransacting}
                                                className="w-full flex items-center justify-center gap-2 py-4 px-6 mt-4 rounded-xl bg-white text-black font-bold text-lg hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                {isTransacting ? 'Generating...' : (
                                                    <>
                                                        <FileCheck className="w-5 h-5" />
                                                        Generate Audit Report
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            )}

                            {/* Relayer Tab */}
                            {activeTab === 'relayer' && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                    <GlassCard hover={false} className="max-w-2xl border-white/5 bg-[#0a0a0a] rounded-3xl p-8">
                                        <div className="flex items-center gap-4 mb-8 p-6 bg-[#050505] rounded-2xl border border-white/5">
                                            <div className="p-3 rounded-full bg-white/5 border border-white/10">
                                                <Activity className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white tracking-tight">Employee Claim Queue</h3>
                                                <p className="text-sm text-[#a1a1aa]">Review employee claim requests and approve payouts when ready.</p>
                                            </div>
                                        </div>

                                        {pendingPulls.length === 0 ? (
                                            <div className="text-center py-16 border border-white/10 rounded-2xl bg-black">
                                                <Activity className="w-8 h-8 text-[#a1a1aa] mx-auto mb-3" />
                                                <p className="text-[#a1a1aa] font-medium">No employee claim requests waiting right now.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {pendingPulls.map((pull, idx) => {
                                                    const amtStr = pull.certificateRecord.match(/amount:\s*([\d_]+)u64/)?.[1] || "0";
                                                    const amt = parseInt(amtStr.replace(/_/g, ''));
                                                    const displayAmt = (amt / 1000000).toFixed(2);
                                                    return (
                                                        <div key={idx} className="flex flex-col md:flex-row items-center justify-between p-4 bg-[#050505] border border-white/10 rounded-xl">
                                                            <div>
                                                                <p className="text-sm font-bold text-white mb-1"><span className="text-gray-400">Employee:</span> {pull.employee.slice(0, 8)}...{pull.employee.slice(-8)}</p>
                                                                <p className="text-xs text-gray-400">Requested payout: {displayAmt} ALEO</p>
                                                                <p className="text-[10px] text-gray-600 mt-1">Submitted: {new Date(pull.timestamp).toLocaleString()}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleProcessPull(pull, idx)}
                                                                disabled={isTransacting}
                                                                className="mt-4 md:mt-0 px-6 py-2 bg-white text-black hover:bg-gray-200 disabled:opacity-50 text-sm font-bold rounded-lg transition-colors"
                                                            >
                                                                {isTransacting ? "Processing..." : "Approve Request"}
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </GlassCard>
                                </motion.div>
                            )}

                        </div>
                    )}
                </div>
            </main>

            {/* Multisig Modal */}
            {isSigModalOpen && pendingTxPayload && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#050505] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,1)]"
                    >
                        <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Approval Signatures</h2>
                        <p className="text-sm text-gray-400 mb-6 font-light">
                            This payout requires 3 independent approver signatures.
                        </p>

                        <div className="space-y-4 mb-8">
                            {/* Step 1 */}
                            <div className={`p-4 rounded-xl border ${sig1 ? 'border-white/40 bg-white/5' : 'border-white/10 bg-black/50'} transition-all duration-300`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`text-sm font-medium ${sig1 ? 'text-white' : 'text-gray-400'}`}>Approver 1</span>
                                    {sig1 ? <span className="text-xs font-bold text-white">✓ VERIFIED</span> : <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />}
                                </div>
                                <div className="text-xs text-gray-500 font-mono mb-3">{pendingTxPayload.admin1.slice(0, 12)}...</div>
                                <button
                                    className={`w-full py-2.5 text-sm rounded-lg font-medium transition-all duration-300 ${sig1 ? 'bg-white/10 text-white cursor-default' : 'bg-white text-black hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-white disabled:cursor-not-allowed'}`}
                                    disabled={!!sig1 || (!publicKey?.includes(pendingTxPayload.admin1))}
                                    onClick={() => handleSignMessage(1)}
                                >
                                    {sig1 ? 'Signature Captured' : 'Sign Approval'}
                                </button>
                            </div>

                            {/* Step 2 */}
                            <div className={`p-4 rounded-xl border ${sig2 ? 'border-white/40 bg-white/5' : 'border-white/10 bg-black/50'} transition-all duration-300`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`text-sm font-medium ${sig2 ? 'text-white' : 'text-gray-400'}`}>Approver 2</span>
                                    {sig2 ? <span className="text-xs font-bold text-white">✓ VERIFIED</span> : <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />}
                                </div>
                                <div className="text-xs text-gray-500 font-mono mb-3">{pendingTxPayload.admin2.slice(0, 12)}...</div>
                                <button
                                    className={`w-full py-2.5 text-sm rounded-lg font-medium transition-all duration-300 ${sig2 ? 'bg-white/10 text-white cursor-default' : 'bg-white text-black hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-white disabled:cursor-not-allowed'}`}
                                    disabled={!!sig2 || (!publicKey?.includes(pendingTxPayload.admin2))}
                                    onClick={() => handleSignMessage(2)}
                                >
                                    {sig2 ? 'Signature Captured' : 'Sign Approval'}
                                </button>
                            </div>

                            {/* Step 3 */}
                            <div className={`p-4 rounded-xl border ${sig3 ? 'border-white/40 bg-white/5' : 'border-white/10 bg-black/50'} transition-all duration-300`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`text-sm font-medium ${sig3 ? 'text-white' : 'text-gray-400'}`}>Approver 3</span>
                                    {sig3 ? <span className="text-xs font-bold text-white">✓ VERIFIED</span> : <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />}
                                </div>
                                <div className="text-xs text-gray-500 font-mono mb-3">{pendingTxPayload.admin3.slice(0, 12)}...</div>
                                <button
                                    className={`w-full py-2.5 text-sm rounded-lg font-medium transition-all duration-300 ${sig3 ? 'bg-white/10 text-white cursor-default' : 'bg-white text-black hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-white disabled:cursor-not-allowed'}`}
                                    disabled={!!sig3 || (!publicKey?.includes(pendingTxPayload.admin3))}
                                    onClick={() => handleSignMessage(3)}
                                >
                                    {sig3 ? 'Signature Captured' : 'Sign Approval'}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={() => { setIsSigModalOpen(false) }}
                                className="px-5 py-2.5 text-sm font-medium border border-white/20 hover:bg-white/5 hover:border-white/40 text-white rounded-lg transition-all duration-300 flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeIssueSalary}
                                disabled={!sig1 || !sig2 || !sig3 || isTransacting}
                                className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 flex-1 flex items-center justify-center gap-2 ${(!sig1 || !sig2 || !sig3 || isTransacting) ? 'bg-white/20 text-white/50 cursor-not-allowed' : 'bg-white text-black hover:bg-gray-200 shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.5)]'}`}
                            >
                                {isTransacting ? 'Executing...' : 'Execute TX'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    )
}
