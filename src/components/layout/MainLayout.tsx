import { useState } from 'react';
import { Menu, X, Sun, Moon, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AppSwitcher } from './AppSwitcher';
import { cn } from '../../utils/cn';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';

interface MainLayoutProps {
    children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const { user, hasPermission } = useAuth();

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

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
                <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-card sticky top-0 z-30 min-h-[56px]">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 -ml-2 text-muted-foreground hover:bg-accent rounded-md lg:hidden"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex items-center gap-2">
                            <img src="/ebm-logo-.png" alt="EBM Logo" className="w-8 h-8 object-contain" />
                            <span className="font-bold text-lg hidden sm:inline-block">EBM</span>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex justify-end items-center gap-2 sm:gap-4">
                        {/* Theme Toggle */}
                        <button 
                            onClick={toggleTheme}
                            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 rounded-full transition-colors duration-200 focus:outline-none"
                            title="Cambiar Tema"
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>

                        {/* Config (Gear Icon) */}
                        {hasPermission('ebm.config.users') && (
                            <NavLink 
                                to="/config"
                                className={({ isActive }) => cn(
                                    "p-2 rounded-full transition-colors duration-200 focus:outline-none",
                                    isActive 
                                        ? "text-primary bg-primary/10" 
                                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                                )}
                                title="Configuración"
                            >
                                <Settings className="w-5 h-5" />
                            </NavLink>
                        )}

                        <AppSwitcher currentAppId="ebm" />

                        {/* User Profile Avatar */}
                        <NavLink 
                            to="/profile"
                            className={({ isActive }) => cn(
                                "flex items-center gap-2 p-1 rounded-full hover:bg-accent group transition-all",
                                isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                            )}
                            title="Mi Perfil"
                        >
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0 border border-transparent group-hover:border-primary/50">
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    user?.username?.substring(0, 2).toUpperCase() || 'CM'
                                )}
                            </div>
                        </NavLink>
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
