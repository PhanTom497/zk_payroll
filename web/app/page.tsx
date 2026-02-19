import Link from 'next/link'
import { WalletConnectButton } from '@/components/WalletConnectButton'

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white opacity-[0.03] blur-[120px] rounded-full pointer-events-none" />

            <div className="z-10 w-full max-w-5xl flex flex-col items-center text-center">
                {/* Header / Nav */}
                <div className="absolute top-8 right-8">
                    <WalletConnectButton />
                </div>

                {/* Hero Section */}
                <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">
                    ZK Payroll
                </h1>
                <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mb-16 font-light">
                    Private, verifiable, and autonomous salary payments on Aleo.
                </p>

                {/* Navigation Cards */}
                <div className="grid md:grid-cols-3 gap-6 w-full px-4">

                    <Link href="/admin" className="group">
                        <div className="glass-card h-full flex flex-col items-start text-left hover:bg-glass-hover transition-all duration-300 border-l-4 border-l-transparent hover:border-l-white">
                            <h2 className="text-2xl font-semibold mb-3 group-hover:text-white transition-colors">
                                Admin Portal <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">-&gt;</span>
                            </h2>
                            <p className="text-sm text-gray-500 group-hover:text-gray-300 transition-colors">
                                Manage liquidity pools, authorize payroll, and batch issue salaries privately.
                            </p>
                        </div>
                    </Link>

                    <Link href="/employee" className="group">
                        <div className="glass-card h-full flex flex-col items-start text-left hover:bg-glass-hover transition-all duration-300 border-l-4 border-l-transparent hover:border-l-white">
                            <h2 className="text-2xl font-semibold mb-3 group-hover:text-white transition-colors">
                                Employee Portal <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">-&gt;</span>
                            </h2>
                            <p className="text-sm text-gray-500 group-hover:text-gray-300 transition-colors">
                                View your active paychecks, decrypt your records, and withdraw funds securely.
                            </p>
                        </div>
                    </Link>

                    <Link href="/auditor" className="group">
                        <div className="glass-card h-full flex flex-col items-start text-left hover:bg-glass-hover transition-all duration-300 border-l-4 border-l-transparent hover:border-l-white">
                            <h2 className="text-2xl font-semibold mb-3 group-hover:text-white transition-colors">
                                Auditor Portal <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">-&gt;</span>
                            </h2>
                            <p className="text-sm text-gray-500 group-hover:text-gray-300 transition-colors">
                                Verify solvency, audit public spending, and ensure compliance without compromising privacy.
                            </p>
                        </div>
                    </Link>

                </div>
            </div>
        </main>
    )
}
