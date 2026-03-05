import { NavLink, Outlet } from 'react-router-dom';
// import { useTranslation } from 'react-i18next';
import { Users, Shield, Building2, Wallet, Briefcase, Calculator } from 'lucide-react';
import { cn } from '../../utils/cn';

export function ConfigLayout() {
    //   const { t } = useTranslation();

    const navItems = [
        { to: '/config/users', icon: Users, label: 'Usuarios' },
        { to: '/config/roles', icon: Shield, label: 'Roles' },
        { to: '/config/cecos', icon: Building2, label: 'Centros de Coste' },
        { to: '/config/accounts', icon: Wallet, label: 'Cuentas Contables' },
        { to: '/config/managements', icon: Briefcase, label: 'Gerencias' },
        { to: '/config/exchange-rates', icon: Calculator, label: 'Tipos de Cambio' },
    ];

    return (
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-theme(spacing.24))]">
            {/* Secondary Sidebar */}
            <aside className="w-full md:w-64 shrink-0">
                <nav className="flex flex-col space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </aside>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto pr-1">
                <Outlet />
            </main>
        </div>
    );
}
