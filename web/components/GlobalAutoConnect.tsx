'use client'

import { useEffect, useCallback } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { Network } from '@provablehq/aleo-types'

const WALLET_LS_KEY = 'walletName'

export function GlobalAutoConnect() {
    const { connect, connected, connecting, wallet, wallets, selectWallet } = useWallet() as any;

    const tryReconnect = useCallback(async () => {
        try {
            const raw = localStorage.getItem(WALLET_LS_KEY);
            if (!raw) return;
            const savedName = JSON.parse(raw);
            if (!savedName) return;

            // If the context already has the right adapter, just call connect
            if (wallet && wallet.adapter && wallet.adapter.name === savedName) {
                try {
                    await connect(Network.TESTNET);
                } catch (e) {
                    // Expected if wallet is locked or permission dropped
                }
                return;
            }

            // Otherwise re-select the wallet from the adapter list
            if (selectWallet && wallets && wallets.length > 0) {
                const match = wallets.find((w: any) => w.adapter && w.adapter.name === savedName);
                if (match) {
                    selectWallet(savedName);
                    // The library's autoConnect effect will handle connection
                }
            }
        } catch (err) {
            // Silent failure
        }
    }, [wallet, wallets, selectWallet, connect]);

    useEffect(() => {
        // Only attempt reconnection when not connected and not connecting
        if (connected || connecting) return;

        // Delay to let wallet extensions inject and library hydrate
        const timer = setTimeout(tryReconnect, 600);
        return () => clearTimeout(timer);
    }, [connected, connecting, tryReconnect]);

    return null;
}
