import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    XCircle,
    FileText,
    LogOut,
    Globe,
    ChevronRight,
    Clock,
    AlertCircle,
    Wrench,
    Calendar
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../hooks/useAuth';
import type { Permission } from '../../types';

// SIATC DESIGN SYSTEM IMPORTS
import { SIATC_THEME } from '../../utils/siatc-theme';

export function Sidebar({ className }: { className?: string }) {
    const { t, i18n } = useTranslation();
    const { logout, hasPermission } = useAuth();

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');
    };

    interface NavItem {
        to: string;
        icon: React.ElementType;
        label: string;
        permission?: Permission;
    }

    const navItems: NavItem[] = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/cancelaciones', icon: XCircle, label: 'Cancelaciones', permission: 'cxg.cancelaciones.view' as const },
        { to: '/cxg-nc', icon: FileText, label: 'CxG & NC', permission: 'cxg.cxg_nc.view' as const },
        { to: '/fsm-tracking', icon: Clock, label: 'Horarios Visitas', permission: 'cxg.fsm.view' as const },
        { to: '/fsm/programa-supervisores', icon: Calendar, label: 'Prog. Supervisores', permission: 'cxg.programa_supervisores.view' as const },
        { to: '/emergencias', icon: Wrench, label: 'Emergencias', permission: 'cxg.emergencias.view' as const },
        { to: '/contact-center/casos-especiales', icon: AlertCircle, label: 'Casos Especiales', permission: 'cxg.casos_especiales.view' as const },
    ];

    const filteredNavItems = navItems.filter(item =>
        !item.permission || hasPermission(item.permission)
    );

    return (
        <div className={cn(
            SIATC_THEME.LAYOUT.SIDEBAR_INNER,
            className
        )}>
            {/* Header / Logo: SIATC High Density */}
            <div className="p-6 flex items-center gap-4 border-b border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="w-12 h-12 flex items-center justify-center shrink-0 overflow-hidden bg-white rounded-2xl shadow-lg shadow-primary/5 border border-primary/10 p-1.5 transition-transform hover:scale-105">
                    <img src="/Logo.png" alt="Logo" className="h-full w-full object-contain" />
                </div>
                <div className="flex flex-col min-w-0">
                    <h1 className="font-bold text-lg leading-none tracking-tight text-foreground uppercase truncate">M. Atención</h1>
                    <p className="text-[9px] font-black text-primary tracking-[0.05em] uppercase mt-1 opacity-70 whitespace-nowrap">Gestión y Seguimiento</p>
                </div>
            </div>

            {/* Navigation: High Density Standard */}
            <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
                <p className="text-[10px] font-black text-muted-foreground tracking-[0.2em] px-4 py-2 uppercase opacity-40">Menú Principal</p>
                {filteredNavItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => isActive
                            ? SIATC_THEME.LAYOUT.SIDEBAR_ITEM_ACTIVE
                            : SIATC_THEME.LAYOUT.SIDEBAR_ITEM_INACTIVE
                        }
                    >
                        <div className="flex items-center gap-3 relative z-10">
                            <item.icon className={cn(
                                "w-5 h-5 transition-transform duration-500",
                                "group-hover/item:scale-110"
                            )} />
                            <span className="tracking-tight">{item.label}</span>
                        </div>
                        <ChevronRight className={cn(
                            "w-4 h-4 transition-all duration-300 opacity-0 -translate-x-2 relative z-10",
                            "group-hover/item:opacity-100 group-hover/item:translate-x-0"
                        )} />
                    </NavLink>
                ))}
            </nav>

            {/* Footer: SIATC Standard */}
            <div className="p-4 border-t border-border/50 space-y-3 bg-muted/20">
                <button
                    onClick={toggleLanguage}
                    className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-white rounded-2xl transition-all border border-transparent hover:border-border/50 hover:shadow-sm group/lang"
                >
                    <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-primary group-hover/lang:rotate-12 transition-transform" />
                        <span className="uppercase tracking-widest">{i18n.language === 'es' ? 'Español' : 'English'}</span>
                    </div>
                </button>

                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl transition-all shadow-rose-500/10 hover:shadow-lg uppercase tracking-[0.2em]"
                >
                    <LogOut className="w-4 h-4" />
                    {t('common.logout')}
                </button>
            </div>
        </div>
    );
}

// Fix Deploy: 03/31/2026 16:37:11
