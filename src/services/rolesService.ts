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
            { group: 'Presupuesto', id: 'budget.view', label: 'Ver Presupuesto' },
            { group: 'Presupuesto', id: 'budget.create', label: 'Crear Presupuesto' },
            { group: 'Presupuesto', id: 'budget.edit', label: 'Editar Presupuesto' },

            { group: 'Solped', id: 'solped.view', label: 'Ver Solicitudes' },
            { group: 'Solped', id: 'solped.create', label: 'Crear Solicitudes' },
            { group: 'Solped', id: 'solped.edit', label: 'Editar Solicitudes' },

            { group: 'Archivos', id: 'files.upload', label: 'Cargar Archivos SAP' },
            { group: 'Archivos', id: 'files.view', label: 'Ver Archivos Cargados' },

            { group: 'Seguimiento', id: 'tracking.view', label: 'Ver Seguimiento' },
            { group: 'Seguimiento', id: 'tracking.export', label: 'Exportar Reportes' },

            { group: 'Configuración', id: 'config.users', label: 'Gestionar Usuarios' },
            { group: 'Configuración', id: 'config.roles', label: 'Gestionar Roles' },
            { group: 'Configuración', id: 'config.cecos', label: 'Gestionar CeCos' },
            { group: 'Configuración', id: 'config.accounts', label: 'Gestionar Cuentas' },
            { group: 'Configuración', id: 'config.managements', label: 'Gestionar Gerencias' },
            { group: 'Configuración', id: 'config.exchange_rates', label: 'Gestionar Tipos de Cambio' },

            { group: 'Gastos', id: 'expenses.map', label: 'Mapear Gastos' },
            { group: 'Gastos', id: 'expenses.view', label: 'Ver Gastos' },
        ];
    }
}
