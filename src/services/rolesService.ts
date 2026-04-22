import type { Role, Permission } from '../types';
import { apiClient, API_BASE_URL } from './apiClient';

const API_URL = `${API_BASE_URL}/roles`;

export class RolesService {
    static async getRoles(): Promise<Role[]> {
        const response = await apiClient(API_URL);
        if (!response.ok) throw new Error('Failed to fetch roles');
        return response.json();
    }

    static async getRoleById(id: string): Promise<Role | undefined> {
        const roles = await this.getRoles();
        return roles.find(r => r.id === id);
    }

    static async saveRole(role: Omit<Role, 'id'> | Role): Promise<Role> {
        const url = 'id' in role ? `${API_URL}/${role.id}` : API_URL;
        const method = 'id' in role ? 'PUT' : 'POST';

        const response = await apiClient(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(role)
        });

        if (!response.ok) throw new Error('Failed to save role');
        return response.json();
    }

    static async createRole(role: Omit<Role, 'id'>): Promise<Role> {
        return this.saveRole(role);
    }

    static async deleteRole(id: string): Promise<void> {
        const response = await apiClient(`${API_URL}/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete role');
    }

    static getAllPermissions(): { id: Permission; label: string; group: string }[] {
        return [
            { group: 'Dashboard', id: 'dashboard.view', label: 'Ver Dashboard' },
            
            { group: 'Cancelaciones', id: 'cxg.cancelaciones.view', label: 'Ver Cancelaciones' },
            { group: 'Cancelaciones', id: 'cxg.cancelaciones.create', label: 'Crear Cancelaciones' },
            { group: 'Cancelaciones', id: 'cxg.cancelaciones.assign', label: 'Asignar Cancelaciones' },
            { group: 'Cancelaciones', id: 'cxg.cancelaciones.gestionar', label: 'Gestionar Cancelaciones' },
            { group: 'Cancelaciones', id: 'cxg.cancelaciones.process', label: 'Procesar Cancelaciones' },

            { group: 'CxG y NC', id: 'cxg.cxg_nc.view', label: 'Ver CxG y NC' },
            { group: 'CxG y NC', id: 'cxg.cxg_nc.create', label: 'Crear CxG y NC' },
            { group: 'CxG y NC', id: 'cxg.cxg_nc.approve', label: 'Aprobar CxG y NC' },
            { group: 'CxG y NC', id: 'cxg.cxg_nc.assign', label: 'Asignar CxG y NC' },
            { group: 'CxG y NC', id: 'cxg.cxg_nc.gestionar', label: 'Gestionar CxG y NC' },
            { group: 'CxG y NC', id: 'cxg.cxg_nc.process', label: 'Procesar CxG y NC' },
            { group: 'CxG y NC', id: 'cxg.fsm.view', label: 'Ver Tracking FSM' },

            { group: 'Reportes', id: 'cxg.reportes.exportar', label: 'Exportar Reportes' },

            { group: 'Configuración', id: 'config.users', label: 'Gestionar Usuarios' },
            { group: 'Configuración', id: 'config.roles', label: 'Gestionar Roles' },
            { group: 'Configuración', id: 'config.audit', label: 'Ver Auditoría' }
        ];
    }
}
