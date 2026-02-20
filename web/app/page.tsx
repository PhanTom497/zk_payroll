'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, Users, Eye, Wallet, Lock, Zap, ArrowRight } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import WireframeBackground from "@/components/WireframeBackground";

const title = "ZK Payroll";
const tagline = "Privacy-Preserving DAO Payments on Aleo";
const description =
    "Solve the Compliance-Privacy Paradox — prove budget solvency to auditors without ever revealing individual contributor data.";

const portals = [
    {
        title: "Admin Portal",
        description: "Manage payroll, authorize payments, and maintain compliance proofs for your DAO.",
        icon: Shield,
        url: "/admin",
        features: ["Deposit Funds", "Authorize Payroll", "Batch Processing", "Compliance Proofs"],
    },
    {
        title: "Employee Portal",
        description: "Connect your wallet, view salary rights, and withdraw funds privately.",
        icon: Users,
        url: "/employee",
        features: ["Wallet Connection", "Salary Rights", "Private Withdrawals", "History Tracking"],
    },
    {
        title: "Auditor Portal",
        description: "Verify compliance proofs and audit DAO payments without accessing private data.",
        icon: Eye,
        url: "/auditor",
        features: ["Fetch Proofs", "Verify Compliance", "Budget Solvency", "Zero-Knowledge Audit"],
    },
];

const features = [
    { icon: Lock, title: "Zero-Knowledge Proofs", desc: "Verify without revealing sensitive data" },
    { icon: Zap, title: "Aleo Blockchain", desc: "Built for total privacy and public verifiability" },
    { icon: Shield, title: "Compliance Ready", desc: "Meet audit requirements while preserving privacy" },
];

export default function Home() {
    const [mounted, setMounted] = useState(false);
    const scrollRef = useScrollAnimation();

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div ref={scrollRef} className="relative z-10 min-h-screen overflow-hidden">
            <WireframeBackground />

            {/* Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/30 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
                        ZK Payroll
                    </Link>
                    <WalletConnectButton />
                </div>
            </nav>

            {/* Hero */}
            <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-16 relative z-10">
                <div className="text-center max-w-4xl mx-auto">
                    {/* Staggered letter animation */}
                    <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-6 perspective-[1000px] text-foreground">
                        {mounted &&
                            title.split("").map((letter, i) => (
                                <motion.span
                                    key={i}
                                    initial={{ opacity: 0, y: 40, rotateX: -90 }}
                                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                                    transition={{ delay: i * 0.08, duration: 0.5, ease: "easeOut" }}
                                    className="inline-block"
                                    style={{ transformOrigin: "bottom" }}
                                >
                                    {letter === " " ? "\u00A0" : letter}
                                </motion.span>
                            ))}
                    </h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.6 }}
                        className="text-xl md:text-2xl text-muted-foreground mb-4"
                    >
                        {tagline}
                    </motion.p>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.0, duration: 0.6 }}
                        className="text-sm md:text-base text-muted-foreground/70 max-w-2xl mx-auto mb-12"
                    >
                        {description}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.2, duration: 0.6 }}
                        className="flex gap-4 justify-center"
                    >
                        <Link href="/admin" className="glow-btn text-sm flex items-center gap-2">
                            Launch App <ArrowRight className="w-4 h-4" />
                        </Link>
                        <button className="px-6 py-3 rounded-lg border border-white/20 text-foreground text-sm font-semibold hover:bg-white/5 transition-all duration-300">
                            Learn More
                        </button>
                    </motion.div>
                </div>

                {/* Scroll indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="absolute bottom-10 flex flex-col items-center gap-2"
                >
                    <span className="text-xs text-muted-foreground">Scroll to explore</span>
                    <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1">
                        <motion.div
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-1.5 h-1.5 rounded-full bg-foreground"
                        />
                    </div>
                </motion.div>
            </section>

            {/* Features */}
            <section className="py-24 px-6 relative z-10">
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    {features.map((f, i) => (
                        <div
                            key={f.title}
                            className="animate-in-view text-center"
                            style={{ transitionDelay: `${i * 150}ms` }}
                        >
                            <div className="w-12 h-12 mx-auto mb-4 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                                <f.icon className="w-5 h-5 text-foreground" />
                            </div>
                            <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                            <p className="text-sm text-muted-foreground">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Portal Cards */}
            <section className="py-24 px-6 relative z-10">
                <div className="max-w-6xl mx-auto">
                    <h2 className="animate-in-view text-3xl md:text-5xl font-bold text-center mb-4 text-foreground">
                        Choose Your Portal
                    </h2>
                    <p className="animate-in-view text-center text-muted-foreground mb-16 max-w-xl mx-auto">
                        Access the ZK Payroll system based on your role in the DAO.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {portals.map((portal, i) => (
                            <Link
                                key={portal.title}
                                href={portal.url}
                                className="animate-in-view block"
                                style={{ transitionDelay: `${i * 200}ms` }}
                            >
                                <GlassCard className="h-full group cursor-pointer">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                            <portal.icon className="w-5 h-5 text-foreground" />
                                        </div>
                                        <h3 className="text-lg font-bold text-foreground">{portal.title}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-6">{portal.description}</p>
                                    <div className="space-y-2">
                                        {portal.features.map((f) => (
                                            <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <div className="w-1 h-1 rounded-full bg-foreground/40" />
                                                {f}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-6 flex items-center gap-2 text-sm font-medium text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                        Enter Portal <ArrowRight className="w-4 h-4" />
                                    </div>
                                </GlassCard>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-white/5 relative z-10">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <span className="text-sm font-bold text-foreground">ZK Payroll</span>
                    <span className="text-xs text-muted-foreground">
                        Built on Aleo — Privacy by default
                    </span>
                </div>
            </footer>
        </div>
    );
}
