'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, Shield, Cpu, Map as MapIcon, ChevronRight, ArrowRight, Eye, Lock } from "lucide-react";
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

                            {/* OVERVIEW */}
                            {activeTab === 'overview' && (
                                <div className="space-y-8">
                                    <div className="space-y-4 border-b border-white/10 pb-8">
                                        <h1 className="text-4xl md:text-5xl font-black tracking-tight">ZK Payroll Overview</h1>
                                        <p className="text-xl text-muted-foreground">Privacy-Preserving DAO Payments on Aleo.</p>
                                    </div>

                                    <div className="prose prose-invert prose-p:text-gray-400 prose-headings:text-white max-w-none">
                                        <h2>The Compliance-Privacy Paradox</h2>
                                        <p>
                                            Public blockchains expose all transaction data. For DAO payroll, this means competitors see your compensation structure, salaries become publicly searchable, and payment timing reveals cash flow.
                                        </p>
                                        <p>
                                            <strong>ZK Payroll solves this</strong> by using Aleo&apos;s zero-knowledge proofs to enable private salaries with public budget enforcement, ensuring both contributor privacy and organizational transparency.
                                        </p>

                                        <div className="my-12 p-6 rounded-xl border border-white/10 bg-white/5">
                                            <h3 className="text-lg font-bold mb-4 mt-0 border-b border-white/10 pb-2">Privacy Meter: Who Sees What?</h3>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead>
                                                        <tr className="border-b border-white/10 text-muted-foreground">
                                                            <th className="py-3 px-4 font-medium">Data Point</th>
                                                            <th className="py-3 px-4 font-medium">Public Observer</th>
                                                            <th className="py-3 px-4 font-medium">Auditor</th>
                                                            <th className="py-3 px-4 font-medium">Admin</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        <tr>
                                                            <td className="py-3 px-4">Budget Ceiling</td>
                                                            <td className="py-3 px-4 text-white">✅ Visible</td>
                                                            <td className="py-3 px-4 text-white">✅ Visible</td>
                                                            <td className="py-3 px-4 text-white">✅ Visible</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="py-3 px-4">Total Spent</td>
                                                            <td className="py-3 px-4 text-muted-foreground">❌ Hidden</td>
                                                            <td className="py-3 px-4 text-white">✅ Verified ZK</td>
                                                            <td className="py-3 px-4 text-white">✅ Visible</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="py-3 px-4">Individual Salaries</td>
                                                            <td className="py-3 px-4 text-muted-foreground">❌ Hidden</td>
                                                            <td className="py-3 px-4 text-muted-foreground">❌ Hidden</td>
                                                            <td className="py-3 px-4 text-white">✅ Local History</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <h2>Core Features (v7)</h2>
                                        <ul>
                                            <li><strong>Enterprise Multi-Sig:</strong> Require M-of-N signatures for admin payroll operations, preventing a single rogue actor from draining the treasury.</li>
                                            <li><strong>Privacy Batching:</strong> Issue multiple salaries in a combined state transition to mitigate timing correlation attacks.</li>
                                            <li><strong>Pull & Push Payments:</strong> Flexible models allowing organization-driven dispatch or employee-driven autonomous claiming.</li>
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {/* ARCHITECTURE */}
                            {activeTab === 'architecture' && (
                                <div className="space-y-8">
                                    <div className="space-y-4 border-b border-white/10 pb-8">
                                        <h1 className="text-4xl md:text-5xl font-black tracking-tight">Architecture</h1>
                                        <p className="text-xl text-muted-foreground">How ZK Payroll&apos;s hybrid models operate.</p>
                                    </div>

                                    <div className="prose prose-invert prose-p:text-gray-400 max-w-none">
                                        <h2>Push vs. Pull Models</h2>
                                        <p>ZK Payroll supports two distinct payment mechanisms natively to cater to different operational and privacy needs.</p>

                                        <div className="grid md:grid-cols-2 gap-6 my-8 not-prose">
                                            <GlassCard hover={false} className="p-6 border-white/20">
                                                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                                    1. Push Model
                                                </h3>
                                                <p className="text-sm text-muted-foreground mb-4">Direct Issue & Audit. Best for contractors and one-off payments.</p>
                                                <ul className="text-sm space-y-2 text-gray-300">
                                                    <li className="flex items-start gap-2"><ArrowRight className="w-4 h-4 mt-0.5 opacity-50 shrink-0" /> <span className="flex-1">Admin authorizes via <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">issue_salary</code> with Multi-Sig.</span></li>
                                                    <li className="flex items-start gap-2"><ArrowRight className="w-4 h-4 mt-0.5 opacity-50 shrink-0" /> <span className="flex-1">The Admin&apos;s private <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">SpentRecord</code> is immediately updated.</span></li>
                                                    <li className="flex items-start gap-2"><ArrowRight className="w-4 h-4 mt-0.5 opacity-50 shrink-0" /> <span className="flex-1">Compliance reports instantly reflect new expenditures.</span></li>
                                                </ul>
                                            </GlassCard>

                                            <GlassCard hover={false} className="p-6">
                                                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-white/40" />
                                                    2. Pull Model
                                                </h3>
                                                <p className="text-sm text-muted-foreground mb-4">Automated Claiming. Best for core team and ultimate privacy.</p>
                                                <ul className="text-sm space-y-2 text-gray-300">
                                                    <li className="flex items-start gap-2"><ArrowRight className="w-4 h-4 mt-0.5 opacity-50 shrink-0" /> <span className="flex-1">Admin issues a limit (<code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">SalaryCertificate</code>) via <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">issue_limit</code>.</span></li>
                                                    <li className="flex items-start gap-2"><ArrowRight className="w-4 h-4 mt-0.5 opacity-50 shrink-0" /> <span className="flex-1">Employee periodically claims their salary via <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">claim_salary</code>.</span></li>
                                                    <li className="flex items-start gap-2"><ArrowRight className="w-4 h-4 mt-0.5 opacity-50 shrink-0" /> <span className="flex-1"><strong>Privacy Boundary:</strong> The claim process forms an airgap, protecting exact claim timing from Admin tracking.</span></li>
                                                </ul>
                                            </GlassCard>
                                        </div>

                                        <h2>Key Smart Contract Records</h2>
                                        <div className="space-y-4 not-prose text-sm text-gray-300">
                                            <div className="p-4 border border-white/5 bg-white/5 rounded-lg">
                                                <div className="font-mono text-white mb-1"><span className="text-muted-foreground">struct</span> SpentRecord</div>
                                                <p>Owned by Admin. Tracks cumulative spending privately. Used to generate Audit Reports.</p>
                                            </div>
                                            <div className="p-4 border border-white/5 bg-white/5 rounded-lg">
                                                <div className="font-mono text-white mb-1"><span className="text-muted-foreground">struct</span> SalaryCertificate</div>
                                                <p>Owned by Employee. Represents the right to claim a recurring pull salary.</p>
                                            </div>
                                            <div className="p-4 border border-white/5 bg-white/5 rounded-lg">
                                                <div className="font-mono text-white mb-1"><span className="text-muted-foreground">struct</span> SalaryRecord</div>
                                                <p>Owned by Employee. The actual payment voucher revealing the decrypted salary amount.</p>
                                            </div>
                                            <div className="p-4 border border-white/5 bg-white/5 rounded-lg">
                                                <div className="font-mono text-white mb-1"><span className="text-muted-foreground">struct</span> AuditReport</div>
                                                <p>Owned by Auditor. Provided by Admin during compliance generation to prove solvency.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SECURITY */}
                            {activeTab === 'security' && (
                                <div className="space-y-8">
                                    <div className="space-y-4 border-b border-white/10 pb-8">
                                        <h1 className="text-4xl md:text-5xl font-black tracking-tight">Security Model</h1>
                                        <p className="text-xl text-muted-foreground">Protecting funds through cryptographic consensus.</p>
                                    </div>

                                    <div className="grid gap-6">
                                        <GlassCard hover={false} className="p-6">
                                            <Shield className="w-6 h-6 mb-4 text-white" />
                                            <h3 className="text-lg font-bold text-white mb-2">Budget Enforcement</h3>
                                            <p className="text-sm text-gray-400">
                                                Every state transition verifies that <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">new_total_spent &lt;= budget_ceiling</code>. This logic is statically analyzed by Leo constraints and dynamically verified by the Aleo validator network as a ZK proof string, making unauthorized inflation mathematically impossible.
                                            </p>
                                        </GlassCard>

                                        <GlassCard hover={false} className="p-6">
                                            <Lock className="w-6 h-6 mb-4 text-white" />
                                            <h3 className="text-lg font-bold text-white mb-2">M-of-N Enterprise Multi-Sig</h3>
                                            <p className="text-sm text-gray-400">
                                                To prevent single-point-of-failure compromises, critical actions like issuing payrolls require a cryptographic threshold. <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">issue_salary</code> processes an array of signers and Ed25519 signatures, ensuring at least M pre-authorized addresses have signed the recipient payload.
                                            </p>
                                        </GlassCard>

                                        <GlassCard hover={false} className="p-6">
                                            <Eye className="w-6 h-6 mb-4 text-white" />
                                            <h3 className="text-lg font-bold text-white mb-2">Double-Spend Protection & Isolation</h3>
                                            <p className="text-sm text-gray-400">
                                                Aleo&apos;s record consumption model intrinsically prevents double spending. When a <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">SpentRecord</code> is used to issue a salary, it is verifiably consumed and replaced with an updated state. Furthermore, a strict <code className="text-white text-xs bg-white/10 px-1 py-0.5 rounded">payroll_id</code> domain separation isolates concurrent payroll silos entirely.
                                            </p>
                                        </GlassCard>
                                    </div>
                                </div>
                            )}

                            {/* ROADMAP */}
                            {activeTab === 'roadmap' && (
                                <div className="space-y-8">
                                    <div className="space-y-4 border-b border-white/10 pb-8">
                                        <h1 className="text-4xl md:text-5xl font-black tracking-tight">Future Plans</h1>
                                        <p className="text-xl text-muted-foreground">The strategic development roadmap for ZK Payroll.</p>
                                    </div>

                                    <div className="space-y-12 pb-12">
                                        {/* Wave 2 / Completed Submission */}
                                        <div className="relative pl-8 border-l border-white/20">
                                            <div className="absolute w-4 h-4 bg-white rounded-full -left-[9px] top-1 shadow-[0_0_10px_#fff]" />
                                            <h2 className="text-2xl font-bold mb-2">Wave 2: Efficiency & Security</h2>
                                            <span className="inline-block px-2 py-1 bg-white text-black text-xs font-bold rounded mb-4 tracking-widest uppercase">Current Submission</span>
                                            <p className="text-gray-400 text-sm mb-4">Reduced administrative burden for DAO operations while securing critical infrastructure.</p>
                                            <ul className="space-y-2 text-sm text-gray-300 list-disc list-inside">
                                                <li><strong>Multi-Signature Control:</strong> Cryptographically enforced thresholds for treasury management.</li>
                                                <li><strong>Pull Payments:</strong> Employees use certificates to claim salaries, decoupling Admin push timing.</li>
                                                <li><strong>Privacy Batching:</strong> Issuing multiple credentials in privacy-preserving combined state transitions.</li>
                                                <li><strong>Auditor Verification:</strong> Zero-knowledge proofs of solvency generation via complete dashboard.</li>
                                            </ul>
                                        </div>

                                        {/* Wave 3 / Future Planning */}
                                        <div className="relative pl-8 border-l border-white/20">
                                            <div className="absolute w-4 h-4 border-2 border-white bg-black rounded-full -left-[9px] top-1" />
                                            <h2 className="text-2xl font-bold mb-2 text-white/90">Wave 3: Asset Diversification & Enterprise Compliance</h2>
                                            <span className="inline-block px-2 py-1 border border-white/20 text-white/60 text-xs font-bold rounded mb-4 tracking-widest uppercase">Future Buildathon</span>
                                            <p className="text-gray-400 text-sm mb-4">Bridging the gap between Web3 privacy and Web2 regulatory requirements.</p>
                                            <ul className="space-y-2 text-sm text-gray-500 list-disc list-inside">
                                                <li><strong>ARC-20 Token Integration:</strong> Issuing stablecoins (USDC/USDT structures) dynamically.</li>
                                                <li><strong>Token Vesting Contracts:</strong> Locked grants that unlock linearly based on programmatic block validation logic.</li>
                                                <li><strong>Zero-Knowledge Tax Compliance:</strong> Deducting and creating W2-style proof of withheld liabilities.</li>
                                                <li><strong>HR Oracles:</strong> Oracle integrations pulling proof-of-employment logic from BambooHR/Deel.</li>
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
