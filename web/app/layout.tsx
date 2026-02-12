import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AleoWalletProvider } from '@/components/AleoWalletProvider'
import ReactQueryProvider from '@/components/ReactQueryProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'ZK Payroll',
    description: 'Private DAO Payroll on Aleo',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <ReactQueryProvider>
                    <AleoWalletProvider>
                        {children}
                    </AleoWalletProvider>
                </ReactQueryProvider>
            </body>
        </html>
    )
}
