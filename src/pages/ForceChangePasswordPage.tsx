import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, KeyRound, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { API_BASE_URL } from '../services/apiClient';
import { SIATC_THEME } from '../utils/siatc-theme';
import { cn } from '../utils/cn';

export const ForceChangePasswordPage = () => {
    const navigate = useNavigate();
    const { user, login } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas nuevas no coinciden.');
            return;
        }

        if (newPassword.length < 6) {
            setError('La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (newPassword === currentPassword) {
            setError('La nueva contraseña no puede ser igual a tu contraseña temporal.');
            return;
        }

        setIsLoading(true);

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_BASE_URL}/auth/force-change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al cambiar la contraseña');
            }

            // Update user context to reflect they no longer need to change password
            if (user) {
                const updatedUser = { ...user, requires_password_change: false };
                login(updatedUser, token || undefined);
            }

            // Redirect automatically handled by App.tsx ProtectedRoute state update, 
            // but just in case:
            navigate('/dashboard', { replace: true });

        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al cambiar contraseña');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={SIATC_THEME.LOGIN_LAYOUT.CENTERED_CONTAINER}>
            <div className={SIATC_THEME.LOGIN_LAYOUT.CENTERED_HEADER}>
                <div className="flex justify-center">
                    <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                        <ShieldAlert className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                </div>
                <h2 className={SIATC_THEME.LOGIN_LAYOUT.TITLE}>
                    Cambio de Contraseña Obligatorio
                </h2>
                <p className={SIATC_THEME.LOGIN_LAYOUT.SUBTITLE}>
                    Por motivos de seguridad, debes actualizar tu contraseña temporal antes de continuar al sistema.
                </p>
            </div>

            <div className="mt-8 w-full max-w-md mx-auto">
                <div className={SIATC_THEME.LOGIN_LAYOUT.CARD}>
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium text-center animate-in fade-in slide-in-from-top-1">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-1.5 ml-1">Contraseña Temporal Actual</label>
                            <div className={SIATC_THEME.LOGIN_LAYOUT.INPUT_WRAPPER}>
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                    <KeyRound className="h-5 w-5" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className={SIATC_THEME.LOGIN_LAYOUT.INPUT}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Contraseña temporal"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5 ml-1">Nueva Contraseña</label>
                            <div className={SIATC_THEME.LOGIN_LAYOUT.INPUT_WRAPPER}>
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                    <KeyRound className="h-5 w-5" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className={SIATC_THEME.LOGIN_LAYOUT.INPUT}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5 ml-1">Confirmar Nueva Contraseña</label>
                            <div className={SIATC_THEME.LOGIN_LAYOUT.INPUT_WRAPPER}>
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                    <KeyRound className="h-5 w-5" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className={SIATC_THEME.LOGIN_LAYOUT.INPUT}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repite la nueva contraseña"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={cn(
                                    SIATC_THEME.COMPONENTS.BUTTON_PRIMARY,
                                    "w-full flex justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                                )}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                        Actualizando...
                                    </>
                                ) : (
                                    <>
                                        Actualizar Contraseña e Ingresar
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
