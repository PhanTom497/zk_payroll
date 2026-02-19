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
