import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { User, Lock, Eye, EyeOff, Moon, Sun, Globe } from 'lucide-react';
import { cn } from '../utils/cn';
import { API_BASE_URL } from '../services/apiClient';

export function LoginPage() {
    const { t, i18n } = useTranslation();
    const { login } = useAuth();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || t('auth.errors.invalid'));
            }

            const { user, token } = await response.json();

            // Success, register session in Context
            login(user, token);
            navigate('/dashboard');

        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || t('auth.errors.invalid') || 'Credenciales inválidas');
        } finally {
            setLoading(false);
        }
    };

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');
    };

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground transition-colors duration-300">
            {/* Left Side - Brand / Visual */}
            <div className="hidden md:flex flex-col justify-between w-1/2 bg-slate-900 text-white p-12 relative overflow-hidden">
                {/* Abstract Background Pattern */}
                <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:60px_60px]" />
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-900/50" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 flex items-center justify-center">
                            <img src="/ebm-logo.png" alt="EBM Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">EBM</span>
                    </div>
                    <h1 className="text-5xl font-bold mb-4 leading-tight">
                        Enterprise<br />Budget<br />Manager
                    </h1>
                    <p className="text-slate-400 text-lg max-w-md">
                        Control integral de presupuesto, solicitudes y proveedores para gerencias de alto rendimiento.
                    </p>
                </div>

                <div className="relative z-10 text-sm text-slate-500">
                    © 2026 Enterprise Budget Manager. All rights reserved.
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 bg-background relative">
                {/* Top Right Controls */}
                <div className="absolute top-6 right-6 flex items-center gap-4">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full hover:bg-accent text-muted-foreground transition-colors"
                        title="Toggle Theme"
                    >
                        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={toggleLanguage}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border hover:bg-accent text-sm font-medium transition-colors"
                    >
                        <Globe className="w-4 h-4" />
                        {i18n.language === 'es' ? 'ES' : 'EN'}
                    </button>
                </div>

                <div className="w-full max-w-md space-y-8">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold tracking-tight">{t('common.welcome')}</h2>
                        <p className="mt-2 text-muted-foreground text-sm">
                            {t('auth.subtitle')}
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6 mt-8">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 ml-1">
                                    {t('auth.username')}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2.5 bg-input/50 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                                        placeholder="Usuario"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 ml-1">
                                    {t('auth.password')}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-10 pr-10 py-2.5 bg-input/50 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                                        placeholder="Contraseña"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded border-input text-primary focus:ring-primary" />
                                <span className="text-muted-foreground">{t('auth.rememberMe')}</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setError('Por favor, contacta a tu administrador de sistemas para que te asigne una nueva contraseña temporal.')}
                                className="font-medium text-primary hover:text-primary/80 transition-colors bg-transparent border-none p-0 cursor-pointer"
                            >
                                {t('auth.forgotPassword')}
                            </button>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium text-center animate-in fade-in slide-in-from-top-1">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                "w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed",
                                loading && "animate-pulse"
                            )}
                        >
                            {loading ? t('common.loading') : t('auth.loginButton')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
