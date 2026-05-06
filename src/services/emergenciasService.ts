import { apiClient, API_BASE_URL } from './apiClient';
import type { Emergency, EmergencyMotive, EmergencySparePart } from '../types';

interface PaginatedEmergencies {
    data: Emergency[];
    total: number;
    page: number;
    pageSize: number;
}

interface CatalogoResponse {
    statuses: { id: string, label: string }[];
    motives: EmergencyMotive[];
}

export const emergenciasService = {
    getEmergencies: async (page = 1, pageSize = 20, search = ''): Promise<PaginatedEmergencies> => {
        const queryParams = new URLSearchParams();
        queryParams.append('page', page.toString());
        queryParams.append('pageSize', pageSize.toString());
        if (search) queryParams.append('search', search);

        const response = await apiClient(`${API_BASE_URL}/emergencias?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Error al obtener emergencias');
        return response.json();
    },

    getEmergencyById: async (id: string): Promise<Emergency> => {
        const response = await apiClient(`${API_BASE_URL}/emergencias/${id}`);
        if (!response.ok) throw new Error('Error al obtener detalle de la emergencia');
        return response.json();
    },

    createEmergency: async (data: Partial<Emergency>): Promise<{ message: string, id: string }> => {
        const response = await apiClient(`${API_BASE_URL}/emergencias`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Error al crear la emergencia');
        return response.json();
    },

    assignTechnician: async (id: string, tecnico_asignado: string): Promise<void> => {
        const response = await apiClient(`${API_BASE_URL}/emergencias/${id}/asignar`, {
            method: 'PUT',
            body: JSON.stringify({ tecnico_asignado })
        });
        if (!response.ok) throw new Error('Error al asignar técnico');
    },

    verifyEmergency: async (id: string, data: { verificacion: string, motivo: string, usuario: string }): Promise<void> => {
        const response = await apiClient(`${API_BASE_URL}/emergencias/${id}/verificar`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Error al registrar verificación');
    },

    processEmergency: async (id: string, data: { procesado: string, motivo: string, usuario: string }): Promise<void> => {
        const response = await apiClient(`${API_BASE_URL}/emergencias/${id}/procesar`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Error al procesar emergencia');
    },

    getVerificationCatalogs: async (): Promise<CatalogoResponse> => {
        const response = await apiClient(`${API_BASE_URL}/emergencias/catalogos/verificacion`);
        if (!response.ok) throw new Error('Error al obtener catálogos de verificación');
        return response.json();
    },

    getProcessingCatalogs: async (): Promise<CatalogoResponse> => {
        const response = await apiClient(`${API_BASE_URL}/emergencias/catalogos/procesado`);
        if (!response.ok) throw new Error('Error al obtener catálogos de procesamiento');
        return response.json();
    },

    getSpareParts: async (id: string): Promise<EmergencySparePart[]> => {
        const response = await apiClient(`${API_BASE_URL}/emergencias/${id}/repuestos`);
        if (!response.ok) throw new Error('Error al obtener repuestos');
        return response.json();
    },

    addSparePart: async (id: string, material_id: string, cantidad: number): Promise<void> => {
        const response = await apiClient(`${API_BASE_URL}/emergencias/${id}/repuestos`, {
            method: 'POST',
            body: JSON.stringify({ material_id, cantidad })
        });
        if (!response.ok) throw new Error('Error al agregar repuesto');
    }
};
