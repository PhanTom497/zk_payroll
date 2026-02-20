'use client';

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Wallet,
    ShieldCheck,
    Layers,
    FileCheck,
    ArrowLeft,
    Signal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WalletConnectButton } from "@/components/WalletConnectButton";

const navItems = [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    { title: "Deposit Fund", url: "/admin/deposit", icon: Wallet },
    { title: "Authorize Payroll", url: "/admin/authorize", icon: ShieldCheck },
    { title: "Batch Run", url: "/admin/batch", icon: Layers },
    { title: "Compliance & Audit", url: "/admin/compliance", icon: FileCheck },
];

interface AdminLayoutProps {
    children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
    const pathname = usePathname();

    return (
        <div className="flex min-h-screen relative z-10 font-sans">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/10 bg-black/40 backdrop-blur-xl flex flex-col fixed inset-y-0 left-0 z-50">
                <div className="p-6 border-b border-white/10">
                    <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm">Back to Home</span>
                    </Link>
                    <h2 className="text-xl font-bold mt-4 text-foreground">Admin Portal</h2>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive =
                            item.url === "/admin"
                                ? pathname === "/admin"
                                : pathname.startsWith(`${item.url}/`);

                        return (
                            <Link
                                key={item.url}
                                href={item.url}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-300 group relative",
                                    isActive
                                        ? "bg-white/10 text-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-foreground rounded-full" />
                                )}
                                <item.icon className="w-4 h-4" />
                                <span>{item.title}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Network status */}
                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Signal className="w-3 h-3" />
                        <span>Aleo Testnet</span>
                        <span className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 flex flex-col ml-64">
                {/* Top bar */}
                <header className="h-16 border-b border-white/10 bg-black/20 backdrop-blur-sm flex items-center justify-end px-6 sticky top-0 z-40">
                    <WalletConnectButton />
                </header>

                <div className="flex-1 p-8 overflow-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
