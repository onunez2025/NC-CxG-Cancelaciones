import { NavLink, Outlet } from 'react-router-dom';
// import { useTranslation } from 'react-i18next';
import { Users, Shield, Building2, Wallet, Briefcase, Calculator, Terminal } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

export function ConfigLayout() {
    //   const { t } = useTranslation();
    const { hasPermission } = useAuth();

    const navItems = [
        { to: '/config/users', icon: Users, label: 'Usuarios', permission: 'ebm.config.users' },
        { to: '/config/roles', icon: Shield, label: 'Roles', permission: 'ebm.config.roles' },
        { to: '/config/audit', icon: Terminal, label: 'Auditoría', permission: 'ebm.config.users' },
        { to: '/config/cecos', icon: Building2, label: 'Centros de Coste' },
        { to: '/config/accounts', icon: Wallet, label: 'Cuentas Contables' },
        { to: '/config/managements', icon: Briefcase, label: 'Gerencias' },
        { to: '/config/exchange-rates', icon: Calculator, label: 'Tipos de Cambio' },
    ];

    const filteredNavItems = navItems.filter(item => !item.permission || hasPermission(item.permission as any));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[14rem_1fr] gap-6 flex-1 min-h-0">
            {/* Secondary Sidebar */}
            <aside className="relative">
                <div className="lg:sticky lg:top-0 z-30 lg:mb-8 bg-card rounded-lg border border-border shadow-sm p-3 space-y-1">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wider px-3 py-2">Configuración</p>
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary/5 dark:bg-primary/10 text-primary"
                                    : "text-foreground hover:bg-card hover:text-foreground"
                            )}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </NavLink>
                    ))}
                </div>
            </aside>

            {/* Content Area */}
            <div className="flex-1 min-w-0">
                <Outlet />
            </div>
        </div>
    );
}
