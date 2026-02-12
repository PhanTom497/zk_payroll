'use client'

import { useWallet } from '@demox-labs/aleo-wallet-adapter-react'
import { useState } from 'react'

interface PayStub {
    id: string;
    amount: string;
    date: string;
    status: 'Claimed' | 'Unclaimed';
}

export default function EmployeePage() {
    const { wallet, publicKey } = useWallet()
    const [payHistory, setPayHistory] = useState<PayStub[]>([])
    const [isScanning, setIsScanning] = useState(false)

    // Mock function to simulate scanning for records
    const scanRecords = () => {
        setIsScanning(true)
        setTimeout(() => {
            setPayHistory([
                { id: 'pay_123', amount: '500u64', date: '2023-10-01', status: 'Claimed' },
                { id: 'pay_456', amount: '500u64', date: '2023-11-01', status: 'Unclaimed' }
            ])
            setIsScanning(false)
        }, 2000)
    }

    return (
        <main className="flex min-h-screen flex-col items-center p-24">
            <h1 className="text-4xl font-bold mb-8">Employee Portal</h1>

            <div className="w-full max-w-5xl">
                {/* Wallet Connection Status */}
                <div className="mb-8 p-6 bg-gray-100 dark:bg-zinc-800 rounded-lg">
                    <h2 className="text-2xl font-semibold mb-4">My Wallet</h2>
                    {publicKey ? (
                        <div className="text-green-500 break-all">
                            Connected: {publicKey}
                        </div>
                    ) : (
                        <div className="text-yellow-500">Not Connected - Please Connect Wallet</div>
                    )}
                </div>

                {/* Dashboard Content (Only if connected) */}
                {publicKey && (
                    <div className="p-6 border border-gray-300 rounded-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">My Pay Stubs</h2>
                            <button
                                onClick={scanRecords}
                                disabled={isScanning}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isScanning ? 'Decrypting Records...' : 'Scan & Decrypt'}
                            </button>
                        </div>

                        {payHistory.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left">
                                    <thead className="bg-gray-100 dark:bg-zinc-800">
                                        <tr>
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Amount</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payHistory.map((pay) => (
                                            <tr key={pay.id} className="border-b dark:border-zinc-700">
                                                <td className="p-3">{pay.date}</td>
                                                <td className="p-3 font-mono">{pay.amount}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs ${pay.status === 'Claimed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {pay.status}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <button className="text-blue-500 hover:underline">
                                                        View Proof
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                {isScanning ? 'Searching blockchain for records owned by you...' : 'No payment records found yet. Click Scan to check.'}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    )
}
