import apiClient from './apiClient';
import { Emergency, EmergencyMotive, EmergencySparePart } from '../types';

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

const emergenciasService = {
    getEmergencies: async (page = 1, pageSize = 20, search = ''): Promise<PaginatedEmergencies> => {
        const response = await apiClient.get('/emergencias', {
            params: { page, pageSize, search }
        });
        return response.data;
    },

    getEmergencyById: async (id: string): Promise<Emergency> => {
        const response = await apiClient.get(`/emergencias/${id}`);
        return response.data;
    },

    createEmergency: async (data: Partial<Emergency>): Promise<{ message: string, id: string }> => {
        const response = await apiClient.post('/emergencias', data);
        return response.data;
    },

    assignTechnician: async (id: string, tecnico_asignado: string): Promise<void> => {
        await apiClient.put(`/emergencias/${id}/asignar`, { tecnico_asignado });
    },

    verifyEmergency: async (id: string, data: { verificacion: string, motivo: string, usuario: string }): Promise<void> => {
        await apiClient.put(`/emergencias/${id}/verificar`, data);
    },

    processEmergency: async (id: string, data: { procesado: string, motivo: string, usuario: string }): Promise<void> => {
        await apiClient.put(`/emergencias/${id}/procesar`, data);
    },

    getVerificationCatalogs: async (): Promise<CatalogoResponse> => {
        const response = await apiClient.get('/emergencias/catalogos/verificacion');
        return response.data;
    },

    getProcessingCatalogs: async (): Promise<CatalogoResponse> => {
        const response = await apiClient.get('/emergencias/catalogos/procesado');
        return response.data;
    },

    getSpareParts: async (id: string): Promise<EmergencySparePart[]> => {
        const response = await apiClient.get(`/emergencias/${id}/repuestos`);
        return response.data;
    },

    addSparePart: async (id: string, material_id: string, cantidad: number): Promise<void> => {
        await apiClient.post(`/emergencias/${id}/repuestos`, { material_id, cantidad });
    }
};

export default emergenciasService;
