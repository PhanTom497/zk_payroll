'use client';

import { useRef, useState } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Lock, Zap, Shield } from "lucide-react";

const features = [
    { 
        icon: Lock, 
        title: "Private by Default", 
        desc: "Salary records, claims, and receipts stay encrypted to the right wallet",
        bg: "linear-gradient(135deg, #e4e4e7 0%, #a1a1aa 100%)",
        textColor: "text-[#18181b]",
        descColor: "text-[#3f3f46]",
        iconColor: "text-[#18181b]"
    },
    { 
        icon: Zap, 
        title: "Operational Flows", 
        desc: "Support direct payouts, vesting claims, relayer processing, and token funding",
        bg: "linear-gradient(135deg, #ef4444 0%, #991b1b 100%)",
        textColor: "text-white",
        descColor: "text-white/80",
        iconColor: "text-white" 
    },
    { 
        icon: Shield, 
        title: "Compliance Without Exposure", 
        desc: "Analytics, audit reports, and tax receipts preserve oversight without exposing salaries",
        bg: "linear-gradient(135deg, #27272a 0%, #000000 100%)",
        textColor: "text-white",
        descColor: "text-[#a1a1aa]",
        iconColor: "text-white"
    },
];

export default function FeaturesScroll() {
    const containerRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    // Step Machine guarantees animations NEVER get stuck in the middle.
    // Scroll progress just triggers a full independent fluid animation to that phase!
    const [step, setStep] = useState(0);

    useMotionValueEvent(scrollYProgress, "change", (latest) => {
        if (latest < 0.2) setStep(0); // Arrival Block
        else if (latest < 0.5) setStep(1); // Zoomed Out Block
        else if (latest < 0.75) setStep(2); // Splitting
        else setStep(3); // 180 Flip & Fan
    });

    // Derived states based on step
    const containerScale = step >= 1 ? 0.85 : 1;
    const containerY = step >= 1 ? "8vh" : "0vh";
    const textOpacity = step >= 1 ? 1 : 0;
    const textY = step >= 1 ? 0 : 40;
    const gap = step >= 2 ? "24px" : "0px";
    const splitRadius = step >= 2 ? "24px" : "0px";
    
    // Crossfade trigger
    const singleOp = step >= 2 ? 0 : 1;
    const splitOp = step >= 2 ? 1 : 0;

    // Flip trigger
    const rotateFront = step >= 3 ? 180 : 0;
    const rotateBack = step >= 3 ? 0 : -180;

    return (
        <section ref={containerRef} className="h-[400vh] relative bg-black">
            <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden">
                
                {/* Emerging Background Text */}
                <motion.div 
                    animate={{ opacity: textOpacity, y: textY }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="absolute top-[14%] left-0 right-0 text-center z-0 px-6"
                >
                    <h2 className="max-w-5xl mx-auto text-[38px] md:text-[54px] lg:text-[68px] font-extrabold tracking-[-0.04em] text-white leading-[0.96]">
                        Built for Real
                        <span className="block text-white/90">Payroll Operations</span>
                    </h2>
                </motion.div>

                {/* Perspective Wrapper for Z-depth rendering */}
                <div className="w-full absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-auto">
                    
                    <motion.div 
                        animate={{ scale: containerScale, y: containerY }}
                        transition={{ duration: 1.5, ease: "easeInOut" }} 
                        className="relative flex justify-center items-center w-[90vw] md:w-[75vw] max-w-6xl h-[65vh] mt-16 md:mt-20"
                    >
                        {/* 1) Solid Image Block (Fades out seamlessly) */}
                        <motion.div
                            animate={{ opacity: singleOp }}
                            transition={{ duration: 0.1 }}
                            className="absolute inset-0 rounded-[24px] overflow-hidden bg-[#2a1b38]"
                        >
                            <img src="/assets/feature-bg.png" alt="Features" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/10" />
                        </motion.div>

                        {/* 2) 3 Split Slices */}
                        <motion.div 
                            className="absolute inset-0 flex w-full h-full pointer-events-none" 
                            animate={{ gap, opacity: splitOp }}
                            transition={{ gap: { duration: 1.8, ease: "easeInOut" }, opacity: { duration: 0.1 } }}
                        >
                            {features.map((f, i) => {
                                const borderRadiusSettings = 
                                    i === 0 ? { borderTopLeftRadius: "24px", borderBottomLeftRadius: "24px", borderTopRightRadius: splitRadius, borderBottomRightRadius: splitRadius } :
                                    i === 1 ? { borderRadius: splitRadius } :
                                    { borderTopRightRadius: "24px", borderBottomRightRadius: "24px", borderTopLeftRadius: splitRadius, borderBottomLeftRadius: splitRadius };

                                const fanStyles = 
                                    step >= 3 ? (
                                        i === 0 ? { rotateZ: -5, x: "11%", y: "4%" } :
                                        i === 2 ? { rotateZ: 5, x: "-11%", y: "4%" } :
                                        { rotateZ: 0, x: "0%", y: "0%" }
                                    ) : { rotateZ: 0, x: "0%", y: "0%" };

                                return (
                                    <motion.div
                                        key={i}
                                        className="relative flex-1 h-full w-full pointer-events-auto"
                                        animate={fanStyles}
                                        transition={{ duration: 1.5, ease: "easeInOut" }}
                                        style={{ 
                                            perspective: "1500px", 
                                            zIndex: i === 1 ? 10 : 1, // Central card stays on top
                                        }}
                                    >
                                        {/* FRONT FACE */}
                                        <motion.div 
                                            className="absolute inset-0 overflow-hidden bg-[#2a1b38]"
                                            animate={{ 
                                                rotateY: rotateFront,
                                                ...borderRadiusSettings
                                            }}
                                            transition={{ duration: 1.5, ease: "easeInOut" }}
                                            style={{ 
                                                backfaceVisibility: "hidden", 
                                                WebkitBackfaceVisibility: "hidden",
                                            }}
                                        >
                                            <div 
                                                className="absolute top-0 bottom-0 min-w-max" 
                                                style={{ 
                                                    width: "300%", 
                                                    left: i === 0 ? "0%" : i === 1 ? "-100%" : "-200%" 
                                                }}
                                            >
                                                <img src="/assets/feature-bg.png" alt={`Feature ${i+1}`} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="absolute inset-0 bg-black/10" />
                                            <div className="absolute inset-0 border border-white/5" />
                                        </motion.div>

                                        {/* BACK FACE (Interactive Data Card perfectly aligned to Image 2) */}
                                        <motion.div 
                                            className="absolute inset-0 flex flex-col p-8 md:p-10 shadow-2xl overflow-hidden"
                                            animate={{ 
                                                rotateY: rotateBack,
                                                ...borderRadiusSettings
                                            }}
                                            transition={{ duration: 1.5, ease: "easeInOut" }}
                                            style={{ 
                                                backfaceVisibility: "hidden", 
                                                WebkitBackfaceVisibility: "hidden",
                                                background: f.bg,
                                            }}
                                        >
                                            <div className="mb-auto">
                                                <f.icon className={`w-6 h-6 ${f.iconColor}`} strokeWidth={1.5} />
                                            </div>
                                            <div className="flex-grow flex items-center mb-6">
                                                <h3 className={`text-[34px] lg:text-[52px] font-medium tracking-[-0.03em] pr-4 ${f.textColor} leading-[1.04] max-w-[92%]`}>
                                                    {f.title}
                                                </h3>
                                            </div>
                                            <div className="mt-auto">
                                                <p className={`text-[13px] lg:text-[15px] leading-[1.6] max-w-[86%] ${f.descColor}`}>
                                                    {f.desc}
                                                </p>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
