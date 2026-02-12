'use client'

import { useWallet } from '@demox-labs/aleo-wallet-adapter-react'
import { WalletAdapterNetwork, DecryptPermission } from '@demox-labs/aleo-wallet-adapter-base'
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo'

export const WalletConnectButton = () => {
    const { wallets, select, wallet, publicKey, connect, disconnect, connecting } = useWallet()

    const handleConnect = async () => {
        const adapter = wallet?.adapter || wallets?.[0]?.adapter;

        if (!adapter) {
            console.error("No wallet adapter found");
            return;
        }

        // Ensure it is selected in the provider state
        if (!wallet) {
            select(adapter.name);
        }

        // Connect directly via the adapter to avoid React state lag
        try {
            await adapter.connect(DecryptPermission.OnChainHistory, "testnetbeta" as WalletAdapterNetwork)
        } catch (error) {
            console.error("Connection failed:", error);
        }
    }

    if (publicKey) {
        return (
            <button
                onClick={() => disconnect()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2 font-mono text-sm"
            >
                {publicKey.slice(0, 6)}...{publicKey.slice(-4)}
                <span className="ml-2 text-xs opacity-75">(Disconnect)</span>
            </button>
        )
    }

    return (
        <button
            onClick={handleConnect}
            disabled={connecting}
            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50 font-bold"
        >
            {connecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
    )
}
