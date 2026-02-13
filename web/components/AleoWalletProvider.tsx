'use client'

import { WalletProvider } from '@demox-labs/aleo-wallet-adapter-react'
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo'
import {
    DecryptPermission,
    WalletAdapterNetwork,
} from '@demox-labs/aleo-wallet-adapter-base'
import { useMemo } from 'react'


export const AleoWalletProvider = ({
    children,
}: {
    children: React.ReactNode
}) => {
    const wallets = useMemo(
        () => [
            new LeoWalletAdapter({
                appName: 'ZK Payroll',
            }),
        ],
        []
    )

    return (
        <WalletProvider
            wallets={wallets}
            decryptPermission={DecryptPermission.OnChainHistory}
            network={WalletAdapterNetwork.TestnetBeta}
            autoConnect
        >
            {children}
        </WalletProvider>
    )
}
