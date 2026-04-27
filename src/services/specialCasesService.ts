import { apiClient, API_BASE_URL } from './apiClient';
import type { SpecialCase, SpecialCaseMotivo } from '../types';

export const specialCasesService = {
    getSpecialCases: async (params: { page?: number; pageSize?: number; search?: string } = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
        if (params.search) queryParams.append('search', params.search);

        const response = await apiClient(`${API_BASE_URL}/special-cases?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Error fetching special cases');
        return response.json();
    },

    getMotivos: async () => {
        const response = await apiClient(`${API_BASE_URL}/special-cases/motivos`);
        if (!response.ok) throw new Error('Error fetching motives');
        return response.json();
    },

    createSpecialCase: async (data: {
        ticket: string;
        motivo: string;
        comentario: string;
        usuario: string;
    }) => {
        const response = await apiClient(`${API_BASE_URL}/special-cases`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Error creating special case');
        return response.json();
    },

    updateStatus: async (id: string, data: {
        estado: 'APROBADO' | 'RECHAZADO';
        revisado_por: string;
        motivo_rechazo?: string;
    }) => {
        const response = await apiClient(`${API_BASE_URL}/special-cases/${id}/status`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Error updating status');
        return response.json();
    }
};
