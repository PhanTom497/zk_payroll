'use client'

import { useEffect } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { WalletAdapterNetwork } from '@provablehq/aleo-wallet-adaptor-core'

export function GlobalAutoConnect() {
    const { wallets, select, connect, connected, connecting, wallet } = useWallet();

    useEffect(() => {
        // If already connected or currently trying, do nothing
        if (connected || connecting) return;

        // Try to find the previously used wallet from local storage or default to Leo
        const tryAutoConnect = async () => {
            try {
                // If a wallet instance is already selected by the provider but not connected
                if (wallet) {
                    await connect(wallet.adapter.name, WalletAdapterNetwork.Testnet);
                    return;
                }

                // Otherwise, try to select and connect the Leo Wallet by default 
                // First check if Leo is in the available wallets list
                const leoWallet = wallets.find(w => w.adapter.name === 'Leo Wallet');
                if (leoWallet) {
                    select('Leo Wallet');
                    // Connection usually triggers automatically after select if autoConnect is true on the provider,
                    // but we can enforce it here if needed.
                }
            } catch (err) {
                console.log("Auto-connect silent failure (expected if wallet locked):", err);
            }
        };

        // Added slight delay to let the provider initialize fully before attempting
        const timer = setTimeout(tryAutoConnect, 500);
        return () => clearTimeout(timer);
    }, [connected, connecting, wallet, wallets, select, connect]);

    return null; // This is a logic-only component rendering nothing
}
