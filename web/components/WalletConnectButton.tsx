'use client'

import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui'
import { Network } from '@provablehq/aleo-types'
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css'

export const WalletConnectButton = () => {
    const { wallet, address, disconnect, connecting } = useWallet()
    const { setVisible } = useWalletModal()
    const publicKey = address; // Alias for compatibility

    const handleConnect = () => {
        setVisible(true)
    }

    if (publicKey) {
        return (
            <button
                onClick={() => disconnect()}
                className="group flex items-center gap-3 px-4 py-2 bg-glass border border-glass-border rounded-full hover:bg-glass-hover transition-all duration-300 backdrop-blur-md"
            >
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                <span className="font-mono text-sm text-gray-200 group-hover:text-white transition-colors">
                    {publicKey.slice(0, 6)}...{publicKey.slice(-4)}
                </span>
            </button>
        )
    }

    return (
        <button
            onClick={handleConnect}
            disabled={connecting}
            className="glass-button bg-white text-black px-6 py-2 rounded-full font-semibold hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {connecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
    )
}
