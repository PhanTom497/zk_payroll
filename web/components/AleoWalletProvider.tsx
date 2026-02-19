'use client'

import React, { useMemo } from 'react'
import { AleoWalletProvider as ProvableWalletProvider } from '@provablehq/aleo-wallet-adaptor-react'
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui'
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield'
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo'
import {
    DecryptPermission,
} from '@provablehq/aleo-wallet-adaptor-core'
import { Network } from '@provablehq/aleo-types'
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css'
import { PROGRAM_ID } from '../lib/zk-utils'

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
            new ShieldWalletAdapter({
                appName: 'ZK Payroll',
            }),
        ],
        []
    )

    return (
        <ProvableWalletProvider
            wallets={wallets}
            decryptPermission={DecryptPermission.AutoDecrypt}
            network={Network.TESTNET}
            autoConnect
            programs={[PROGRAM_ID]}
        >
            <WalletModalProvider>
                {children}
            </WalletModalProvider>
        </ProvableWalletProvider>
    )
}
