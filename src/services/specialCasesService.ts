import { apiClient } from './apiClient';
import type { SpecialCase, SpecialCaseMotivo } from '../types';

export const specialCasesService = {
    getSpecialCases: async (params: { page?: number; pageSize?: number; search?: string } = {}) => {
        const response = await apiClient.get<{
            data: SpecialCase[];
            total: number;
            page: number;
            pageSize: number;
        }>('/special-cases', { params });
        return response.data;
    },

    getMotivos: async () => {
        const response = await apiClient.get<SpecialCaseMotivo[]>('/special-cases/motivos');
        return response.data;
    },

    createSpecialCase: async (data: {
        ticket: string;
        motivo: string;
        comentario: string;
        usuario: string;
    }) => {
        const response = await apiClient.post<{ message: string; id: string }>('/special-cases', data);
        return response.data;
    },

    updateStatus: async (id: string, data: {
        estado: 'APROBADO' | 'RECHAZADO';
        revisado_por: string;
        motivo_rechazo?: string;
    }) => {
        const response = await apiClient.post<{ message: string }>(`/special-cases/${id}/status`, data);
        return response.data;
    }
};
