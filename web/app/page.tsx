'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, Users, Eye, Wallet, Lock, Zap, ArrowRight, ArrowUpRight, Play, Landmark } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import FeaturesScroll from "@/components/FeaturesScroll";

const title = "ZK Payroll";
const tagline = "Privacy-Preserving DAO Payments on Aleo";
const description =
    "Run private payroll, vesting, analytics, tax withholding, and audit workflows on Aleo without exposing individual compensation.";

const portals = [
    {
        title: "Admin Portal",
        description: "Operate payroll like a modern finance console with guided funding, approvals, analytics, relayer claims, and audit exports.",
        icon: Shield,
        url: "/admin",
        features: ["Guided Funding", "Payout Approvals", "Analytics Dashboard", "Compliance Reports"],
    },
    {
        title: "Employee Portal",
        description: "Track salary rights, unlock vesting, submit pull requests, and download private tax proofs from one place.",
        icon: Users,
        url: "/employee",
        features: ["Salary Rights", "Vesting Claims", "Pull Requests", "Tax Proof Downloads"],
    },
    {
        title: "Auditor Portal",
        description: "Verify payroll solvency and audit cryptographic summaries without ever seeing individual salaries.",
        icon: Eye,
        url: "/auditor",
        features: ["Audit Reports", "Budget Verification", "Merkle Commitments", "Selective Disclosure"],
    },
    {
        title: "Tax Authority Portal",
        description: "Review authority-owned withholding receipts, monitor collected tax, and export structured receipt files.",
        icon: Landmark,
        url: "/tax-authority",
        features: ["TaxVault Records", "Authority Access", "Collected Totals", "JSON Exports"],
    },
];

