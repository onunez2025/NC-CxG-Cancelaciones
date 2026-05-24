import { useState, useEffect, useContext, createContext, useCallback } from 'react';
import type { User, Permission } from '../types';
import { StorageService } from '../services/storageService';
import { API_BASE_URL } from '../services/apiClient';

interface AuthContextType {
    user: User | null;
    login: (user: User, token?: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
    hasPermission: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    login: () => { },
    logout: () => { },
    isAuthenticated: false,
    isLoading: true,
    hasPermission: () => false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const validateSession = async () => {
            try {
                const savedUser = StorageService.getCurrentUser();

                if (!savedUser) {
                    setIsLoading(false);
                    return;
                }

                const token = StorageService.getToken();
                if (!token) {
                    setIsLoading(false);
                    return;
                }

                // Brief sync hydration for UX
                setUser(savedUser);

                // Background re-validation
                const response = await fetch(`${API_BASE_URL}/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);
                    StorageService.setCurrentUser(data.user);
                } else {
                    StorageService.remove('current_user');
                    StorageService.remove('auth_token');
                    window.location.href = '/login?expired=true';
                }
            } catch (error) {
                console.error("Session validation error", error);
                // Keep local session if backend is temporarily unreachable
            } finally {
                setIsLoading(false);
            }
        };

        validateSession();
    }, []);

    const login = useCallback((newUser: User, token?: string) => {
        setUser(newUser);
        StorageService.setCurrentUser(newUser);
        if (token) {
            StorageService.setToken(token);
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        StorageService.remove('current_user');
        StorageService.remove('auth_token');
    }, []);

    // --- Inactivity Logout Logic (30 Minutes) ---
    useEffect(() => {
        if (!user) return;

        let timeoutId: any;

        const resetTimer = () => {
            timeoutId = setTimeout(() => {
                StorageService.remove('current_user');
                StorageService.remove('auth_token');
                window.location.href = '/login?expired=true';
            }, 30 * 60 * 1000); // 30 minutes
        };

        const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
        
        const handleActivity = () => {
            if (timeoutId) clearTimeout(timeoutId);
            resetTimer();
        };

        activityEvents.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        // Initialize the timer
        resetTimer();

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            activityEvents.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [user, logout]);
    // ------------------------------------------

    const hasPermission = (permission: Permission): boolean => {
        if (!user) return false;
        
        // Administrador bypass
        if (user.role_name?.toLowerCase() === 'administrador') return true;
        
        if (!user.permissions) return false;
        return user.permissions.includes(permission);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
