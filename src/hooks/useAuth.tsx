import { useState, useEffect, useContext, createContext, useCallback } from 'react';
import type { User, Permission, SessionConfig } from '../types';
import { StorageService } from '../services/storageService';
import { API_BASE_URL } from '../services/apiClient';

interface AuthContextType {
    user: User | null;
    sessionConfig: SessionConfig | null;
    login: (user: User, token?: string, sessionConfig?: SessionConfig) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
    hasPermission: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    sessionConfig: null,
    login: () => { },
    logout: () => { },
    isAuthenticated: false,
    isLoading: true,
    hasPermission: () => false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(() => {
        try { const s = localStorage.getItem('session_config'); return s ? JSON.parse(s) : null; } catch { return null; }
    });

    const login = useCallback((newUser: User, token?: string, newSessionConfig?: SessionConfig) => {
        setUser(newUser);
        StorageService.setCurrentUser(newUser);
        if (newSessionConfig) {
            setSessionConfig(newSessionConfig);
            localStorage.setItem('session_config', JSON.stringify(newSessionConfig));
        }
        if (token) {
            StorageService.setToken(token);

            // Set shared cookie for SSO across subdomains
            const isProd = window.location.hostname.endsWith('.siatc.cloud');
            const cookieDomain = isProd ? '; domain=.siatc.cloud' : '';
            document.cookie = `token=${token}; path=/${cookieDomain}; max-age=${24 * 60 * 60}; SameSite=Lax; Secure=${isProd ? 'true' : 'false'}`;
        }
    }, []);

    const logout = useCallback(() => {
        const token = StorageService.getToken();
        if (token) {
            fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            }).catch(() => { /* token ya expirado o red caída — limpiar igual */ });
        }

        setUser(null);
        setSessionConfig(null);
        localStorage.removeItem('session_config');
        StorageService.remove('current_user');
        StorageService.remove('auth_token');

        // Clear shared cookie
        const isProd = window.location.hostname.endsWith('.siatc.cloud');
        const cookieDomain = isProd ? '; domain=.siatc.cloud' : '';
        document.cookie = `token=; path=/${cookieDomain}; max-age=0; SameSite=Lax; Secure=${isProd ? 'true' : 'false'}`;
    }, []);

    useEffect(() => {
        const validateSession = async () => {
            try {
                const getCookie = (name: string): string | null => {
                    const value = `; ${document.cookie}`;
                    const parts = value.split(`; ${name}=`);
                    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
                    return null;
                };

                const decodeJwt = (t: string): Record<string, unknown> | null => {
                    try {
                        const base64Url = t.split('.')[1];
                        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map((c) => {
                            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                        }).join(''));
                        return JSON.parse(jsonPayload) as Record<string, unknown>;
                    } catch (_e) {
                        return null;
                    }
                };

                const cookieToken = getCookie('token');
                const localToken = StorageService.getToken();
                let activeToken = localToken;

                if (cookieToken) {
                    if (cookieToken !== localToken) {
                        StorageService.setToken(cookieToken);
                        activeToken = cookieToken;
                        
                        const payload = decodeJwt(cookieToken);
                        if (payload) {
                            const preHydratedUser = {
                                id: payload.id,
                                username: payload.username,
                                role_id: payload.role_id,
                                role_name: payload.role_name,
                                permissions: payload.permissions || [],
                                apps: payload.apps
                            };
                            setUser(preHydratedUser as unknown as User);
                            StorageService.setCurrentUser(preHydratedUser);
                        }
                    }
                } else {
                    if (localToken) {
                        logout();
                        window.location.href = '/login?expired=true';
                        return;
                    }
                }

                if (!activeToken) {
                    setIsLoading(false);
                    return;
                }

                const response = await fetch(`${API_BASE_URL}/auth/me`, {
                    headers: { 'Authorization': `Bearer ${activeToken}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);
                    StorageService.setCurrentUser(data.user);
                } else {
                    logout();
                    window.location.href = '/login?expired=true';
                }
            } catch (error) {
                console.error("Session validation error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        validateSession();
    }, [logout]);

    const hasPermission = (permission: Permission): boolean => {
        if (!user) return false;
        
        // Administrador bypass
        if (user.role_name?.toLowerCase() === 'administrador') return true;
        
        if (!user.permissions) return false;
        return user.permissions.includes(permission);
    };

    return (
        <AuthContext.Provider value={{ user, sessionConfig, login, logout, isAuthenticated: !!user, isLoading, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    return useContext(AuthContext);
};
