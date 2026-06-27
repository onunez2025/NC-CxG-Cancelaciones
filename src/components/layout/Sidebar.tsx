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
    Calendar,
    Map
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../hooks/useAuth';
import type { Permission } from '../../types';

// SIATC DESIGN SYSTEM IMPORTS
import { useAppConfig } from '../../context/AppConfigContext';
import { SIATC_THEME } from '../../utils/siatc-theme';

export function Sidebar({ className, isEffectivelyExpanded = true, onNavigate }: { className?: string; isEffectivelyExpanded?: boolean; onNavigate?: () => void }) {
    const { t, i18n } = useTranslation();
    const { logout, hasPermission } = useAuth();
    const appConfig = useAppConfig();
    const logoUrl = appConfig?.logoUrl || '/Logo.png';
    const showFull = isEffectivelyExpanded;
    const effectiveOnNavigate = SIATC_THEME.SIDEBAR.MOBILE_CLOSE_ON_NAVIGATE ? onNavigate : undefined;

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
        { to: '/fsm/mapa', icon: Map, label: 'Mapa Servicios', permission: 'cxg.fsm.view' as const },
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
            {/* Header / Logo */}
            {showFull ? (
                <div className="p-6 flex items-center gap-4 border-b border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
                    <div className="w-12 h-12 flex items-center justify-center shrink-0 overflow-hidden transition-transform hover:scale-105">
                        <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h1 className="font-bold text-lg leading-none tracking-tight text-foreground uppercase truncate">M. Atención</h1>
                        <p className="text-[9px] font-black text-primary tracking-[0.05em] uppercase mt-1 opacity-70 whitespace-nowrap">Gestión y Seguimiento</p>
                    </div>
                </div>
            ) : (
                <div className="px-1 py-4 flex flex-col items-center gap-2 border-b border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
                    <div className="w-9 h-9 flex items-center justify-center shrink-0 overflow-hidden">
                        <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                    </div>
                </div>
            )}

            {/* Navigation */}
            {showFull ? (
                <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] font-black text-muted-foreground tracking-[0.2em] px-4 py-2 uppercase opacity-40">Menú Principal</p>
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={effectiveOnNavigate}
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
            ) : (
                <nav className="flex-1 px-1 py-4 space-y-2 overflow-y-auto custom-scrollbar flex flex-col items-center">
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            title={item.label}
                            onClick={effectiveOnNavigate}
                            className={({ isActive }) => cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-md"
                                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                            )}
                        >
                            <item.icon className="w-5 h-5 shrink-0" />
                        </NavLink>
                    ))}
                </nav>
            )}

            {/* Footer */}
            <div className={cn(
                "border-t border-border/50 bg-muted/20",
                showFull ? 'p-4 space-y-3' : 'p-2 flex flex-col items-center gap-2'
            )}>
                {showFull ? (
                    <>
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
                    </>
                ) : (
                    <>
                        <button
                            onClick={toggleLanguage}
                            title={i18n.language === 'es' ? 'Cambiar idioma' : 'Change language'}
                            className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                        >
                            <Globe className="w-4 h-4" />
                        </button>
                        <button
                            onClick={logout}
                            title={t('common.logout')}
                            className="w-9 h-9 flex items-center justify-center rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

// Fix Deploy: 03/31/2026 16:37:11
