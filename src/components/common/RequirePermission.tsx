import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { Permission } from '../../types';

interface RequirePermissionProps {
    permission: Permission;
}

export const RequirePermission = ({ permission }: RequirePermissionProps) => {
    const { hasPermission, isLoading } = useAuth();

    if (isLoading) {
        return null; // or a loading spinner
    }

    if (!hasPermission(permission)) {
        // Redirigir al dashboard u otra página segura si no tiene permisos
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};
