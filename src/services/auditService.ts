import { apiClient, API_BASE_URL } from './apiClient';

export interface AuditLogEntry {
    Id?: number;
    Fecha?: string;
    UsuarioID: string;
    UsuarioNombre: string;
    Accion: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'PROCESS' | 'ASSIGN' | 'LOGIN' | 'LOGOUT' | 'ACCESO_DENEGADO' | 'VALIDATE' | 'EVALUATE' | 'GESTIONAR_RECHAZO';
    Entidad: string;
    EntidadID: string;
    Detalle: string;
}

export const auditService = {
    async getLogs() {
        const response = await apiClient(`${API_BASE_URL}/config/audit-logs`);
        if (!response.ok) throw new Error('Error fetching logs');
        return response.json();
    },

    async logAction(entry: AuditLogEntry) {
        try {
            await apiClient(`${API_BASE_URL}/config/audit-logs`, {
                method: 'POST',
                body: JSON.stringify(entry)
            });
        } catch (error) {
            console.error("Failed to log audit action", error);
        }
    }
};