export default function Home() {
    const [mounted, setMounted] = useState(false);
    const scrollRef = useScrollAnimation();

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div ref={scrollRef} className="relative z-10 min-h-screen overflow-clip bg-black">


            {/* Hero */}
            <section className="min-h-screen flex items-center md:items-end px-6 md:px-12 lg:px-24 pb-24 relative z-10 pt-32 overflow-hidden">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="absolute inset-0 z-[-1]"
                >
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover opacity-60"
                        style={{ filter: "brightness(1) contrast(1.1) saturate(1.1)" }}
                    >
                        <source src="/assets/hero-bg.mp4" type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none" />
                </motion.div>

                <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-end justify-between gap-12 pt-8 md:pt-12">
                    <div className="max-w-3xl text-left">
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.45, duration: 0.9, ease: "easeOut" }}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 mb-6"
                        >
                            <span className="h-2 w-2 rounded-full bg-white" />
                            <span className="text-[11px] md:text-xs uppercase tracking-[0.22em] text-white/70 font-semibold">
                                Confidential Payroll Infrastructure
                            </span>
                            <span className="hidden md:block text-white/25">•</span>
                            <span className="hidden md:block text-[11px] md:text-xs uppercase tracking-[0.18em] text-white/45 font-medium">
                                Built on Aleo
                            </span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
                            className="max-w-4xl text-[40px] leading-[0.98] md:text-[56px] lg:text-[68px] font-semibold tracking-[-0.04em] mb-6 text-white"
                        >
                            Confidential Payroll.
                            <br />
                            Verifiable Oversight.
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.9, duration: 1, ease: "easeOut" }}
                            className="text-[16px] md:text-[17px] text-[#b4b4bc] mb-10 max-w-[620px] leading-[1.8] font-normal"
                        >
                            ZK Payroll is a privacy-first payroll system designed for modern organizations that need controlled spending, role-based visibility, and auditability without turning compensation into public data.
                        </motion.p>

                        <div className="flex flex-wrap items-center gap-4">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1.2, duration: 0.8, ease: "easeOut" }}
                            >
                                <Link href="/admin" className="flex items-center gap-3 bg-white text-black pl-5 pr-1.5 py-1.5 rounded-full font-medium hover:bg-white/90 transition-colors text-sm">
                                    Open Portal
                                    <div className="bg-black text-white rounded-full p-2 flex items-center justify-center">
                                        <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                                    </div>
                                </Link>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1.5, duration: 0.8, ease: "easeOut" }}
                            >
                                <a href="https://youtu.be/4R66Od57dDc" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 bg-transparent text-[#E4E4E5] px-6 py-2.5 rounded-full font-medium border border-white/20 hover:bg-white/10 transition-colors text-sm">
                                    <Play className="w-4 h-4 text-[#E4E4E5] flex-shrink-0" />
                                    Watch Demo
                                </a>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Scroll Section */}
            <div className="relative z-10">
                <FeaturesScroll />
            </div>

            {/* Portal Cards */}
            <section className="py-32 px-6 relative z-10 w-full bg-black">
                <div className="max-w-7xl mx-auto">

                    {/* Header Structure exactly matching Image 1 */}
                    <div className="flex flex-col mb-20 gap-8">
                        <div className="max-w-4xl text-left">
                            <div className="text-[12px] font-semibold tracking-[0.18em] text-[#A1A1AA] uppercase mb-5">
                                Portals
                            </div>
                            <h2 className="max-w-4xl text-[42px] md:text-[58px] lg:text-[76px] font-black tracking-[-0.04em] text-white leading-[0.98]">
                                Choose Your Role
                            </h2>
                            <p className="text-[18px] md:text-[20px] text-[#b4b4bc] mt-6 max-w-2xl font-normal leading-[1.65]">
                                Every workspace is shaped around a specific participant in the payroll lifecycle, exposing only the actions, records, and context that role should see.
                            </p>
                        </div>
                    </div>

                    {/* Fanning Card Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {portals.map((portal) => (
                            <Link href={portal.url} key={portal.title} className="block group">
                                <div className="relative w-full rounded-[2rem] p-8 md:p-10 transition-all duration-700 ease-out bg-[#0a0a0a] hover:bg-white overflow-hidden flex flex-col h-[520px]">

                                    {/* Top Right Action Arrow (Fades in on hover) */}
                                    <div className="absolute top-8 right-8 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 delay-75 bg-[#18181b] group-hover:bg-black opacity-0 -translate-x-4 translate-y-4 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 z-20">
                                        <ArrowUpRight className="w-6 h-6 text-white" />
                                    </div>

                                    {/* Center Massive Icon Graphic acting as a watermark */}
                                    <div className="flex-grow w-full flex items-center justify-center mb-10 transition-transform duration-1000 ease-out group-hover:scale-110">
                                        <portal.icon className="w-48 h-48 text-[#18181b] transition-colors duration-700 group-hover:text-[#f4f4f5]" strokeWidth={0.5} />
                                    </div>

                                    {/* Bottom Content (Pushes up slightly on hover) */}
                                    <div className="mt-auto flex flex-col gap-4 relative z-10 transition-transform duration-500 ease-out group-hover:-translate-y-2">
                                        <h3 className="text-3xl lg:text-4xl font-medium tracking-tight text-white transition-colors duration-500 group-hover:text-black">
                                            {portal.title}
                                        </h3>
                                        <p className="text-[#A1A1AA] transition-colors duration-500 group-hover:text-[#52525b] text-base md:text-lg leading-relaxed max-w-[95%]">
                                            {portal.description}
                                        </p>
                                    </div>

                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 px-6 border-t border-white/10 relative z-10 bg-[#000] w-full">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-16 md:gap-8 hover:opacity-100">

                    {/* Left Brand Column */}
                    <div className="flex flex-col items-start pr-8 md:w-1/3">
                        <Link href="/" className="text-[20px] font-bold tracking-tight text-white mb-6">
                            ZK Payroll.
                        </Link>
                        <p className="text-[#A1A1AA] text-lg font-medium leading-relaxed mb-8">
                            Private payroll operations.
                            <br />
                            Built for real teams.
                        </p>
                        <Link href="/admin" className="inline-flex items-center gap-2.5 bg-white text-black px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-white/90 transition-colors mb-20 md:mb-28">
                            Get Started <ArrowRight className="w-4 h-4" />
                        </Link>

                        <p className="text-[#52525b] text-sm mt-auto font-medium">
                            ZK Payroll © {new Date().getFullYear()} All rights reserved
                        </p>
                    </div>

                    {/* Right Columns & Socials */}
                    <div className="flex flex-col md:flex-row gap-16 md:gap-32 md:w-2/3 justify-start md:justify-end">

                        {/* Links Grid */}
                        <div className="flex flex-row gap-20 md:gap-24">
                            {/* Resources */}
                            <div className="flex flex-col">
                                <h4 className="text-white font-semibold mb-6 text-sm tracking-wide">Resources</h4>
                                <div className="flex flex-col gap-4">
                                    <Link href="/docs" className="text-[#71717a] hover:text-white transition-colors text-sm font-medium">
                                        Docs
                                    </Link>
                                    <a href="https://developer.aleo.org/" target="_blank" rel="noopener noreferrer" className="text-[#71717a] hover:text-white transition-colors text-sm font-medium flex items-center gap-1">
                                        Aleo Docs <ArrowUpRight className="w-3 h-3 opacity-60" />
                                    </a>
                                </div>
                            </div>

                            {/* Contact */}
                            <div className="flex flex-col">
                                <h4 className="text-white font-semibold mb-6 text-sm tracking-wide">Contact</h4>
                                <div className="flex flex-col gap-4">
                                    <a href="mailto:lakshaypanchal21@gmail.com" className="text-[#71717a] hover:text-white transition-colors text-sm font-medium">
                                        Email Support
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Flat Social Icons Row perfectly matching Image 1 top-right alignment */}
                        <div className="flex flex-row gap-6 items-start mt-2 md:mt-0">
                            {/* X / Twitter */}
                            <a href="https://x.com/lakshay_p007" target="_blank" rel="noopener noreferrer" className="text-[#71717a] hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                            </a>
                            {/* Github */}
                            <a href="https://github.com/PhanTom497" target="_blank" rel="noopener noreferrer" className="text-[#71717a] hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"></path></svg>
                            </a>
                            {/* LinkedIn */}
                            <a href="https://www.linkedin.com/in/lakshay-panchal-778572294" target="_blank" rel="noopener noreferrer" className="text-[#71717a] hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"></path></svg>
                            </a>
                            {/* Telegram */}
                            <a href="https://t.me/Lakshay7847" target="_blank" rel="noopener noreferrer" className="text-[#71717a] hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.12 0 .18z"></path></svg>
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
