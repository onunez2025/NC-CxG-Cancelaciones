import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    Wallet,
    FileText,
    UploadCloud,
    Activity,
    Users,
    BarChart3,
    LogOut,
    Globe
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';

export function Sidebar({ className }: { className?: string }) {
    const { t, i18n } = useTranslation();
    const { theme } = useTheme();
    const { logout, hasPermission } = useAuth();

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');
    };

    const navItems = [
        { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
        { to: '/budget', icon: Wallet, label: t('nav.budget'), permission: 'budget.view' as const },
        { to: '/budget-vs-real', icon: BarChart3, label: 'Ppto vs Real', permission: 'budget.view' as const },
        { to: '/solped', icon: FileText, label: t('nav.solped'), permission: 'solped.view' as const },
        { to: '/tracking', icon: Activity, label: t('nav.tracking'), permission: 'tracking.view' as const },
        { to: '/vendors', icon: Users, label: t('nav.vendors'), permission: 'expenses.view' as const },
        { to: '/files', icon: UploadCloud, label: t('nav.files'), permission: 'files.view' as const },
    ];

    const filteredNavItems = navItems.filter(item =>
        !item.permission || hasPermission(item.permission)
    );

    return (
        <div className={cn(
            "flex flex-col h-full border-r border-border transition-colors duration-300",
            theme === 'dark' ? "bg-card text-card-foreground" : "bg-white text-slate-800",
            className
        )}>
            {/* Header / Logo */}
            <div className="p-6 flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center shrink-0 overflow-hidden">
                    <img src="/ebm-logo-.png" alt="EBM Logo" className="h-full w-full object-contain drop-shadow-sm rounded" />
                </div>
                <div>
                    <h1 className="font-bold text-lg leading-none tracking-tight">EBM</h1>
                    <p className="text-xs text-muted-foreground">{t('nav.app_subtitle')}</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {filteredNavItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                            isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                    >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-border space-y-2">
                <button
                    onClick={toggleLanguage}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                >
                    <Globe className="w-4 h-4" />
                    {i18n.language === 'es' ? 'Español' : 'English'}
                </button>

                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    {t('common.logout')}
                </button>
            </div>
        </div>
    );
}
