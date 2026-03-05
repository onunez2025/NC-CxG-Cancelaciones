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
    Settings,
    LogOut,
    Moon,
    Sun,
    Globe
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';

export function Sidebar({ className }: { className?: string }) {
    const { t, i18n } = useTranslation();
    const { theme, setTheme } = useTheme();
    const { user, logout } = useAuth();

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');
    };

    const navItems = [
        { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
        { to: '/budget', icon: Wallet, label: t('nav.budget') },
        { to: '/budget-vs-real', icon: BarChart3, label: 'Ppto vs Real' },
        { to: '/solped', icon: FileText, label: t('nav.solped') },
        { to: '/files', icon: UploadCloud, label: t('nav.files') },
        { to: '/tracking', icon: Activity, label: t('nav.tracking') },
        { to: '/vendors', icon: Users, label: t('nav.vendors') },
        { to: '/config', icon: Settings, label: t('nav.config') },
    ];

    return (
        <div className={cn(
            "flex flex-col h-full border-r border-border transition-colors duration-300",
            theme === 'dark' ? "bg-card text-card-foreground" : "bg-slate-50/80 text-slate-800",
            className
        )}>
            {/* Header / Logo */}
            <div className="p-6 flex items-center gap-3">
                <div className="w-9 h-9 flex items-center justify-center shrink-0">
                    <img src="/ebm-logo.png" alt="EBM Logo" className="w-full h-full object-contain drop-shadow-sm" />
                </div>
                <div>
                    <h1 className="font-bold text-lg leading-none tracking-tight">EBM</h1>
                    <p className="text-xs text-muted-foreground">{t('nav.app_subtitle')}</p>
                </div>
            </div>

            {/* User Profile (Collapsed version) */}
            <div className="px-4 py-2">
                <NavLink
                    to="/profile"
                    className={({ isActive }) => cn(
                        "flex items-center gap-3 p-3 rounded-lg transition-all group border border-transparent",
                        isActive
                            ? "bg-primary/10 border-primary/20 shadow-sm"
                            : "bg-background/50 hover:bg-background hover:shadow-md cursor-pointer"
                    )}
                >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            user?.username?.substring(0, 2).toUpperCase() || 'CM'
                        )}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                            {user?.username || 'Carlos Mendoza'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{t('nav.role_admin')}</p>
                    </div>
                </NavLink>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
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

            {/* Footer / Theme Toggle / Logout */}
            <div className="p-4 border-t border-border space-y-2">
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                >
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    {theme === 'dark' ? t('nav.light_mode') : t('nav.dark_mode')}
                </button>

                <button
                    onClick={toggleLanguage}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                >
                    <Globe className="w-4 h-4" />
                    {i18n.language === 'es' ? 'Español' : 'English'}
                </button>

                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    {t('common.logout')}
                </button>
            </div>
        </div>
    );
}
