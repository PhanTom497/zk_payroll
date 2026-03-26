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
    { id: 'roadmap', label: 'Roadmap & Progress', icon: MapIcon },
];

export default function DocsPage() {
    const [activeTab, setActiveTab] = useState('overview');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="relative min-h-screen text-white bg-black selection:bg-white/30 overflow-hidden font-sans">
            <div 
                className="fixed inset-0 z-0 bg-[length:800px] md:bg-[length:1800px] bg-left bg-no-repeat bg-fixed opacity-40"
                style={{ backgroundImage: "url('/assets/milad-fakurian-7W3X1dAuKqg-unsplash.jpg')" }}
            />
            <div className="fixed inset-0 z-0 bg-black/60 backdrop-blur-[2px]" />

            <main className="relative z-10 pt-32 pb-24 px-6 w-full flex flex-col items-center">
                
                {/* Main Heading */}
                <div className="text-center mb-12 w-full">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
                        ZK Payroll <span className="text-[#06b6d4]">Documentation</span>
                    </h1>
                    <p className="text-[#a1a1aa] text-lg max-w-2xl mx-auto">
                        Explore the current product, architecture, security model, and roadmap behind private payroll on Aleo.
                    </p>
                </div>

                {/* Second-level Nav Pill */}
                <div className="flex justify-center w-full mb-16">
                    <div className="flex items-center gap-2 bg-[#0a0a0a]/80 border border-white/10 rounded-full p-2 backdrop-blur-xl overflow-x-auto max-w-full shadow-2xl">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                                    activeTab === tab.id
                                        ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="w-full max-w-4xl mx-auto min-w-0">
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
                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="space-y-6 border-b border-white/5 pb-10 text-center flex flex-col items-center">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/20 text-[#06b6d4] text-xs font-bold tracking-widest uppercase">
                                            The Vision
                                        </div>
                                        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white mb-4 leading-tight">
                                            Zero-Knowledge <br className="hidden md:block"/>
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#06b6d4] to-[#3b82f6]">Payroll Protocol</span>
                                        </h1>
                                        <p className="text-xl text-[#a1a1aa] max-w-2xl leading-relaxed">
                                            A privacy-first payroll system for modern teams built natively on the Aleo Network.
                                        </p>
                                    </div>

                                    {/* Vision Section */}
                                    <div className="w-full max-w-5xl mx-auto pt-4">
                                        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
                                            {/* The Problem */}
                                            <div className="space-y-6 flex flex-col">
                                                <h2 className="text-3xl font-black text-white tracking-tight border-l-4 border-[#ef4444] pl-4">The Problem</h2>
                                                <div className="flex-1 p-8 rounded-2xl border border-white/5 bg-[#0a0a0a] space-y-6 relative overflow-hidden group hover:border-[#ef4444]/20 transition-colors">
                                                    <div className="space-y-3 relative z-10">
                                                        <h4 className="text-[#ef4444] font-bold tracking-wide uppercase text-xs flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
                                                            Transparency vs Privacy
                                                        </h4>
                                                        <p className="text-[#a1a1aa] leading-relaxed text-sm">
                                                            <strong className="text-white">Traditional public rails expose too much.</strong> Compensation structure, treasury behavior, and payout timing can all leak sensitive operational information.
                                                        </p>
                                                    </div>
                                                    <div className="h-px w-full bg-white/5" />
                                                    <div className="space-y-3 relative z-10">
                                                        <h4 className="text-[#ef4444] font-bold tracking-wide uppercase text-xs flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
                                                            The Compliance Paradox
                                                        </h4>
                                                        <p className="text-[#a1a1aa] leading-relaxed text-sm">
                                                            Teams still need to satisfy finance, auditors, and now tax workflows. <strong className="text-white">Most systems force a painful tradeoff between operational privacy and institutional reporting.</strong>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* The Solution */}
                                            <div className="space-y-6 flex flex-col">
                                                <h2 className="text-3xl font-black text-white tracking-tight border-l-4 border-[#22c55e] pl-4">The Solution</h2>
                                                <div className="flex-1 p-8 rounded-2xl border border-white/5 bg-gradient-to-b from-[#22c55e]/5 to-[#0a0a0a] relative overflow-hidden group hover:border-[#22c55e]/30 transition-colors">
                                                    <div className="space-y-6 relative z-10">
                                                        <h4 className="text-[#22c55e] font-bold tracking-wide text-lg leading-tight">
                                                            ZK Payroll closes that gap.
                                                        </h4>
                                                        <ul className="space-y-4">
                                                            <li className="flex items-start gap-3">
                                                                <div className="mt-0.5 w-5 h-5 rounded-full bg-[#22c55e]/10 flex items-center justify-center shrink-0 border border-[#22c55e]/20">
                                                                    <Lock className="w-3 h-3 text-[#22c55e]" />
                                                                </div>
                                                                <p className="text-[#a1a1aa] leading-relaxed text-sm">Payroll payouts, claims, and receipts remain <strong className="text-white font-medium">encrypted and role-scoped.</strong></p>
                                                            </li>
                                                            <li className="flex items-start gap-3">
                                                                <div className="mt-0.5 w-5 h-5 rounded-full bg-[#22c55e]/10 flex items-center justify-center shrink-0 border border-[#22c55e]/20">
                                                                    <Database className="w-3 h-3 text-[#22c55e]" />
                                                                </div>
                                                                <p className="text-[#a1a1aa] leading-relaxed text-sm">A <strong className="text-white font-medium">mathematically enforced payroll spending boundary</strong> is checked on-chain.</p>
                                                            </li>
                                                            <li className="flex items-start gap-3">
                                                                <div className="mt-0.5 w-5 h-5 rounded-full bg-[#22c55e]/10 flex items-center justify-center shrink-0 border border-[#22c55e]/20">
                                                                    <FileCheck className="w-3 h-3 text-[#22c55e]" />
                                                                </div>
                                                                <p className="text-[#a1a1aa] leading-relaxed text-sm">Auditors and tax authorities can receive <strong className="text-white font-medium">the exact records they need</strong> without exposing everyone else’s data.</p>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Privacy Matrix */}
                                    <GlassCard className="mt-12 overflow-hidden border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent p-0 rounded-3xl">
                                        <div className="p-8 pb-6 text-center">
                                            <h3 className="text-2xl font-bold text-white mb-2">The Privacy Matrix</h3>
                                            <p className="text-sm text-[#8f8f96]">Through selective disclosure and private records, ZK Payroll limits what each role can see to exactly what that workflow needs.</p>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-black/40">
                                                    <tr className="border-y border-white/10 text-[#a1a1aa]">
                                                        <th className="py-4 px-8 font-medium uppercase tracking-wider text-xs">Data Point</th>
                                                        <th className="py-4 px-4 font-medium uppercase tracking-wider text-xs">Public Observer</th>
                                                        <th className="py-4 px-4 font-medium uppercase tracking-wider text-xs">Auditor</th>
                                                        <th className="py-4 px-4 font-medium uppercase tracking-wider text-xs">Admin</th>
                                                        <th className="py-4 px-4 font-medium uppercase tracking-wider text-xs">Employee</th>
                                                        <th className="py-4 px-4 font-medium uppercase tracking-wider text-xs">Tax Authority</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    <tr className="group hover:bg-white/[0.02] transition-colors">
                                                        <td className="py-5 px-8 font-medium text-white">Budget Ceiling</td>
                                                        <td className="py-5 px-4 text-white">✅ Visible</td>
                                                        <td className="py-5 px-4 text-white">✅ Visible</td>
                                                        <td className="py-5 px-4 text-white">✅ Visible</td>
                                                        <td className="py-5 px-4 text-[#404040]">—</td>
                                                        <td className="py-5 px-4 text-[#404040]">—</td>
                                                    </tr>
                                                    <tr className="group hover:bg-white/[0.02] transition-colors">
                                                        <td className="py-5 px-8 font-medium text-white">Total Spent</td>
                                                        <td className="py-5 px-4 text-[#ef4444]">❌ Hidden</td>
                                                        <td className="py-5 px-4 text-white">✅ ZK-Verified</td>
                                                        <td className="py-5 px-4 text-white">✅ Visible</td>
                                                        <td className="py-5 px-4 text-[#404040]">—</td>
                                                        <td className="py-5 px-4 text-[#404040]">—</td>
                                                    </tr>
                                                    <tr className="group hover:bg-white/[0.02] transition-colors">
                                                        <td className="py-5 px-8 font-medium text-white">Individual Salaries</td>
                                                        <td className="py-5 px-4 text-[#ef4444]">❌ Hidden</td>
                                                        <td className="py-5 px-4 text-[#ef4444]">❌ Hidden</td>
                                                        <td className="py-5 px-4 text-white">✅ Local History</td>
                                                        <td className="py-5 px-4 text-white">✅ Own Only</td>
                                                        <td className="py-5 px-4 text-[#ef4444]">❌ Hidden</td>
                                                    </tr>
                                                    <tr className="group hover:bg-white/[0.02] transition-colors">
                                                        <td className="py-5 px-8 font-medium text-white">Recipient Identities</td>
                                                        <td className="py-5 px-4 text-[#ef4444]">❌ Hidden</td>
                                                        <td className="py-5 px-4 text-[#ef4444]">❌ Hidden</td>
                                                        <td className="py-5 px-4 text-white">✅ Visible</td>
                                                        <td className="py-5 px-4 text-white">✅ Own Only</td>
                                                        <td className="py-5 px-4 text-white">✅ Receipt Scope</td>
                                                    </tr>
                                                    <tr className="group hover:bg-white/[0.02] transition-colors">
                                                        <td className="py-5 px-8 font-medium text-white">Payment Timing</td>
                                                        <td className="py-5 px-4 text-[#ef4444]">❌ Hidden</td>
                                                        <td className="py-5 px-4 text-[#ef4444]">❌ Hidden</td>
                                                        <td className="py-5 px-4 text-white">✅ Visible</td>
                                                        <td className="py-5 px-4 text-white">✅ Own Only</td>
                                                        <td className="py-5 px-4 text-white">✅ Receipt Scope</td>
                                                    </tr>
                                                    <tr className="group hover:bg-white/[0.02] transition-colors">
                                                        <td className="py-5 px-8 font-medium text-white">Tax Receipts</td>
                                                        <td className="py-5 px-4 text-[#ef4444]">❌ Hidden</td>
                                                        <td className="py-5 px-4 text-[#ef4444]">❌ Hidden</td>
                                                        <td className="py-5 px-4 text-white">✅ Totals Only</td>
                                                        <td className="py-5 px-4 text-white">✅ Own Proof</td>
                                                        <td className="py-5 px-4 text-white">✅ Full Receipt</td>
                                                    </tr>
                                                    <tr className="group hover:bg-white/[0.02] transition-colors bg-[#22c55e]/[0.02]">
                                                        <td className="py-5 px-8 font-bold text-[#22c55e]">Compliance Proof</td>
                                                        <td className="py-5 px-4 text-[#22c55e] font-medium">✅ ZK-Proven</td>
                                                        <td className="py-5 px-4 text-[#22c55e] font-medium">✅ ZK-Proven</td>
                                                        <td className="py-5 px-4 text-[#22c55e] font-medium">✅ ZK-Proven</td>
                                                        <td className="py-5 px-4 text-[#404040]">—</td>
                                                        <td className="py-5 px-4 text-white">✅ Tax Totals</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </GlassCard>

                                    {/* Core Features */}
                                    <div className="pt-12">
                                        <h2 className="text-3xl font-black text-white mb-8 tracking-tight border-l-4 border-[#06b6d4] pl-4">Current Product Capabilities</h2>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="group p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 hover:scale-[1.02]">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-[#06b6d4]/20 group-hover:text-[#06b6d4] transition-colors text-white"><Users className="w-5 h-5" /></div>
                                                <h4 className="font-bold text-lg text-white">Operational Multi-Sig</h4>
                                                </div>
                                                <p className="text-sm text-[#8f8f96] leading-relaxed">Require M-of-N wallet signatures for critical payroll actions. Admins configure approvers during setup and the proof flow enforces approval before execution.</p>
                                            </div>

                                            <div className="group p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 hover:scale-[1.02]">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-[#06b6d4]/20 group-hover:text-[#06b6d4] transition-colors text-white"><Zap className="w-5 h-5" /></div>
                                                    <h4 className="font-bold text-lg text-white">Zero-Gas Treasury Relayer</h4>
                                                </div>
                                                <p className="text-sm text-[#8f8f96] leading-relaxed">Employees submit pull requests and admins fulfill them asynchronously through the relayer path. Contributors avoid fee complexity while operations stay under treasury control.</p>
                                            </div>

                                            <div className="group p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 hover:scale-[1.02]">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-[#06b6d4]/20 group-hover:text-[#06b6d4] transition-colors text-white"><Layers className="w-5 h-5" /></div>
                                                    <h4 className="font-bold text-lg text-white">ARC-20 Stablecoin Support</h4>
                                                </div>
                                                <p className="text-sm text-[#8f8f96] leading-relaxed">The admin portal now guides funding and payout selection across native `credits.aleo`, `USDCx`, and `USAD` so teams can work from one smoother interface.</p>
                                            </div>

                                            <div className="group p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 hover:scale-[1.02]">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-[#06b6d4]/20 group-hover:text-[#06b6d4] transition-colors text-white"><Clock className="w-5 h-5" /></div>
                                                    <h4 className="font-bold text-lg text-white">Time-Delayed Vesting</h4>
                                                </div>
                                                <p className="text-sm text-[#8f8f96] leading-relaxed">Cryptographically locked native Aleo credit grants that unlock only after a predefined <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded mx-1">block.height</code> is reached. Enforced at the ZK circuit level.</p>
                                            </div>

                                            <div className="group p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 hover:scale-[1.02]">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-[#06b6d4]/20 group-hover:text-[#06b6d4] transition-colors text-white"><Database className="w-5 h-5" /></div>
                                                    <h4 className="font-bold text-lg text-white">Sequential ZK Batching</h4>
                                                </div>
                                                <p className="text-sm text-[#8f8f96] leading-relaxed">Batch payroll currently executes safely in sequence, refreshing state between payouts to avoid UTXO collisions while keeping the flow approachable for HR-style operations.</p>
                                            </div>

                                            <div className="group p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 hover:scale-[1.02]">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-[#06b6d4]/20 group-hover:text-[#06b6d4] transition-colors text-white"><FileCheck className="w-5 h-5" /></div>
                                                <h4 className="font-bold text-lg text-white">Audit and Tax Evidence</h4>
                                                </div>
                                                <p className="text-sm text-[#8f8f96] leading-relaxed">Generate cryptographic audit reports for auditors, employee-owned tax proofs for contributors, and authority-owned `TaxVaultRecord` receipts for the tax wallet.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Program Details Banner */}
                                    <div className="mt-8 relative overflow-hidden rounded-3xl border border-[#06b6d4]/20 bg-gradient-to-r from-black via-[#06b6d4]/5 to-black p-8 md:p-10 shadow-2xl">
                                        <div className="absolute -top-12 -right-12 p-8 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                                            <Globe className="w-64 h-64 text-[#06b6d4]" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-widest text-[#06b6d4]">Deployment Context</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm relative z-10">
                                            <div>
                                                <span className="text-[#8f8f96] text-xs uppercase tracking-wider block mb-2 font-bold">Contract ID</span>
                                                <p className="font-mono text-white/90 text-[13px] bg-white/5 px-3 py-1.5 rounded-md inline-block">baba_zk_payroll_v24.aleo</p>
                                            </div>
                                            <div>
                                                <span className="text-[#8f8f96] text-xs uppercase tracking-wider block mb-2 font-bold">Language</span>
                                                <p className="font-mono text-white/90 text-[13px] bg-white/5 px-3 py-1.5 rounded-md inline-block">Leo v1.11</p>
                                            </div>
                                            <div>
                                                <span className="text-[#8f8f96] text-xs uppercase tracking-wider block mb-2 font-bold">Network</span>
                                                <p className="font-mono text-[#22c55e] border border-[#22c55e]/20 text-[13px] bg-[#22c55e]/10 px-3 py-1.5 rounded-md inline-block">Aleo Testnet</p>
                                            </div>
                                            <div>
                                                <span className="text-[#8f8f96] text-xs uppercase tracking-wider block mb-2 font-bold">Integration</span>
                                                <p className="font-mono flex flex-wrap gap-2">
                                                    <span className="px-2 py-1 text-[11px] bg-white/10 rounded-md text-white/80">credits.aleo</span>
                                                    <span className="px-2 py-1 text-[11px] bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-md">USDCx</span>
                                                    <span className="px-2 py-1 text-[11px] bg-green-500/10 border border-green-500/20 text-green-400 rounded-md">USAD</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ============================================ */}
                            {/* ARCHITECTURE TAB */}
                            {/* ============================================ */}
                            {activeTab === 'architecture' && (
                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="space-y-6 border-b border-white/5 pb-10 text-center flex flex-col items-center">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-widest uppercase">
                                            Architecture
                                        </div>
                                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-white">
                                            Dual Payment <br className="hidden md:block"/>
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Execution Engines</span>
                                        </h1>
                                        <p className="text-xl text-[#a1a1aa] max-w-2xl leading-relaxed mt-4">
                                            ZK Payroll supports two core payroll execution patterns, each tuned for a different operational rhythm.
                                        </p>
                                    </div>

                                    {/* Push Model */}
                                    <div className="space-y-6">
                                        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-4">
                                            <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#06b6d4] to-[#3b82f6]">01.</span> Push Model
                                        </h2>
                                        <GlassCard hover={false} className="p-0 overflow-hidden border-white/5 bg-[#050505] rounded-3xl">
                                            <div className="p-8 border-b border-white/5 bg-gradient-to-r from-[#06b6d4]/10 to-transparent">
                                                <h3 className="text-2xl font-bold mb-2 flex items-center gap-3 text-white">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-[#06b6d4] shadow-[0_0_10px_#06b6d4] animate-pulse" />
                                                    Direct Settlement
                                                </h3>
                                                <p className="text-sm text-[#a1a1aa]">Immediate settlement for native Aleo credits and supported stablecoins when the admin wants direct execution.</p>
                                            </div>
                                            <div className="p-8">
                                                <div className="grid md:grid-cols-3 gap-6 relative">
                                                    {/* Connecting Line for md+ screens */}
                                                    <div className="hidden md:block absolute top-[28px] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-[#06b6d4]/10 via-[#06b6d4]/40 to-[#06b6d4]/10 z-0" />
                                                    
                                                    <div className="relative z-10 bg-[#0a0a0a] p-6 rounded-2xl border border-white/10 shadow-xl group hover:border-[#06b6d4]/30 transition-colors">
                                                        <div className="w-10 h-10 rounded-full bg-black border border-white/20 flex items-center justify-center font-bold text-white mb-4 shadow-[0_0_15px_rgba(255,107,43,0.15)] group-hover:bg-[#06b6d4]/10 transition-colors z-10 mx-auto md:mx-0">1</div>
                                                        <h4 className="text-white font-bold mb-2 text-center md:text-left">Authorization</h4>
                                                        <p className="text-sm text-[#8f8f96] text-center md:text-left">Admin signs payment via the Multi-Sig modal. All M-of-N signatures verified cryptographically.</p>
                                                    </div>
                                                    
                                                    <div className="relative z-10 bg-[#0a0a0a] p-6 rounded-2xl border border-white/10 shadow-xl group hover:border-[#06b6d4]/30 transition-colors">
                                                        <div className="w-10 h-10 rounded-full bg-black border border-white/20 flex items-center justify-center font-bold text-white mb-4 shadow-[0_0_15px_rgba(255,107,43,0.15)] group-hover:bg-[#06b6d4]/10 transition-colors z-10 mx-auto md:mx-0">2</div>
                                                        <h4 className="text-white font-bold mb-2 text-center md:text-left">Execution</h4>
                                                        <p className="text-sm text-[#8f8f96] text-center md:text-left">The contract executes the chosen payout transition and checks that the payroll stays within its configured spend boundary.</p>
                                                    </div>
                                                    
                                                    <div className="relative z-10 bg-[#0a0a0a] p-6 rounded-2xl border border-[#06b6d4]/20 bg-gradient-to-b from-[#06b6d4]/[0.02] to-transparent shadow-xl group hover:border-[#06b6d4]/40 transition-colors">
                                                        <div className="w-10 h-10 rounded-full bg-[#06b6d4]/20 border border-[#06b6d4]/50 text-[#06b6d4] flex items-center justify-center font-bold mb-4 shadow-[0_0_15px_rgba(255,107,43,0.3)] z-10 mx-auto md:mx-0">3</div>
                                                        <h4 className="text-white font-bold mb-2 text-center md:text-left">Delivery</h4>
                                                        <p className="text-sm text-[#8f8f96] text-center md:text-left">A private payment record is delivered straight to the employee wallet with no claim step required.</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-8 p-4 bg-white/[0.02] border border-white/5 rounded-xl text-sm text-[#a1a1aa] flex gap-3 items-start">
                                                    <div className="mt-0.5 text-[#06b6d4]"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                                                    <div>
                                                        <strong className="text-white">Best for:</strong> one-off bonuses, direct settlements, contractor payments, and situations where finance wants immediate delivery.
                                                    </div>
                                                </div>
                                            </div>
                                        </GlassCard>
                                    </div>

                                    {/* Pull Model */}
                                    <div className="space-y-6 pt-6">
                                        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-4">
                                            <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-indigo-400">02.</span> Pull Model
                                        </h2>
                                        <GlassCard hover={false} className="p-0 overflow-hidden border-white/5 bg-[#050505] rounded-3xl">
                                            <div className="p-8 border-b border-white/5 bg-gradient-to-r from-blue-500/10 to-transparent">
                                                <h3 className="text-2xl font-bold mb-2 flex items-center gap-3 text-white">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
                                                    Zero-Gas Treasury Relayer
                                                </h3>
                                                <p className="text-sm text-[#a1a1aa]">Time-locked payroll rights with asynchronous employee claiming, admin relayer fulfillment, and claim-time tax withholding.</p>
                                            </div>
                                            
                                            <div className="p-8 grid md:grid-cols-5 gap-4">
                                                <div className="md:col-span-2 space-y-4">
                                                    <div className="p-5 border border-white/5 bg-white/[0.02] rounded-2xl relative overflow-hidden group hover:bg-white/[0.04] transition-colors">
                                                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/30 group-hover:bg-blue-500 transition-colors" />
                                                        <span className="text-xs font-mono text-blue-400 mb-2 block tracking-wider">PHASE 1 : ORIGINATION</span>
                                                        <h4 className="text-white font-bold text-sm mb-2">Time-Locked Vesting</h4>
                                                        <p className="text-xs text-[#8f8f96]">Admin issues a <code className="text-white/80 bg-white/10 px-1 py-0.5 rounded text-[10px]">VestingRecord</code> at a specified <code className="text-white/80 bg-white/10 px-1 py-0.5 rounded text-[10px]">unlock_height</code>. Funds mathematically inaccessible until the network reaches this block.</p>
                                                    </div>
                                                    
                                                    <div className="p-5 border border-white/5 bg-white/[0.02] rounded-2xl relative overflow-hidden group hover:bg-white/[0.04] transition-colors">
                                                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/30 group-hover:bg-blue-500 transition-colors" />
                                                        <span className="text-xs font-mono text-blue-400 mb-2 block tracking-wider">PHASE 2 : CONVERSION</span>
                                                        <h4 className="text-white font-bold text-sm mb-2">Employee Claims</h4>
                                                        <p className="text-xs text-[#8f8f96]">Employee converts an unlocked vesting record into a claimable certificate once the release condition is met.</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="hidden md:flex flex-col items-center justify-center">
                                                    <ArrowRight className="w-8 h-8 text-white/10" />
                                                    <div className="h-full w-px bg-gradient-to-b from-transparent via-white/10 to-transparent my-4" />
                                                </div>
                                                
                                                <div className="md:col-span-2 space-y-4 flex flex-col justify-center">
                                                    <div className="p-6 border border-blue-500/20 bg-blue-500/5 rounded-2xl relative overflow-hidden group shadow-[0_0_30px_rgba(59,130,246,0.05)]">
                                                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
                                                        <span className="text-xs font-mono text-blue-400 mb-2 block tracking-wider">PHASE 3 : RELAY</span>
                                                        <h4 className="text-white font-bold mb-2">Relayer Fulfillment</h4>
                                                        <p className="text-sm text-[#8f8f96] mb-4">Employee submits a pull request, then admin fulfills it through `claim_salary`, where withholding and receipts are generated.</p>
                                                        <div className="flex items-center gap-2 text-xs font-mono bg-black/40 p-2 rounded text-white/60">
                                                            <span className="text-blue-400">TreasuryRecord</span> → <span className="text-green-400">Employee</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="md:col-span-5 mt-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl text-sm text-[#a1a1aa] flex gap-3 items-start">
                                                    <div className="mt-0.5 text-blue-400"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                                                    <div>
                                                        <strong className="text-white">Best for:</strong> recurring salaries, vesting schedules, zero-gas employee UX, and any payroll flow that benefits from claim-time receipts and withholding.
                                                    </div>
                                                </div>
                                            </div>
                                        </GlassCard>
                                    </div>

                                    {/* Smart Contract Records */}
                                    <div className="pt-12">
                                        <h2 className="text-3xl font-black text-white mb-8 tracking-tight border-l-4 border-white pl-4">Key Smart Contract Records</h2>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            {[
                                                { name: "SpentRecord", owner: "Admin", desc: "Tracks cumulative spending privately. Consumed and re-created mapping total_spent to maintain an immutable loop." },
                                                { name: "TreasuryRecord", owner: "MultiSig Admin", desc: "Central pool of native Aleo credits owned by the DAO. Consumed during pull fulfillment." },
                                                { name: "VestingRecord", owner: "Employee", desc: "Time-locked grant parameter. Inaccessible until the Aleo network reaches the specified block." },
                                                { name: "SalaryCertificate", owner: "Employee", desc: "Unlocked right to pull salary. Used to submit a gasless Pull Request to the Treasury Relayer." },
                                                { name: "SalaryRecord", owner: "Employee", desc: "The final encrypted payment voucher delivered to the employee. Contains amount and payment_id." },
                                                { name: "AuditReport", owner: "Auditor", desc: "Compliance proof containing merkle_root and pay_period_hash for selective disclosure to audit teams." },
                                                { name: "TaxPaidProof", owner: "Employee", desc: "Employee-side proof of gross, tax, and net amounts that can be downloaded from the employee portal." },
                                                { name: "TaxVaultRecord", owner: "Tax Authority", desc: "Authority-owned withholding receipt that records employee, gross, tax, and net claim values." },
                                            ].map(record => (
                                                <div key={record.name} className="p-6 border border-white/5 bg-[#0a0a0a] rounded-2xl hover:bg-white/[0.02] transition-colors group">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="font-mono text-white text-lg flex items-center gap-2">
                                                            <span className="text-white/30 text-xs tracking-widest uppercase">record</span> 
                                                            <span className="group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/50 transition-all">{record.name}</span>
                                                        </div>
                                                        <span className="text-[10px] uppercase tracking-wider text-[#8f8f96] bg-white/5 px-2 py-1 rounded-full border border-white/5">
                                                            {record.owner}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-[#8f8f96] leading-relaxed">{record.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ============================================ */}
                            {/* SECURITY TAB */}
                            {/* ============================================ */}
                            {activeTab === 'security' && (
                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="space-y-6 border-b border-white/5 pb-10 text-center flex flex-col items-center">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold tracking-widest uppercase">
                                            Security Model
                                        </div>
                                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
                                            Cryptographic <br className="hidden md:block"/>
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">Defense-in-Depth</span>
                                        </h1>
                                        <p className="text-xl text-[#a1a1aa] max-w-3xl leading-relaxed mt-4">
                                            ZK Payroll&apos;s security is enforced at multiple layers — on-chain ZK circuit constraints, off-chain signature verification, and Aleo&apos;s native UTXO model.
                                            <strong className="text-white font-medium ml-1">No single layer can be bypassed without invalidating the mathematical proof.</strong>
                                        </p>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6 pt-4">
                                        <GlassCard hover={true} className="p-8 border-white/5 bg-[#050505] group">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500/20 to-transparent flex items-center justify-center mb-6 border border-green-500/20 group-hover:bg-green-500/30 transition-colors">
                                                <Shield className="w-6 h-6 text-green-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-3">Budget Ceiling Enforcement</h3>
                                            <p className="text-sm text-[#8f8f96] mb-6 leading-relaxed">
                                                Every salary transition asserts <code className="text-white/80 bg-white/5 px-1.5 py-0.5 rounded text-[11px] font-mono mx-1 border border-white/10">new_total_spent &lt;= budget_ceiling</code> on-chain. This check is embedded in the ZK circuit — the Aleo validator network will drop any transaction that violates this mathematical constraint.
                                            </p>
                                            <div className="p-4 bg-[#0a0a0a] rounded-xl border border-white/5 font-mono text-xs text-green-400/80 shadow-inner overflow-hidden">
                                                <div className="flex gap-2">
                                                    <span className="text-white/30 truncate select-none">1 |</span> 
                                                    <span><span className="text-purple-400">assert</span>(new_total_spent &lt;= </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="text-white/30 truncate select-none">2 |</span> 
                                                    <span className="pl-4">Mapping::<span className="text-blue-400">get</span>(payroll_budgets, id))</span>
                                                </div>
                                            </div>
                                        </GlassCard>

                                        <GlassCard hover={true} className="p-8 border-white/5 bg-[#050505] group">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#06b6d4]/20 to-transparent flex items-center justify-center mb-6 border border-[#06b6d4]/20 group-hover:bg-[#06b6d4]/30 transition-colors">
                                                <Lock className="w-6 h-6 text-[#06b6d4]" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-3">M-of-N Enterprise Multi-Sig</h3>
                                            <p className="text-sm text-[#8f8f96] mb-6 leading-relaxed">
                                                Critical payroll actions require M-of-N wallet signatures natively. During initialization, multiple admin addresses and a threshold are registered on-chain. The Ed25519 signatures are verified before releasing payload.
                                            </p>
                                            <div className="p-4 bg-[#0a0a0a] rounded-xl border border-white/5 font-mono text-xs text-[#06b6d4]/80 shadow-inner overflow-hidden">
                                                <div className="flex gap-2">
                                                    <span className="text-white/30 truncate select-none">1 |</span> 
                                                    <span><span className="text-purple-400">Mapping</span>: admin_1, admin_2, admin_3</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="text-white/30 truncate select-none">2 |</span> 
                                                    <span className="pl-4">threshold <span className="text-purple-400">=</span> multisig_threshold</span>
                                                </div>
                                            </div>
                                        </GlassCard>

                                        <GlassCard hover={true} className="p-8 border-white/5 bg-[#050505] group">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-transparent flex items-center justify-center mb-6 border border-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                                                <Eye className="w-6 h-6 text-blue-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-3">Double-Spend Prevention</h3>
                                            <p className="text-sm text-[#8f8f96] mb-6 leading-relaxed">
                                                Two independent defense mechanisms: Aleo&apos;s native UTXO model ensures every <code className="text-white bg-white/10 px-1 py-0.5 rounded text-[10px]">SpentRecord</code> is permanently destroyed upon consumption. Additionally, explicit payment claim mapping tracking.
                                            </p>
                                            <div className="p-4 bg-[#0a0a0a] rounded-xl border border-white/5 font-mono text-xs text-blue-400/80 shadow-inner overflow-hidden">
                                                <div className="flex gap-2">
                                                    <span className="text-white/30 truncate select-none">1 |</span> 
                                                    <span><span className="text-purple-400">assert_eq</span>(</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="text-white/30 truncate select-none">2 |</span> 
                                                    <span className="pl-4">Mapping::<span className="text-blue-400">get_or_use</span>(claimed, id), <span className="text-yellow-400">false</span></span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="text-white/30 truncate select-none">3 |</span> 
                                                    <span>)</span>
                                                </div>
                                            </div>
                                        </GlassCard>

                                        <GlassCard hover={true} className="p-8 border-white/5 bg-[#050505] group">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-transparent flex items-center justify-center mb-6 border border-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                                                <Clock className="w-6 h-6 text-purple-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-3">Time-Lock Isolation</h3>
                                            <p className="text-sm text-[#8f8f96] mb-6 leading-relaxed">
                                                Vesting asserts <code className="text-white/80 bg-white/5 px-1 py-0.5 rounded text-[11px] font-mono border border-white/10 mx-1">block.height &gt;= unlock_height</code> inside the ZK constraint network. This is not a software rule; it is a mathematical assertion forced upon validators.
                                            </p>
                                            <div className="p-4 bg-[#0a0a0a] rounded-xl border border-white/5 font-mono text-xs text-purple-400/80 shadow-inner overflow-hidden">
                                                <div className="flex gap-2">
                                                    <span className="text-white/30 truncate select-none">1 |</span> 
                                                    <span className="text-white/50">{"// ZK Circuit Constraint"}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="text-white/30 truncate select-none">2 |</span> 
                                                    <span><span className="text-purple-400">assert</span>(block.height &gt;= unlock_height)</span>
                                                </div>
                                            </div>
                                        </GlassCard>
                                        
                                        <div className="md:col-span-2">
                                            <GlassCard hover={true} className="p-8 border-white/5 bg-[#050505] bg-gradient-to-r from-transparent via-white/[0.02] to-transparent group flex flex-col md:flex-row items-center gap-8">
                                                <div className="w-16 h-16 shrink-0 rounded-full bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                                                    <Layers className="w-8 h-8 text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-white mb-2">ARC-20 Compliance Proofs</h3>
                                                    <p className="text-sm text-[#8f8f96] leading-relaxed max-w-3xl">
                                                        For stablecoin transfers, the frontend dynamically generates Merkle Tree FreezeList proofs required by the ARC-20 token standard. These proofs are passed as private inputs to <code className="text-white bg-white/5 px-1.5 py-0.5 rounded text-xs border border-white/10">issue_salary_usdcx</code> and <code className="text-white bg-white/5 px-1.5 py-0.5 rounded text-xs border border-white/10">issue_salary_usad</code>, ensuring the transfer satisfies all organizational compliance constraints natively within the zero-knowledge execution environment.
                                                    </p>
                                                </div>
                                            </GlassCard>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ============================================ */}
                            {/* ROADMAP TAB */}
                            {/* ============================================ */}
                            {activeTab === 'roadmap' && (
                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
                                    <div className="space-y-6 border-b border-white/5 pb-10 text-center flex flex-col items-center">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/20 text-[#06b6d4] text-xs font-bold tracking-widest uppercase">
                                            Roadmap
                                        </div>
                                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
                                            Development <br className="hidden md:block"/>
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#06b6d4] to-indigo-400">Timeline</span>
                                        </h1>
                                        <p className="text-xl text-[#a1a1aa] max-w-2xl leading-relaxed mt-4">
                                            From proof-of-concept to operational payroll product. This timeline shows what is already live and where the next upgrades are headed.
                                        </p>
                                    </div>

                                    <div className="relative pt-8">
                                        {/* Central Timeline Line */}
                                        <div className="absolute left-[39px] md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#06b6d4]/50 via-white/10 to-transparent -translate-x-1/2" />

                                        <div className="space-y-16">
                                            {/* Wave 1 */}
                                            <div className="relative flex flex-col md:flex-row items-start md:items-center w-full group">
                                                <div className="md:w-1/2 md:pr-16 text-left md:text-right order-2 md:order-1 pl-20 md:pl-0 mt-4 md:mt-0">
                                                    <h2 className="text-2xl font-bold text-white mb-2">Wave 1: Foundation</h2>
                                                    <p className="text-[#8f8f96] text-sm mb-4">Initial testnet deployment and core privacy mechanics.</p>
                                                    <div className="inline-flex flex-wrap gap-2 md:justify-end">
                                                        {['Core Leo Contract', 'Budget Ceilings', 'Audit Proofs', 'CLI Testing'].map((item) => (
                                                            <span key={item} className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[11px] text-white/60">{item}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="absolute left-[39px] md:left-1/2 top-0 md:top-1/2 -translate-x-1/2 md:-translate-y-1/2 w-6 h-6 rounded-full bg-black border-2 border-white/20 z-10 flex items-center justify-center group-hover:border-white/50 transition-colors">
                                                    <div className="w-2 h-2 rounded-full bg-white/20 group-hover:bg-white/50 transition-colors" />
                                                </div>
                                                <div className="md:w-1/2 md:pl-16 order-1 md:order-2 pl-20 md:pl-0">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 text-white/60 text-xs font-bold rounded-full tracking-widest uppercase mb-2 md:mb-0">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                        Complete
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Wave 2 */}
                                            <div className="relative flex flex-col md:flex-row items-start md:items-center w-full group">
                                                <div className="md:w-1/2 md:pr-16 text-left md:text-right order-2 md:order-1 pl-20 md:pl-0 mt-4 md:mt-0">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 text-white/60 text-xs font-bold rounded-full tracking-widest uppercase mb-2 md:mb-0">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                        Complete
                                                    </span>
                                                </div>
                                                <div className="absolute left-[39px] md:left-1/2 top-0 md:top-1/2 -translate-x-1/2 md:-translate-y-1/2 w-8 h-8 rounded-full bg-black border-2 border-white/30 z-10 flex items-center justify-center group-hover:border-white/60 transition-colors">
                                                    <div className="w-3 h-3 rounded-full bg-white/40 group-hover:bg-white/80 transition-colors" />
                                                </div>
                                                <div className="md:w-1/2 md:pl-16 order-1 md:order-2 pl-20 md:pl-0 text-left">
                                                    <h2 className="text-2xl font-bold text-white mb-2">Wave 2: Security &amp; Scale</h2>
                                                    <p className="text-[#8f8f96] text-sm mb-4">Adding M-of-N authorization and production frontend interfaces.</p>
                                                    <div className="inline-flex flex-wrap gap-2 text-left">
                                                        {['Multi-Sig Thresholds', 'Next.js 14 Frontend', 'Pull Model Alpha', 'UTXO Batching'].map((item) => (
                                                            <span key={item} className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[11px] text-white/60">{item}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Wave 3 */}
                                            <div className="relative flex flex-col md:flex-row items-center w-full group">
                                                <div className="md:w-1/2 md:pr-16 text-left md:text-right order-2 md:order-1 pl-20 md:pl-0 mt-4 md:mt-0 w-full hidden md:block">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 text-white/60 text-xs font-bold rounded-full tracking-widest uppercase mb-2 md:mb-0">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                        Complete
                                                    </span>
                                                </div>
                                                <div className="absolute left-[39px] md:left-1/2 top-0 md:top-1/2 -translate-x-1/2 md:-translate-y-1/2 w-8 h-8 rounded-full bg-black border-2 border-white/30 z-10 flex items-center justify-center group-hover:border-white/60 transition-colors">
                                                    <div className="w-3 h-3 rounded-full bg-white/40 group-hover:bg-white/80 transition-colors" />
                                                </div>
                                                <div className="md:w-1/2 md:pl-16 order-1 md:order-2 pl-20 md:pl-0 text-left">
                                                    <h2 className="text-2xl font-bold text-white mb-2">Wave 3: Integrations</h2>
                                                    <p className="text-[#8f8f96] text-sm mb-4">Bridging the gap between Web3 privacy capabilities and Web2 enterprise operational requirements.</p>
                                                    <div className="inline-flex flex-wrap gap-2 text-left">
                                                        {['ARC-20 Stablecoins', 'Time-Delayed Vesting', 'Gasless Treasuries'].map((item) => (
                                                            <span key={item} className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[11px] text-white/60">{item}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Wave 4 - Current */}
                                            <div className="relative flex flex-col md:flex-row items-center w-full group">
                                                <div className="md:w-1/2 md:pr-16 text-left md:text-right order-2 md:order-1 pl-12 md:pl-0 mt-4 md:mt-0 w-full hidden md:block">
                                                    <span className="inline-flex flex-col items-end opacity-20">
                                                        <span className="text-6xl font-black italic -ml-4">W4</span>
                                                    </span>
                                                </div>
                                                
                                                <div className="absolute left-[39px] md:left-1/2 top-0 md:top-9 -translate-x-1/2 w-12 h-12 rounded-full bg-black border-2 border-[#06b6d4] shadow-[0_0_20px_rgba(255,107,43,0.3)] z-10 flex items-center justify-center">
                                                    <div className="w-4 h-4 rounded-full bg-[#06b6d4] animate-pulse" />
                                                </div>
                                                
                                                <div className="md:w-1/2 md:pl-16 order-1 md:order-2 pl-20 md:pl-0 w-full">
                                                    <GlassCard hover={true} className="p-6 md:p-8 border-[#06b6d4]/30 bg-gradient-to-br from-[#06b6d4]/5 to-black relative overflow-hidden group-hover:border-[#06b6d4]/50">
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#06b6d4] opacity-5 blur-[80px]" />
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#06b6d4]/20 text-[#06b6d4] text-xs font-bold rounded-full tracking-widest uppercase mb-4 shadow-[0_0_10px_rgba(255,107,43,0.2)]">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] animate-pulse" /> Current Focus
                                                        </span>
                                                        <h2 className="text-3xl font-black text-white mb-2">Wave 4: Expanding Horizons</h2>
                                                        <p className="text-[#a1a1aa] text-sm mb-6 max-w-sm">Wave 4 is where ZK Payroll starts to feel like a real operations suite: smoother UX, analytics, tax flows, and role-specific portals.</p>
                                                        
                                                        <div className="space-y-4">
                                                            {[
                                                                { icon: <Globe className="text-[#06b6d4] w-4 h-4"/>, title: "Frontend Upgrades", desc: "Live across role-based portals with clearer copy, guided flows, and smoother navigation." },
                                                                { icon: <Database className="text-[#06b6d4] w-4 h-4"/>, title: "Admin Analytics", desc: "Live with payout trends, token mix, active employees, and payroll context cards." },
                                                                { icon: <Users className="text-[#06b6d4] w-4 h-4"/>, title: "Tax Withholding", desc: "Live on the claim path with employee proofs and authority-side tax vault receipts." },
                                                                { icon: <Layers className="text-[#06b6d4] w-4 h-4"/>, title: "HR-Friendly UX", desc: "Actively being refined to hide blockchain complexity behind familiar payroll language." }
                                                            ].map((feature, i) => (
                                                                <div key={i} className="flex gap-3 items-start p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 group/item">
                                                                    <div className="mt-1 bg-black p-1.5 rounded-md border border-white/10 group-hover/item:border-[#06b6d4]/30 transition-colors">
                                                                        {feature.icon}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-white text-sm font-bold">{feature.title}</h4>
                                                                        <p className="text-xs text-[#8f8f96] mt-0.5">{feature.desc}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </GlassCard>
                                                </div>
                                            </div>
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
