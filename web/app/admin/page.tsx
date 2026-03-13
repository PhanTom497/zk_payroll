'use client'

import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useState, useEffect } from 'react'
import { requestTransaction, PROGRAM_ID, fetchBlockHeight, fetchMappingValue, batchProcessTransactions, BatchTransactionItem, waitForTransaction } from '@/lib/zk-utils'
import { motion, AnimatePresence } from "framer-motion"
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
import { toast } from "sonner"
import { cn } from "@/lib/utils"
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
    const [activeTab, setActiveTab] = useState<'dashboard' | 'deposit' | 'authorize' | 'batch' | 'compliance' | 'relayer'>('dashboard')

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
            toast.success("Initialization Started! Waiting for confirmation...")

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
                        toast.success("System Initialized Successfully!")
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

    const handleProcessPull = async (pullReq: any, index: number) => {
        if (!publicKey || !requestRecords) return
        setIsTransacting(true)
        try {
            toast.info("1/3: Locating Admin TreasuryRecord...")
            const records = await requestRecords(PROGRAM_ID, true)
            const treasuryRec = (records as any[]).filter((rec: any) =>
                !rec.spent && rec.recordName === 'TreasuryRecord'
            ).pop()

            if (!treasuryRec) {
                toast.error("No active TreasuryRecord found. Did you Deposit Funds?")
                setIsTransacting(false)
                return
            }
            let treasuryStr = treasuryRec.plaintext || treasuryRec.recordPlaintext || treasuryRec.ciphertext;
            if (typeof treasuryStr === 'string') treasuryStr = treasuryStr.replace(/\n/g, '').replace(/ /g, '');

            toast.info("2/3: Locating Admin's Native Credits backing the Treasury...")
            const creditRecords = await requestRecords('credits.aleo', true)
            const certStr = pullReq.certificateRecord.replace(/\n/g, '').replace(/ /g, '');
            const amountMatch = certStr.match(/amount:([\d_]+)u64/);
            const reqAmount = amountMatch ? parseInt(amountMatch[1].replace(/_/g, '')) : 0;

            let payRecordStr: string | null = null;
            if (creditRecords && Array.isArray(creditRecords)) {
                for (const r of (creditRecords as any[])) {
                    if (r.spent) continue;
                    const rAmt = getMicrocredits(r);
                    if (rAmt >= reqAmount) {
                        let text = r.plaintext || r.recordPlaintext || r.ciphertext;
                        if (typeof text === 'string') {
                            payRecordStr = text.replace(/\\n/g, '').replace(/ /g, '');
                            break;
                        }
                    }
                }
            }
            if (!payRecordStr) {
                toast.error(`Insufficient Native Credits to cover ${reqAmount / 1_000_000} ALEO payout.`)
                setIsTransacting(false)
                return
            }

            const paymentMatch = certStr.match(/payment_id:([a-zA-Z0-9_\.]+)/);
            let paymentId = paymentMatch ? paymentMatch[1] : null;

            if (!paymentId) {
                toast.error("Invalid Certificate: Missing payment_id. Are you using an old v20/v21 contract format?");
                setIsTransacting(false);
                return;
            }
            paymentId = paymentId.replace(/\.private|\.public/g, '');

            toast.info("3/3: Executing Treasury Pull (Employee Claim)...")
            const txId = await requestTransaction(
                wallet?.adapter!,
                publicKey,
                PROGRAM_ID,
                'claim_salary',
                [treasuryStr, payRecordStr, pullReq.employee, reqAmount + "u64", paymentId],
                600_000
            )

            toast.success("Pull Request Processed Successfully! Tx: " + txId)
            const newPulls = [...pendingPulls]
            newPulls.splice(index, 1)
            setPendingPulls(newPulls)
            localStorage.setItem('pending_pull_claims', JSON.stringify(newPulls))

        } catch (err: any) {
            console.error("Relayer Error:", err)
            toast.error("Failed handling pull: " + err.message)
        } finally {
            setIsTransacting(false)
        }
    }

    const handleFundPayroll = async () => {
        if (!publicKey || !fundAmount) return
        setIsTransacting(true)
        try {
            toast.info("1/2: Hunting for Private Aleo Credits...")
            const records = await requestRecords('credits.aleo', true)

            const microcredits = Math.floor(parseFloat(fundAmount) * 1_000_000)

            let payRecordStr: string | null = null;
            if (records && Array.isArray(records)) {
                for (const r of (records as any[])) {
                    if (r.spent) continue;
                    const rAmt = getMicrocredits(r);
                    if (rAmt >= microcredits) {
                        let text = r.plaintext || r.recordPlaintext || r.ciphertext;
                        if (typeof text === 'string') {
                            payRecordStr = text.replace(/\\n/g, '').replace(/ /g, '');
                            break;
                        }
                    }
                }
            }
            if (!payRecordStr) {
                toast.error(`No private Aleo record found with >= ${fundAmount} Credits. Please convert public to private first!`)
                setIsTransacting(false)
                return
            }

            toast.info("2/2: Generating Treasury Pool Record...")

            const txId = await requestTransaction(
                wallet?.adapter!,
                publicKey,
                PROGRAM_ID,
                'fund_payroll',
                [payRecordStr, publicKey, microcredits + 'u64', '1field'],
                600_000
            )
            toast.success("Treasury Pool Generated! Tx: " + txId)
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
            const microcredits = parseInt(fundAmount) * 1_000_000
            const txId = await requestTransaction(
                wallet?.adapter!,
                publicKey,
                'credits.aleo',
                'transfer_public_to_private',
                [publicKey, microcredits + 'u64'],
                300_000
            )
            toast.success("Conversion request sent! Your private balance will update soon. Tx: " + txId)
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

            toast.info("Requesting 32-byte strict payload from SDK Server...");

            const serverRes = await fetch('/api/get-address-bytes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: adminAddressToSign })
            });
            const addrData = await serverRes.json();
            if (!serverRes.ok) throw new Error(addrData.error || "Failed to fetch Address bytes");

            const msgBytes = new Uint8Array(addrData.bytes);

            toast.info("Requesting Signature over 32-byte Native Payload...");
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

            toast.success(`Admin ${step} Signature Captured!`)
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
            toast.info("Pushing Salary Transaction to Network...")

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
            toast.success("Salary Pushed Successfully! Transaction ID: " + txId)

            toast.info("Waiting for Wallet Synchronization to refresh Next.js state...")
            setTimeout(() => {
                toast.success("State synchronized. You're ready for the next tx!")
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
            toast.error("Please provide recipient and amount.")
            return
        }
        setIsTransacting(true)
        try {
            toast.info("1/3: Fetching SpentRecord...")
            // 1. Fetch Spent Record automatically
            const ourRecords = await (wallet as any)?.adapter?.requestRecords(PROGRAM_ID, true)
            const spentRec = (ourRecords as any[])?.filter((rec: any) =>
                !rec.spent && (rec.recordName === 'SpentRecord' || (rec.plaintext && rec.plaintext.includes('total_spent')))
            ).pop()

            if (!spentRec) {
                toast.error("No active SpentRecord found. Did you initialize the system?")
                setIsTransacting(false)
                return
            }

            let spentRecordStr = spentRec.plaintext || spentRec.recordPlaintext;
            if (!spentRecordStr && spentRec.ciphertext) spentRecordStr = spentRecordStr.replace(/\\n/g, '').replace(/ /g, '');

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

                toast.info(`Issuing Vesting Record locked until block ${unlockHeight}...`)

                await requestTransaction(
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
                toast.success("Vesting Record Issued Successfully!")
                setIssueRecipient('')
                setIssueAmount('')
                setIssueVestingDelay('0')
                setIsTransacting(false)
                return;
            }

            toast.info(`2/3: Searching for ${currency.toUpperCase()} Record...`)

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
                toast.error(`UTXO Layout Error: You have funds, but Aleo requires a single unbroken record >= ${issueAmount} ${currency.toUpperCase()} to pay this.`)
                setIsTransacting(false)
                return
            }

            toast.info("3/3: Preparing Multisig Payload...")

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
                toast.error("Could not fetch Admin addresses from contract. Is it initialized?")
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
            toast.success("Ready for Signatures!")
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
                    toast.error("No valid 'address, role' pairs found. Please check format.")
                } else {
                    toast.error("Input is empty.")
                }
                setIsTransacting(false)
                return
            }

            let successCount = 0;
            let failureCount = 0;

            for (let idx = 0; idx < parsedRecipients.length; idx++) {
                const { addr, amountMicrocredits, role } = parsedRecipients[idx];
                
                setBatchStatus(`[${idx + 1}/${parsedRecipients.length}] Syncing UTXO state for sequential transaction...`)
                
                // 1. Fetch Spent Record (Fresh for this iteration)
                const ourRecords = await (wallet as any)?.adapter?.requestRecords(PROGRAM_ID, true)
                const spentRec = (ourRecords as any[])?.filter((rec: any) =>
                    !rec.spent && (rec.recordName === 'SpentRecord' || (rec.plaintext && rec.plaintext.includes('total_spent')))
                ).pop()

                if (!spentRec) {
                    throw new Error("No active SpentRecord found. UTXO chain is broken or uninitialized.");
                }

                let spentRecordStr = spentRec.plaintext || spentRec.recordPlaintext;
                if (!spentRecordStr && spentRec.ciphertext) spentRecordStr = spentRecordStr.replace(/\\n/g, '').replace(/ /g, '');

                const ts = Math.floor(Date.now() / 1000);
                const rPart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
                const paymentId = `1${ts}${rPart}field`;
                const startH = currentHeight > 0 ? currentHeight : 0;

                setBatchStatus(`[${idx + 1}/${parsedRecipients.length}] Broadcasting tx to Aleo network...`)

                const txId = await requestTransaction(
                    wallet?.adapter!,
                    publicKey,
                    PROGRAM_ID,
                    'issue_vested_salary',
                    [
                        spentRecordStr,
                        addr,
                        amountMicrocredits + 'u64', 
                        paymentId,
                        startH + 'u32'
                    ],
                    300_000 // 0.3 credits per tx
                );
                
                setBatchStatus(`[${idx + 1}/${parsedRecipients.length}] Validating transaction confirmation on chain...`)
                const confirmed = await waitForTransaction(txId);
                
                if (confirmed) {
                    successCount++;
                } else {
                     throw new Error(`Transaction ${txId} timed out or failed confirmation.`);
                }
            }

            let msg = `Execution Complete.\nSuccess: ${successCount}\nFailed: ${failureCount}`
            toast.success(msg)
            setBatchStatus(msg)

        } catch (err: any) {
            console.error(err)
            setBatchStatus("Error: " + err.message)
            toast.error("Execution Error: " + err.message)
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

            let successCount = 0;
            let failureCount = 0;

            for (let idx = 0; idx < allRecipients.length; idx++) {
                const { addr, amount, role } = allRecipients[idx];
                
                setBatchStatus(`[${idx + 1}/${allRecipients.length}] Syncing UTXO state for ZK batch...`)
                
                // Fetch unspent record
                const ourRecords = await (wallet as any)?.adapter?.requestRecords(PROGRAM_ID, true)
                const spentRec = (ourRecords as any[])?.filter((rec: any) =>
                    !rec.spent && (rec.recordName === 'SpentRecord' || (rec.plaintext && rec.plaintext.includes('total_spent')))
                ).pop()

                if (!spentRec) {
                    throw new Error("No active SpentRecord found. UTXO chain is broken or uninitialized.");
                }

                let spentRecordStr = spentRec.plaintext || spentRec.recordPlaintext;
                if (!spentRecordStr && spentRec.ciphertext) spentRecordStr = spentRecordStr.replace(/\\n/g, '').replace(/ /g, '');

                const ts = Math.floor(Date.now() / 1000);
                const rPart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
                const paymentId = `9${ts}${rPart}field`;
                const startH = currentHeight > 0 ? currentHeight : 0;

                setBatchStatus(`[${idx + 1}/${allRecipients.length}] Submitting to network (SnarkVM fallback mode)...`)

                const txId = await requestTransaction(
                    wallet?.adapter!,
                    publicKey,
                    PROGRAM_ID,
                    'issue_vested_salary',
                    [
                        spentRecordStr,
                        addr,
                        amount, 
                        paymentId,
                        startH + 'u32'
                    ],
                    300_000 
                );
                
                setBatchStatus(`[${idx + 1}/${allRecipients.length}] Awaiting final block confirmation...`)
                const confirmed = await waitForTransaction(txId);
                
                if (confirmed) {
                    successCount++;
                } else {
                     throw new Error(`Transaction ${txId} timed out or failed confirmation.`);
                }
            }

            let msg = `ZK Batch Execution Complete.\nSuccess: ${successCount}\nFailed: ${failureCount}`;
            toast.success(msg);
            setBatchStatus(msg);

        } catch (err: any) {
            console.error(err);
            setBatchStatus("Error: " + err.message);
            toast.error("Execution Error: " + err.message);
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
                toast.error("No active SpentRecord found for this admin.")
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

    const navItems = [
        { id: 'dashboard', title: "Dashboard", icon: LayoutDashboard },
        { id: 'deposit', title: "Deposit Fund", icon: Wallet },
        { id: 'authorize', title: "Authorize Payroll", icon: ShieldCheck },
        { id: 'batch', title: "Batch Run", icon: Layers },
        { id: 'relayer', title: "Treasury Relayer", icon: Activity },
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
                                                        <p className="text-xs text-muted-foreground mb-1">Max Spending Limit</p>
                                                        <div className="flex items-baseline gap-2">
                                                            <p className="text-2xl font-bold text-foreground font-mono">{cleanValue(budget, true)}</p>
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
                                                <p className="text-lg font-bold text-foreground font-mono">{cleanValue(budget, true)} ALEO</p>
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

                                            <div className="relative py-4">
                                                <div className="absolute inset-0 flex items-center">
                                                    <span className="w-full border-t border-white/10" />
                                                </div>
                                                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
                                                    <span className="bg-black px-2 text-muted-foreground">Self-Funding Helper</span>
                                                </div>
                                            </div>

                                            <p className="text-xs text-muted-foreground mb-4">
                                                Push payments require private records. If you only have public Aleo credits, you can convert them to a private record here.
                                            </p>

                                            <button
                                                onClick={handleConvertPublicToPrivate}
                                                disabled={isTransacting}
                                                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 font-medium hover:bg-blue-500/20 transition-all active:scale-95"
                                            >
                                                {isTransacting ? (
                                                    'Processing...'
                                                ) : (
                                                    <>
                                                        <ArrowUpCircle className="w-4 h-4" />
                                                        Convert Public to Private
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

                                            <div className="space-y-2">
                                                <Label>Currency</Label>
                                                <select
                                                    className="w-full bg-black border border-white/10 rounded-md p-2 text-sm text-foreground outline-none focus:border-white transition-colors"
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
                                                    <Label>Salary Amount</Label>
                                                    <Input
                                                        type="number"
                                                        placeholder="Tokens"
                                                        value={issueAmount}
                                                        onChange={(e) => setIssueAmount(e.target.value)}
                                                        className="bg-white/5 border-white/10"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Vesting Delay (Blocks)</Label>
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
                                                        className={`border-white/10 ${currency !== 'credits' ? 'bg-white/5 opacity-50 cursor-not-allowed' : 'bg-white/5'}`}
                                                    />
                                                    {currency !== 'credits' && (
                                                        <p className="text-[10px] text-gray-500 mt-1">Vesting requires Native ALEO Credits.</p>
                                                    )}
                                                </div>
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
                                    {/* WAVE 4 DISCLAIMER */}
                                    <div className="mb-6 p-4 border border-white/20 bg-white/5 rounded-xl">
                                        <div className="flex gap-3">
                                            <AlertCircle className="w-5 h-5 text-white shrink-0" />
                                            <div className="text-sm text-gray-300">
                                                <p className="font-semibold text-white mb-1">Wave 4 Roadmap: Advanced Batching</p>
                                                <p className="opacity-80">
                                                    Current execution is limited to sequential Aleo Credit Vesting. <strong>USDCx & USAD Bulk Transfers, Multisig Batch Authorization, and True ZK Parallel Rollups</strong> are actively being developed for Wave 4.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

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
                                                className="glow-btn flex-1 flex items-center justify-center gap-2 text-sm font-medium"
                                                title="Sequentially process each employee on the blockchain one by one."
                                            >
                                                Sequential Execution (1-by-1)
                                            </button>
                                            <button
                                                onClick={handlePrivacyBatch}
                                                disabled={isTransacting}
                                                className="flex-1 py-3 border border-white/20 rounded-lg text-white hover:bg-white/5 transition disabled:opacity-50 text-sm font-medium"
                                                title="Process employees using a native ZK rollup batch (Currently falls back to Sequential due to SnarkVM constraints)."
                                            >
                                                ZK Batch Execution (Beta)
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

                            {/* Relayer Tab */}
                            {activeTab === 'relayer' && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                    <GlassCard hover={false} className="max-w-2xl">
                                        <div className="flex items-center gap-3 mb-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                            <Activity className="w-6 h-6 text-blue-400" />
                                            <div>
                                                <h3 className="text-lg font-bold text-white">Treasury Relayer</h3>
                                                <p className="text-xs text-blue-200">Automatically cycle Treasury UTXOs to fulfill asynchronous Pull Requests from Employee Certificates.</p>
                                            </div>
                                        </div>

                                        {pendingPulls.length === 0 ? (
                                            <div className="text-center py-10 border border-dashed border-white/10 rounded-xl">
                                                <p className="text-gray-500 text-sm">No pending pull requests in queue.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {pendingPulls.map((pull, idx) => {
                                                    const amtStr = pull.certificateRecord.match(/amount:\s*([\d_]+)u64/)?.[1] || "0";
                                                    const amt = parseInt(amtStr.replace(/_/g, ''));
                                                    const displayAmt = (amt / 1000000).toFixed(2);
                                                    return (
                                                        <div key={idx} className="flex flex-col md:flex-row items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                                                            <div>
                                                                <p className="text-sm font-bold text-white mb-1"><span className="text-gray-400">Employee:</span> {pull.employee.slice(0, 8)}...{pull.employee.slice(-8)}</p>
                                                                <p className="text-xs text-gray-400">Request: {displayAmt} ALEO Credits</p>
                                                                <p className="text-[10px] text-gray-600 mt-1">Submitted: {new Date(pull.timestamp).toLocaleString()}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleProcessPull(pull, idx)}
                                                                disabled={isTransacting}
                                                                className="mt-4 md:mt-0 px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
                                                            >
                                                                {isTransacting ? "Processing..." : "Authorize Pull"}
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
                        <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Multisig Authorization</h2>
                        <p className="text-sm text-gray-400 mb-6 font-light">
                            This transaction requires 3 independent Administrator signatures to proceed.
                        </p>

                        <div className="space-y-4 mb-8">
                            {/* Step 1 */}
                            <div className={`p-4 rounded-xl border ${sig1 ? 'border-white/40 bg-white/5' : 'border-white/10 bg-black/50'} transition-all duration-300`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`text-sm font-medium ${sig1 ? 'text-white' : 'text-gray-400'}`}>Admin 1</span>
                                    {sig1 ? <span className="text-xs font-bold text-white">✓ VERIFIED</span> : <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />}
                                </div>
                                <div className="text-xs text-gray-500 font-mono mb-3">{pendingTxPayload.admin1.slice(0, 12)}...</div>
                                <button
                                    className={`w-full py-2.5 text-sm rounded-lg font-medium transition-all duration-300 ${sig1 ? 'bg-white/10 text-white cursor-default' : 'bg-white text-black hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-white disabled:cursor-not-allowed'}`}
                                    disabled={!!sig1 || (!publicKey?.includes(pendingTxPayload.admin1))}
                                    onClick={() => handleSignMessage(1)}
                                >
                                    {sig1 ? 'Signature Captured' : 'Sign Payload'}
                                </button>
                            </div>

                            {/* Step 2 */}
                            <div className={`p-4 rounded-xl border ${sig2 ? 'border-white/40 bg-white/5' : 'border-white/10 bg-black/50'} transition-all duration-300`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`text-sm font-medium ${sig2 ? 'text-white' : 'text-gray-400'}`}>Admin 2</span>
                                    {sig2 ? <span className="text-xs font-bold text-white">✓ VERIFIED</span> : <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />}
                                </div>
                                <div className="text-xs text-gray-500 font-mono mb-3">{pendingTxPayload.admin2.slice(0, 12)}...</div>
                                <button
                                    className={`w-full py-2.5 text-sm rounded-lg font-medium transition-all duration-300 ${sig2 ? 'bg-white/10 text-white cursor-default' : 'bg-white text-black hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-white disabled:cursor-not-allowed'}`}
                                    disabled={!!sig2 || (!publicKey?.includes(pendingTxPayload.admin2))}
                                    onClick={() => handleSignMessage(2)}
                                >
                                    {sig2 ? 'Signature Captured' : 'Sign Payload'}
                                </button>
                            </div>

                            {/* Step 3 */}
                            <div className={`p-4 rounded-xl border ${sig3 ? 'border-white/40 bg-white/5' : 'border-white/10 bg-black/50'} transition-all duration-300`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`text-sm font-medium ${sig3 ? 'text-white' : 'text-gray-400'}`}>Admin 3</span>
                                    {sig3 ? <span className="text-xs font-bold text-white">✓ VERIFIED</span> : <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />}
                                </div>
                                <div className="text-xs text-gray-500 font-mono mb-3">{pendingTxPayload.admin3.slice(0, 12)}...</div>
                                <button
                                    className={`w-full py-2.5 text-sm rounded-lg font-medium transition-all duration-300 ${sig3 ? 'bg-white/10 text-white cursor-default' : 'bg-white text-black hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-white disabled:cursor-not-allowed'}`}
                                    disabled={!!sig3 || (!publicKey?.includes(pendingTxPayload.admin3))}
                                    onClick={() => handleSignMessage(3)}
                                >
                                    {sig3 ? 'Signature Captured' : 'Sign Payload'}
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
