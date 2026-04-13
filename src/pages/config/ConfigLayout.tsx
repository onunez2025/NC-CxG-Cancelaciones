import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom';
import { Users, Shield, Building2, Wallet, Briefcase, Calculator, Terminal, ChevronRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

export default function ConfigLayout() {
    const { hasPermission } = useAuth();
    const location = useLocation();

    const configItems = [
        { to: '/config/users', icon: Users, label: 'Usuarios', permission: 'ebm.config.users' as const },
        { to: '/config/roles', icon: Shield, label: 'Roles', permission: 'ebm.config.roles' as const },
        { to: '/config/audit', icon: Terminal, label: 'Auditoría', permission: 'ebm.config.users' as const },
        { to: '/config/cecos', icon: Building2, label: 'Centros de Coste' },
        { to: '/config/accounts', icon: Wallet, label: 'Cuentas Contables' },
        { to: '/config/managements', icon: Briefcase, label: 'Gerencias' },
        { to: '/config/exchange-rates', icon: Calculator, label: 'Tipos de Cambio' },
    ];

    const filteredItems = configItems.filter(item =>
        !item.permission || hasPermission(item.permission as any)
    );

    // If we are at the root /config, redirect to the first authorized item
    if (location.pathname === '/config' || location.pathname === '/config/') {
        if (filteredItems.length > 0) {
            return <Navigate to={filteredItems[0].to} replace />;
        }
    }

    return (
        <div className="flex-1 h-full overflow-hidden flex flex-col p-4 lg:p-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-8 h-full min-h-0">
                {/* Secondary Sidebar: SIATC Premium Style */}
                <aside className="hidden lg:flex flex-col gap-6 shrink-0">
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-4 mb-4">
                                Configuración de Sistema
                            </h3>
                            <nav className="space-y-1">
                                {filteredItems.map(item => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) => cn(
                                            "group flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all relative overflow-hidden",
                                            isActive
                                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <div className="flex items-center gap-3 relative z-10">
                                                    <item.icon className={cn(
                                                        "w-4 h-4 transition-transform group-hover:scale-110",
                                                        isActive ? "text-primary-foreground" : "text-primary"
                                                    )} />
                                                    <span>{item.label}</span>
                                                </div>
                                                {location.pathname === item.to && (
                                                    <ChevronRight className="w-4 h-4 text-primary-foreground/50 animate-in slide-in-from-left-2" />
                                                )}
                                            </>
                                        )}
                                    </NavLink>
                                ))}
                            </nav>
                        </div>

                        {/* Visual Divider / Branding */}
                        <div className="px-4 pt-4 border-t border-border/50">
                            <div className="bg-muted/30 rounded-2xl p-4 border border-border/50 relative overflow-hidden group">
                                <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                    <Shield className="w-20 h-20" />
                                </div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest relative z-10">Ecosistema</p>
                                <p className="text-xs font-black text-foreground relative z-10 mt-1">SIATC v3.0</p>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Mobile Navigation (Simplified) */}
                <div className="lg:hidden shrink-0 pb-2 overflow-x-auto no-scrollbar flex items-center gap-2">
                    {filteredItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                                isActive
                                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                            )}
                        >
                            <item.icon className="w-3.5 h-3.5" />
                            {item.label}
                        </NavLink>
                    ))}
                </div>

                {/* Config Content */}
                <main className="flex-1 min-w-0 h-full flex flex-col min-h-0 bg-background/50 rounded-3xl lg:p-0">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
