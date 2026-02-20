'use client'

import { useEffect } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { Network } from '@provablehq/aleo-types'

export function GlobalAutoConnect() {
    const { connect, connected, connecting, wallet } = useWallet();

    useEffect(() => {
        // If already connected or currently trying, do nothing
        if (connected || connecting) return;

        // Try to automatically reconnect ONLY if the user has a previously selected 
        // wallet instance saved in the context. (Do not force default to Leo)
        const tryAutoConnect = async () => {
            try {
                if (wallet) {
                    await connect(Network.TESTNET);
                }
            } catch (err) {
                console.log("Auto-connect silent failure (expected if wallet locked or permission dropped):", err);
            }
        };

        // Added slight delay to let the provider hydrate from localStorage before attempting connection
        const timer = setTimeout(tryAutoConnect, 500);
        return () => clearTimeout(timer);
    }, [connected, connecting, wallet, connect]);

    return null;
}
