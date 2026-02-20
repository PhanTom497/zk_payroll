'use client'

import { useEffect } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { Network } from '@provablehq/aleo-types'

export function GlobalAutoConnect() {
    const { wallets, selectWallet, connect, connected, connecting, wallet } = useWallet();

    useEffect(() => {
        // If already connected or currently trying, do nothing
        if (connected || connecting) return;

        // Try to find the previously used wallet from local storage or default to Leo
        const tryAutoConnect = async () => {
            try {
                // If a wallet instance is already selected by the provider but not connected
                if (wallet) {
                    await connect(Network.TESTNET);
                    return;
                }

                // Otherwise, try to select and connect the Leo Wallet by default 
                // First check if Leo is in the available wallets list
                const leoWallet = wallets.find(w => w.adapter.name === 'Leo Wallet');
                if (leoWallet) {
                    selectWallet(leoWallet.adapter.name as any);
                }
            } catch (err) {
                console.log("Auto-connect silent failure (expected if wallet locked):", err);
            }
        };

        // Added slight delay to let the provider initialize fully before attempting
        const timer = setTimeout(tryAutoConnect, 500);
        return () => clearTimeout(timer);
    }, [connected, connecting, wallet, wallets, selectWallet, connect]);

    return null; // This is a logic-only component rendering nothing
}
