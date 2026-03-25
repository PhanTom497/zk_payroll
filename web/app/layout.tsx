import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import dynamic from 'next/dynamic'
import ReactQueryProvider from '@/components/ReactQueryProvider'
import { Toaster } from "@/components/ui/sonner"
import GlobalNav from '@/components/GlobalNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'ZK Payroll',
    description: 'Private DAO Payroll on Aleo',
}

const AleoWalletProvider = dynamic(
    () => import('@/components/AleoWalletProvider'),
    { ssr: false }
)

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
                        <GlobalNav />
                        {children}
                        <Toaster />
                    </AleoWalletProvider>
                </ReactQueryProvider>
            </body>
        </html>
    )
}
