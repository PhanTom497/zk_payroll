'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, Shield, Cpu, Map as MapIcon, ChevronRight, ArrowRight, Eye, Lock, Zap, Layers, Database, Clock, Users, FileCheck, Globe } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import WireframeBackground from "@/components/WireframeBackground";

const tabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'architecture', label: 'Architecture', icon: Cpu },
    { id: 'security', label: 'Security Model', icon: Shield },
    { id: 'roadmap', label: 'Future Plans', icon: MapIcon },
];

export default function DocsPage() {
    const [activeTab, setActiveTab] = useState('overview');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="relative min-h-screen bg-black text-white selection:bg-white/30 overflow-hidden font-sans">
            <WireframeBackground />

            {/* Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </Link>
                    <div className="h-4 w-px bg-white/10" />
                    <span className="text-sm font-bold tracking-tight">Documentation</span>
                </div>
            </nav>

            <main className="relative z-10 pt-32 pb-24 px-6 max-w-7xl mx-auto flex flex-col lg:flex-row gap-12">

                {/* Sidebar Navigation */}
                <aside className="lg:w-64 shrink-0">
                    <div className="sticky top-32 space-y-1">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-3">
                            Contents
                        </h3>
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-300 ${activeTab === tab.id
                                    ? 'bg-white text-black font-medium shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                                    : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </div>
                                {activeTab === tab.id && <ChevronRight className="w-4 h-4" />}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-12"
                        >

                            {/* ============================================ */}
                            {/* OVERVIEW TAB */}
                            {/* ============================================ */}
                            {activeTab === 'overview' && (
                                <div className="space-y-8">
                                    <div className="space-y-4 border-b border-white/10 pb-8">
                                        <h1 className="text-4xl md:text-5xl font-black tracking-tight">ZK Payroll Overview</h1>
                                        <p className="text-xl text-muted-foreground">Enterprise-grade, privacy-preserving DAO payments built natively on the Aleo Network.</p>
                                    </div>

                                    <div className="prose prose-invert prose-p:text-gray-400 prose-headings:text-white max-w-none">
                                        <h2>The Compliance-Privacy Paradox</h2>
                                        <p>
                                            Public blockchains expose all transaction data by design. For DAO payroll, this creates a fundamental conflict: competitors can analyze your compensation structure, salaries become publicly searchable, and payment timing reveals organizational cash flow and burn rates.
                                        </p>
                                        <p>
                                            Yet organizations still need to prove to auditors and stakeholders that they are solvent — that they haven&apos;t overspent their approved budget. Traditional public chains force you to choose between privacy and compliance.
                                        </p>
                                        <p>
                                            <strong>ZK Payroll eliminates this tradeoff</strong> by leveraging Aleo&apos;s zero-knowledge proof system. Every salary transaction is fully encrypted and private, while a public mathematical budget ceiling is enforced on-chain. Auditors can verify solvency through cryptographic proofs without seeing any individual salary data.
                                        </p>

                                        {/* Privacy Matrix */}
                                        <div className="my-12 p-6 rounded-xl border border-white/10 bg-white/5">
                                            <h3 className="text-lg font-bold mb-2 mt-0 border-b border-white/10 pb-2">Privacy Matrix: Who Sees What?</h3>
                                            <p className="text-xs text-muted-foreground mb-4 mt-0">Through cryptographic selective disclosure, ZK Payroll restricts data visibility based on participant role.</p>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead>
                                                        <tr className="border-b border-white/10 text-muted-foreground">
                                                            <th className="py-3 px-4 font-medium">Data Point</th>
                                                            <th className="py-3 px-4 font-medium">Public Observer</th>
                                                            <th className="py-3 px-4 font-medium">Auditor</th>
                                                            <th className="py-3 px-4 font-medium">Admin</th>
                                                            <th className="py-3 px-4 font-medium">Employee</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        <tr>
                                                            <td className="py-3 px-4">Budget Ceiling</td>
                                                            <td className="py-3 px-4 text-white">✅ Visible</td>
                                                            <td className="py-3 px-4 text-white">✅ Visible</td>
                                                            <td className="py-3 px-4 text-white">✅ Visible</td>
                                                            <td className="py-3 px-4 text-muted-foreground">—</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="py-3 px-4">Total Spent</td>
                                                            <td className="py-3 px-4 text-muted-foreground">❌ Hidden</td>
                                                            <td className="py-3 px-4 text-white">✅ ZK-Verified</td>
                                                            <td className="py-3 px-4 text-white">✅ Visible</td>
                                                            <td className="py-3 px-4 text-muted-foreground">—</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="py-3 px-4">Individual Salaries</td>
                                                            <td className="py-3 px-4 text-muted-foreground">❌ Hidden</td>
                                                            <td className="py-3 px-4 text-muted-foreground">❌ Hidden</td>
                                                            <td className="py-3 px-4 text-white">✅ Local History</td>
                                                            <td className="py-3 px-4 text-white">✅ Own Only</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="py-3 px-4">Recipient Identities</td>
                                                            <td className="py-3 px-4 text-muted-foreground">❌ Hidden</td>
                                                            <td className="py-3 px-4 text-muted-foreground">❌ Hidden</td>
                                                            <td className="py-3 px-4 text-white">✅ Visible</td>
                                                            <td className="py-3 px-4 text-white">✅ Own Only</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="py-3 px-4">Payment Timing</td>
                                                            <td className="py-3 px-4 text-muted-foreground">❌ Hidden</td>
                                                            <td className="py-3 px-4 text-muted-foreground">❌ Hidden</td>
                                                            <td className="py-3 px-4 text-white">✅ Visible</td>
                                                            <td className="py-3 px-4 text-white">✅ Own Only</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="py-3 px-4">Compliance Proof</td>
                                                            <td className="py-3 px-4 text-white">✅ ZK-Proven</td>
                                                            <td className="py-3 px-4 text-white">✅ ZK-Proven</td>
                                                            <td className="py-3 px-4 text-white">✅ ZK-Proven</td>
                                                            <td className="py-3 px-4 text-muted-foreground">—</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <h2>Core Features</h2>

                                        <div className="grid md:grid-cols-2 gap-4 my-8 not-prose">
                                            <div className="p-5 rounded-xl border border-white/10 bg-white/[0.03]">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><Users className="w-4 h-4" /></div>
                                                    <h4 className="font-bold text-sm">Enterprise Multi-Sig</h4>
                                                </div>
                                                <p className="text-xs text-gray-400 leading-relaxed">Require M-of-N wallet signatures for all payroll operations. Configured during DAO initialization and enforced cryptographically before any transaction reaches the network.</p>
                                            </div>

                                            <div className="p-5 rounded-xl border border-white/10 bg-white/[0.03]">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><Zap className="w-4 h-4" /></div>
                                                    <h4 className="font-bold text-sm">Zero-Gas Treasury Relayer</h4>
                                                </div>
                                                <p className="text-xs text-gray-400 leading-relaxed">Employees execute gasless Pull Requests which are fulfilled asynchronously by the Admin&apos;s Relayer. Contributors never pay Aleo network fees — the organization absorbs gas as an operational cost.</p>
                                            </div>

                                            <div className="p-5 rounded-xl border border-white/10 bg-white/[0.03]">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><Layers className="w-4 h-4" /></div>
                                                    <h4 className="font-bold text-sm">ARC-20 Stablecoin Support</h4>
                                                </div>
                                                <p className="text-xs text-gray-400 leading-relaxed">Native cross-program integration with Aleo&apos;s <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">test_usdcx_stablecoin.aleo</code> and <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">test_usad_stablecoin.aleo</code> for fiat-pegged salary disbursements.</p>
                                            </div>

                                            <div className="p-5 rounded-xl border border-white/10 bg-white/[0.03]">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><Clock className="w-4 h-4" /></div>
                                                    <h4 className="font-bold text-sm">Time-Delayed Vesting</h4>
                                                </div>
                                                <p className="text-xs text-gray-400 leading-relaxed">Cryptographically locked native Aleo credit grants that unlock only after a predefined <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">block.height</code> is reached. Enforced at the ZK circuit level.</p>
                                            </div>

                                            <div className="p-5 rounded-xl border border-white/10 bg-white/[0.03]">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><Database className="w-4 h-4" /></div>
                                                    <h4 className="font-bold text-sm">Sequential ZK Batching</h4>
                                                </div>
                                                <p className="text-xs text-gray-400 leading-relaxed">Automated UTXO-chain polling executes multiple sequential salary issuances without double-spend collisions. Each transaction waits for confirmation before proceeding.</p>
                                            </div>

                                            <div className="p-5 rounded-xl border border-white/10 bg-white/[0.03]">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><FileCheck className="w-4 h-4" /></div>
                                                    <h4 className="font-bold text-sm">ZK Audit Reports</h4>
                                                </div>
                                                <p className="text-xs text-gray-400 leading-relaxed">Generate cryptographic compliance proofs with Merkle root commitments, recipient counts, and total spent — selectively disclosed to auditors without revealing individual data.</p>
                                            </div>
                                        </div>

                                        <h2>Program Details</h2>
                                        <div className="not-prose my-6 p-5 rounded-xl border border-white/10 bg-white/[0.03]">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-muted-foreground text-xs uppercase tracking-wider">Smart Contract</span>
                                                    <p className="font-mono text-white mt-1">baba_zk_payroll_v22.aleo</p>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground text-xs uppercase tracking-wider">Language</span>
                                                    <p className="font-mono text-white mt-1">Leo</p>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground text-xs uppercase tracking-wider">Network</span>
                                                    <p className="font-mono text-white mt-1">Aleo Testnet</p>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground text-xs uppercase tracking-wider">Dependencies</span>
                                                    <p className="font-mono text-white mt-1">credits.aleo, USDCx, USAD</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ============================================ */}
                            {/* ARCHITECTURE TAB */}
                            {/* ============================================ */}
                            {activeTab === 'architecture' && (
                                <div className="space-y-8">
                                    <div className="space-y-4 border-b border-white/10 pb-8">
                                        <h1 className="text-4xl md:text-5xl font-black tracking-tight">Architecture</h1>
                                        <p className="text-xl text-muted-foreground">Dual payment models designed for privacy, flexibility, and scale.</p>
                                    </div>

                                    <div className="prose prose-invert prose-p:text-gray-400 max-w-none">
                                        <h2>System Overview</h2>
                                        <p>ZK Payroll is built as a Next.js 14 frontend communicating with a Leo smart contract deployed on the Aleo Testnet. The architecture supports two fundamentally different payment flows, each optimized for distinct operational requirements.</p>

                                        <h2>Payment Model 1: Push (Direct Settlement)</h2>
                                        <div className="grid md:grid-cols-1 gap-6 my-8 not-prose">
                                            <GlassCard hover={false} className="p-6 border-white/20">
                                                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                                    Direct Push Payments
                                                </h3>
                                                <p className="text-sm text-muted-foreground mb-4">Immediate settlement for native Aleo credits and ARC-20 stablecoins (USDCx, USAD).</p>
                                                <div className="grid md:grid-cols-3 gap-4">
                                                    <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                                                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Step 1: Authorization</p>
                                                        <p className="text-sm text-gray-300">Admin signs payment via the Multi-Sig authorization modal. All M-of-N wallet signatures are verified cryptographically.</p>
                                                    </div>
                                                    <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                                                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Step 2: Execution</p>
                                                        <p className="text-sm text-gray-300">The smart contract executes <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">issue_salary</code>, <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">issue_salary_usdcx</code>, or <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">issue_salary_usad</code> and verifies the budget ceiling.</p>
                                                    </div>
                                                    <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                                                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Step 3: Delivery</p>
                                                        <p className="text-sm text-gray-300">A private <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">SalaryRecord</code> is delivered directly to the employee&apos;s wallet. Funds appear instantly.</p>
                                                    </div>
                                                </div>
                                                <div className="mt-4 p-3 bg-white/5 rounded-lg text-xs text-gray-400">
                                                    <strong className="text-white">Use Cases:</strong> Independent contractors, one-off bonuses, immediate stablecoin settlements, any payment where the admin wants direct control.
                                                </div>
                                            </GlassCard>
                                        </div>

                                        <h2>Payment Model 2: Pull (Zero-Gas Treasury Relayer)</h2>
                                        <div className="grid md:grid-cols-1 gap-6 my-8 not-prose">
                                            <GlassCard hover={false} className="p-6">
                                                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-white/40" />
                                                    Gasless Pull Model
                                                </h3>
                                                <p className="text-sm text-muted-foreground mb-4">Time-locked vesting with asynchronous employee claiming and zero gas costs for contributors.</p>
                                                <div className="space-y-3">
                                                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                                                        <span className="text-xs font-mono text-muted-foreground mt-0.5 shrink-0">01</span>
                                                        <div>
                                                            <p className="text-sm text-white font-medium">Admin issues a VestingRecord</p>
                                                            <p className="text-xs text-gray-400 mt-1">The admin calls <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">issue_vested_salary</code> with a specified <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">unlock_height</code>. The employee receives a time-locked record.</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                                                        <span className="text-xs font-mono text-muted-foreground mt-0.5 shrink-0">02</span>
                                                        <div>
                                                            <p className="text-sm text-white font-medium">Employee waits for block height</p>
                                                            <p className="text-xs text-gray-400 mt-1">The Employee Portal shows a live block countdown timer. The funds are mathematically inaccessible until the Aleo network reaches the target block.</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                                                        <span className="text-xs font-mono text-muted-foreground mt-0.5 shrink-0">03</span>
                                                        <div>
                                                            <p className="text-sm text-white font-medium">Employee claims the vesting</p>
                                                            <p className="text-xs text-gray-400 mt-1">Once the countdown reaches zero, the employee calls <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">claim_vested</code>. The ZK circuit asserts <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">block.height &gt;= unlock_height</code> and converts the VestingRecord into a SalaryCertificate.</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                                                        <span className="text-xs font-mono text-muted-foreground mt-0.5 shrink-0">04</span>
                                                        <div>
                                                            <p className="text-sm text-white font-medium">Zero-Gas Pull Request</p>
                                                            <p className="text-xs text-gray-400 mt-1">The employee clicks Withdraw — <strong>no wallet popup appears</strong>. A gasless off-chain pull request is sent to the Admin&apos;s Treasury Relayer.</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                                                        <span className="text-xs font-mono text-muted-foreground mt-0.5 shrink-0">05</span>
                                                        <div>
                                                            <p className="text-sm text-white font-medium">Admin fulfills via Treasury Relayer</p>
                                                            <p className="text-xs text-gray-400 mt-1">The Admin sees the pending request in the Treasury Relayer tab, authorizes it with Multi-Sig, and <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">claim_salary</code> routes native Aleo credits from the treasury to the employee.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 p-3 bg-white/5 rounded-lg text-xs text-gray-400">
                                                    <strong className="text-white">Use Cases:</strong> Core team salaries, recurring payments, cliff/vesting schedules, maximum employee privacy where timing of claim is fully private.
                                                </div>
                                            </GlassCard>
                                        </div>

                                        <h2>Key Smart Contract Records</h2>
                                        <div className="space-y-3 not-prose text-sm text-gray-300">
                                            <div className="p-4 border border-white/5 bg-white/5 rounded-lg">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="font-mono text-white"><span className="text-muted-foreground">record</span> SpentRecord</div>
                                                    <span className="text-xs text-muted-foreground">Owner: Admin</span>
                                                </div>
                                                <p className="text-xs text-gray-400">Tracks cumulative spending privately. Fields: <code className="text-white/70">total_spent</code>, <code className="text-white/70">recipient_count</code>, <code className="text-white/70">auditor</code>. Consumed and re-created with each salary issuance to maintain an immutable spending chain.</p>
                                            </div>
                                            <div className="p-4 border border-white/5 bg-white/5 rounded-lg">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="font-mono text-white"><span className="text-muted-foreground">record</span> TreasuryRecord</div>
                                                    <span className="text-xs text-muted-foreground">Owner: MultiSig Admin</span>
                                                </div>
                                                <p className="text-xs text-gray-400">Central pool of native Aleo credits owned by the DAO. Created via <code className="text-white/70">fund_payroll</code> and consumed by <code className="text-white/70">claim_salary</code> during pull fulfillment.</p>
                                            </div>
                                            <div className="p-4 border border-white/5 bg-white/5 rounded-lg">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="font-mono text-white"><span className="text-muted-foreground">record</span> VestingRecord</div>
                                                    <span className="text-xs text-muted-foreground">Owner: Employee</span>
                                                </div>
                                                <p className="text-xs text-gray-400">Time-locked grant with <code className="text-white/70">unlock_height</code> parameter. Cannot be redeemed until the Aleo network reaches the specified block. Converted to SalaryCertificate via <code className="text-white/70">claim_vested</code>.</p>
                                            </div>
                                            <div className="p-4 border border-white/5 bg-white/5 rounded-lg">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="font-mono text-white"><span className="text-muted-foreground">record</span> SalaryCertificate</div>
                                                    <span className="text-xs text-muted-foreground">Owner: Employee</span>
                                                </div>
                                                <p className="text-xs text-gray-400">Unlocked right to pull salary. Generated from a VestingRecord after time-lock expiry. Used to submit a gasless Pull Request to the Treasury Relayer.</p>
                                            </div>
                                            <div className="p-4 border border-white/5 bg-white/5 rounded-lg">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="font-mono text-white"><span className="text-muted-foreground">record</span> SalaryRecord</div>
                                                    <span className="text-xs text-muted-foreground">Owner: Employee</span>
                                                </div>
                                                <p className="text-xs text-gray-400">The final encrypted payment voucher delivered to the employee. Contains <code className="text-white/70">amount</code>, <code className="text-white/70">payment_id</code>, and <code className="text-white/70">payroll_id</code> — only visible to the recipient.</p>
                                            </div>
                                            <div className="p-4 border border-white/5 bg-white/5 rounded-lg">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="font-mono text-white"><span className="text-muted-foreground">record</span> AuditReport</div>
                                                    <span className="text-xs text-muted-foreground">Owner: Auditor</span>
                                                </div>
                                                <p className="text-xs text-gray-400">Compliance proof containing <code className="text-white/70">total_spent</code>, <code className="text-white/70">recipient_count</code>, <code className="text-white/70">merkle_root</code>, and <code className="text-white/70">pay_period_hash</code>. Proves solvency without revealing individual salary data.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ============================================ */}
                            {/* SECURITY TAB */}
                            {/* ============================================ */}
                            {activeTab === 'security' && (
                                <div className="space-y-8">
                                    <div className="space-y-4 border-b border-white/10 pb-8">
                                        <h1 className="text-4xl md:text-5xl font-black tracking-tight">Security Model</h1>
                                        <p className="text-xl text-muted-foreground">Multi-layered cryptographic protection for every transaction.</p>
                                    </div>

                                    <div className="prose prose-invert prose-p:text-gray-400 max-w-none">
                                        <p>ZK Payroll&apos;s security is enforced at multiple layers — on-chain ZK circuit constraints, off-chain signature verification, and Aleo&apos;s native UTXO model. No single layer can be bypassed without invalidating the cryptographic proof.</p>
                                    </div>

                                    <div className="grid gap-4">
                                        <GlassCard hover={false} className="p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0"><Shield className="w-5 h-5" /></div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-white mb-2">Budget Ceiling Enforcement</h3>
                                                    <p className="text-sm text-gray-400 mb-3">Every salary transition asserts <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">new_total_spent &lt;= budget_ceiling</code> on-chain. This check is embedded in the ZK circuit — the Aleo validator network will reject any proof that violates this constraint. It is mathematically impossible to overspend the approved budget.</p>
                                                    <div className="p-3 bg-white/5 rounded-lg text-xs font-mono text-gray-500">
                                                        finalize: assert(new_total_spent &lt;= Mapping::get(payroll_budgets, payroll_id))
                                                    </div>
                                                </div>
                                            </div>
                                        </GlassCard>

                                        <GlassCard hover={false} className="p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0"><Lock className="w-5 h-5" /></div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-white mb-2">M-of-N Enterprise Multi-Sig</h3>
                                                    <p className="text-sm text-gray-400 mb-3">Critical payroll actions require M-of-N wallet signatures. During <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">initialize_payroll</code>, three admin addresses and a threshold are registered on-chain. The frontend verifies Ed25519 signatures from each required admin before releasing the transaction payload.</p>
                                                    <div className="p-3 bg-white/5 rounded-lg text-xs font-mono text-gray-500">
                                                        Mapping: admin_1, admin_2, admin_3 per payroll_id | threshold via multisig_threshold
                                                    </div>
                                                </div>
                                            </div>
                                        </GlassCard>

                                        <GlassCard hover={false} className="p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0"><Eye className="w-5 h-5" /></div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-white mb-2">Double-Spend Prevention</h3>
                                                    <p className="text-sm text-gray-400 mb-3">ZK Payroll uses two independent mechanisms to prevent double spending. First, Aleo&apos;s native UTXO model ensures every record can only be consumed once — when a <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">SpentRecord</code> is used in a transition, it is permanently destroyed. Second, the <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">claimed_payments</code> mapping explicitly tracks every pull claim by payment ID.</p>
                                                    <div className="p-3 bg-white/5 rounded-lg text-xs font-mono text-gray-500">
                                                        finalize: assert_eq(Mapping::get_or_use(claimed_payments, payment_id, false), false)
                                                    </div>
                                                </div>
                                            </div>
                                        </GlassCard>

                                        <GlassCard hover={false} className="p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0"><Clock className="w-5 h-5" /></div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-white mb-2">Time-Lock Isolation</h3>
                                                    <p className="text-sm text-gray-400 mb-3">Vesting records include an <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">unlock_height</code> parameter. The <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">claim_vested</code> transition enforces <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">block.height &gt;= unlock_height</code> inside the ZK constraint network. This is not a software rule — it is a mathematical assertion that the Aleo validator network must verify before the proof is accepted.</p>
                                                    <div className="p-3 bg-white/5 rounded-lg text-xs font-mono text-gray-500">
                                                        finalize_claim_vested: assert(block.height &gt;= unlock_height)
                                                    </div>
                                                </div>
                                            </div>
                                        </GlassCard>

                                        <GlassCard hover={false} className="p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0"><Layers className="w-5 h-5" /></div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-white mb-2">ARC-20 Compliance Proofs</h3>
                                                    <p className="text-sm text-gray-400">For stablecoin transfers, the frontend dynamically generates Merkle Tree FreezeList proofs required by the ARC-20 token standard. These proofs are passed as private inputs to <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">issue_salary_usdcx</code> and <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">issue_salary_usad</code>, ensuring the transfer satisfies all compliance constraints natively.</p>
                                                </div>
                                            </div>
                                        </GlassCard>
                                    </div>
                                </div>
                            )}

                            {/* ============================================ */}
                            {/* ROADMAP TAB */}
                            {/* ============================================ */}
                            {activeTab === 'roadmap' && (
                                <div className="space-y-8">
                                    <div className="space-y-4 border-b border-white/10 pb-8">
                                        <h1 className="text-4xl md:text-5xl font-black tracking-tight">Development Roadmap</h1>
                                        <p className="text-xl text-muted-foreground">From proof-of-concept to enterprise-grade privacy infrastructure.</p>
                                    </div>

                                    <div className="space-y-8 pb-12">
                                        {/* Wave 1 */}
                                        <div className="relative pl-8 border-l border-white/10">
                                            <div className="absolute w-3 h-3 bg-white/30 rounded-full -left-[7px] top-1.5" />
                                            <h2 className="text-xl font-bold mb-1 text-white/60">Wave 1: Foundation</h2>
                                            <span className="inline-block px-2 py-0.5 bg-white/10 text-white/40 text-xs font-bold rounded mb-3 tracking-widest uppercase">Complete</span>
                                            <ul className="space-y-1.5 text-sm text-gray-500 list-disc list-inside">
                                                <li>Core Leo smart contract with private SalaryRecord issuance</li>
                                                <li>Public budget ceiling enforcement via on-chain mappings</li>
                                                <li>Encrypted audit reports for selective disclosure</li>
                                                <li>Testnet deployment and CLI-based testing</li>
                                            </ul>
                                        </div>

                                        {/* Wave 2 */}
                                        <div className="relative pl-8 border-l border-white/10">
                                            <div className="absolute w-3 h-3 bg-white/30 rounded-full -left-[7px] top-1.5" />
                                            <h2 className="text-xl font-bold mb-1 text-white/60">Wave 2: Security &amp; Scale</h2>
                                            <span className="inline-block px-2 py-0.5 bg-white/10 text-white/40 text-xs font-bold rounded mb-3 tracking-widest uppercase">Complete</span>
                                            <ul className="space-y-1.5 text-sm text-gray-500 list-disc list-inside">
                                                <li>M-of-N Multi-Signature admin control with on-chain threshold</li>
                                                <li>Full Next.js 14 production frontend with wallet adapter</li>
                                                <li>Admin, Employee, and Auditor Portal dashboards</li>
                                                <li>Pull payment model with SalaryCertificate claiming</li>
                                                <li>Batch processing with automated UTXO management</li>
                                                <li>Payroll templates for recurring configurations</li>
                                            </ul>
                                        </div>

                                        {/* Wave 3 - Current */}
                                        <div className="relative pl-8 border-l border-white/20">
                                            <div className="absolute w-4 h-4 bg-white rounded-full -left-[9px] top-1 shadow-[0_0_10px_#fff]" />
                                            <h2 className="text-2xl font-bold mb-1">Wave 3: Enterprise Integrations</h2>
                                            <span className="inline-block px-2 py-1 bg-white text-black text-xs font-bold rounded mb-4 tracking-widest uppercase">Current Submission</span>
                                            <p className="text-gray-400 text-sm mb-4">Bridging the gap between Web3 privacy and Web2 enterprise operational requirements.</p>
                                            <div className="grid md:grid-cols-2 gap-3 not-prose">
                                                <div className="p-4 rounded-lg border border-white/10 bg-white/[0.03]">
                                                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                                        <Layers className="w-3.5 h-3.5" /> ARC-20 Token Integration
                                                    </h4>
                                                    <p className="text-xs text-gray-400">Native support for <code className="text-white/70">USDCx</code> and <code className="text-white/70">USAD</code> stablecoins via cross-program calls to official Aleo Buildathon token programs with dynamic Merkle Tree FreezeList proof generation.</p>
                                                </div>
                                                <div className="p-4 rounded-lg border border-white/10 bg-white/[0.03]">
                                                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                                        <Clock className="w-3.5 h-3.5" /> Time-Delayed Vesting
                                                    </h4>
                                                    <p className="text-xs text-gray-400">Cryptographically enforced unlock schedules tied to <code className="text-white/70">block.height</code>. Employees receive VestingRecords with live countdown timers and call <code className="text-white/70">claim_vested</code> to unlock.</p>
                                                </div>
                                                <div className="p-4 rounded-lg border border-white/10 bg-white/[0.03]">
                                                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                                        <Zap className="w-3.5 h-3.5" /> Zero-Gas Treasury Relayer
                                                    </h4>
                                                    <p className="text-xs text-gray-400">True Pull Model where employees execute salary claims without paying any Aleo network gas. The Admin Relayer fulfills requests asynchronously from the Treasury pool.</p>
                                                </div>
                                                <div className="p-4 rounded-lg border border-white/10 bg-white/[0.03]">
                                                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                                        <Shield className="w-3.5 h-3.5" /> Multi-Sig &amp; Auditing
                                                    </h4>
                                                    <p className="text-xs text-gray-400">End-to-end ZK solvency proofs with Merkle root commitments. Threshold management ensures no single admin can compromise the treasury.</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Wave 4 - Next */}
                                        <div className="relative pl-8 border-l border-white/10">
                                            <div className="absolute w-4 h-4 border-2 border-white bg-black rounded-full -left-[9px] top-1" />
                                            <h2 className="text-2xl font-bold mb-1 text-white/80">Wave 4: The Next Frontier</h2>
                                            <span className="inline-block px-2 py-1 border border-white/20 text-white/50 text-xs font-bold rounded mb-4 tracking-widest uppercase">Coming Next</span>
                                            <p className="text-gray-500 text-sm mb-4">Targeting mass institutional adoption, advanced tax regulations, and processing scale.</p>
                                            <ul className="space-y-2 text-sm text-gray-500 list-disc list-inside">
                                                <li><strong className="text-gray-400">Zero-Knowledge Tax Withholding:</strong> Automatically calculate tax percentages during claims, divert to a TaxVaultRecord, and generate downloadable ZK proofs for IRS/government submission.</li>
                                                <li><strong className="text-gray-400">True ZK Parallel Batch Rollups:</strong> Re-architect Leo contract to allow entire payroll arrays inside a single, massive SNARK transition.</li>
                                                <li><strong className="text-gray-400">Multi-Currency Batch Rollups:</strong> Bulk process and distribute ARC-20 stablecoins (USDCx, USAD) across multiple employees in one transaction.</li>
                                                <li><strong className="text-gray-400">Multisig Batch Authorization:</strong> Dynamic M-of-N threshold authorization for entire batch Merkle roots instead of individual signing.</li>
                                            </ul>
                                        </div>

                                        {/* Wave 5-6 */}
                                        <div className="relative pl-8 border-l border-white/5">
                                            <div className="absolute w-3 h-3 border border-white/20 bg-black rounded-full -left-[7px] top-1.5" />
                                            <h2 className="text-xl font-bold mb-1 text-white/50">Wave 5-6: Mass Adoption</h2>
                                            <span className="inline-block px-2 py-0.5 border border-white/10 text-white/30 text-xs font-bold rounded mb-3 tracking-widest uppercase">Future Vision</span>
                                            <ul className="space-y-1.5 text-sm text-gray-600 list-disc list-inside">
                                                <li><strong className="text-gray-500">Decentralized HR Oracles:</strong> Privacy-preserving sync with BambooHR, Deel, and other SaaS platforms for automatic proof-of-employment credentials.</li>
                                                <li><strong className="text-gray-500">Fiat On/Off-Ramps:</strong> Partner with MoonPay, Stripe Crypto, or Banxa to allow administrators to fund treasuries directly via bank wire.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

            </main>
        </div>
    );
}
