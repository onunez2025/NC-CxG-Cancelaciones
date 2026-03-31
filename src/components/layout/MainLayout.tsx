import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { AppSwitcher } from './AppSwitcher';
import { cn } from '../../utils/cn';

interface MainLayoutProps {
    children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="h-screen bg-background text-foreground flex overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden transition-opacity duration-300",
                    sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 lg:static lg:translate-x-0",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="h-full flex flex-col">
                    <div className="flex items-center justify-end p-4 lg:hidden">
                        <button onClick={() => setSidebarOpen(false)}>
                            <X className="w-6 h-6 text-muted-foreground" />
                        </button>
                    </div>
                    <Sidebar className="flex-1" />
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Global Header */}
                <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0 z-30">
                    <div className="flex items-center gap-4 lg:hidden">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 -ml-2 text-muted-foreground hover:bg-accent rounded-md"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex items-center gap-2">
                            <img src="/ebm-logo-.png" alt="EBM Logo" className="w-6 h-6 object-contain" />
                            <span className="font-semibold text-lg">EBM</span>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex justify-end">
                        <AppSwitcher currentAppId="ebm" />
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-8 flex flex-col">
                    <div className="flex-1 mx-auto max-w-7xl w-full flex flex-col min-h-0 animate-in fade-in zoom-in duration-300">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
