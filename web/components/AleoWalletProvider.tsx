'use client'

import React, { useState, useMemo } from 'react'
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
import { GlobalAutoConnect } from './GlobalAutoConnect'

export default function AleoWalletProvider({
    children,
}: {
    children: React.ReactNode
}) {
    const [wallets] = useState(() => [
        new LeoWalletAdapter({
            appName: 'ZK Payroll',
        }),
        new ShieldWalletAdapter({
            appName: 'ZK Payroll',
        }),
    ])

    // CRITICAL: Memoize the programs array to prevent the library's
    // internal effect from firing disconnect() on every re-render.
    // The library uses [decryptPermission, programs] as deps for
    // a cleanup effect that disconnects the wallet when these change.
    // An inline array literal creates a new reference each render.
    const programs = useMemo(() => [
        PROGRAM_ID,
        'credits.aleo',
        'test_usdcx_stablecoin.aleo',
        'test_usad_stablecoin.aleo'
    ], [])

    return (
        <ProvableWalletProvider
            wallets={wallets}
            decryptPermission={DecryptPermission.AutoDecrypt}
            network={Network.TESTNET}
            autoConnect
            programs={programs}
        >
            <WalletModalProvider>
                <GlobalAutoConnect />
                {children}
            </WalletModalProvider>
        </ProvableWalletProvider>
    )
}
