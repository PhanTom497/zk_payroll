'use client';

import { useState, useEffect } from 'react';
import { Signal } from 'lucide-react';
import { fetchBlockHeight } from '@/lib/zk-utils';

export default function NetworkStatus() {
    const [currentHeight, setCurrentHeight] = useState<number>(0);

    useEffect(() => {
        const updateHeight = async () => {
            try {
                const h = await fetchBlockHeight();
                if (h > 0) setCurrentHeight(h);
            } catch (e) {
                console.error("Failed to fetch block height", e);
            }
        };
        updateHeight();
        const interval = setInterval(updateHeight, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 bg-black/80 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 shadow-2xl transition-all hover:bg-black/90 cursor-default">
            <div className="flex items-center gap-2">
                <div className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </div>
                <span className="text-xs uppercase tracking-widest font-bold text-white/80">
                    Aleo Testnet
                </span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-1.5 font-mono text-xs text-green-400">
                <Signal className="w-3.5 h-3.5" />
                {currentHeight > 0 ? `#${currentHeight}` : '...'}
            </div>
        </div>
    );
}
