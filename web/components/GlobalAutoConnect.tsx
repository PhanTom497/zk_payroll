'use client'

import { useEffect, useRef } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { Network } from '@provablehq/aleo-types'

const WALLET_LS_KEY = 'walletName'

export function GlobalAutoConnect() {
    const { connect, connected, connecting, wallet, wallets, selectWallet } = useWallet() as any;
    const attempted = useRef(false);

    useEffect(() => {
        // If already connected or mid-connection, nothing to do
        if (connected || connecting) {
            attempted.current = true;
            return;
        }

        // Don't re-attempt after first successful cycle
        if (attempted.current) return;
        attempted.current = true;

        const tryReconnect = async () => {
            try {
                // 1. Read the persisted wallet name from localStorage
                const raw = localStorage.getItem(WALLET_LS_KEY);
                if (!raw) return;
                const savedName = JSON.parse(raw);
                if (!savedName) return;

                // 2. If the wallet context already has the right adapter selected, just connect
                if (wallet && wallet.adapter && wallet.adapter.name === savedName) {
                    try {
                        await connect(Network.TESTNET);
                    } catch (e) {
                        console.log('GlobalAutoConnect: connect() failed (expected if wallet locked):', e);
                    }
                    return;
                }

                // 3. Otherwise, find the adapter and re-select it via selectWallet
                //    This triggers the library's internal effect to set the adapter,
                //    and then the autoConnect effect in the library does the rest.
                if (selectWallet && wallets && wallets.length > 0) {
                    const match = wallets.find((w: any) => w.adapter && w.adapter.name === savedName);
                    if (match) {
                        selectWallet(savedName);
                    }
                }
            } catch (err) {
                console.log('GlobalAutoConnect: silent reconnect failed:', err);
            }
        };

        // Delay to let wallet extensions inject into the page
        const timer = setTimeout(tryReconnect, 800);
        return () => clearTimeout(timer);
    }, [connected, connecting, wallet, wallets, selectWallet, connect]);

    return null;
}
