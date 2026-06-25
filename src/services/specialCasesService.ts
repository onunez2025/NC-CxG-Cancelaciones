import { apiClient, API_BASE_URL } from './apiClient';

export const specialCasesService = {
    getSpecialCases: async (params: {
        page?: number;
        pageSize?: number;
        search?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        filters?: Record<string, string[]>;
    } = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
        if (params.search) queryParams.append('search', params.search);
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
        if (params.filters) {
            for (const [key, value] of Object.entries(params.filters)) {
                const serialized = Array.isArray(value) ? value.join(',') : value;
                if (serialized) queryParams.append(`filter_${key}`, serialized);
            }
        }
        const response = await apiClient(`${API_BASE_URL}/special-cases?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Error fetching special cases');
        return response.json();
    },

    getUniqueColumnValues: async (column: string, search?: string): Promise<string[]> => {
        const queryParams = new URLSearchParams({ column });
        if (search) queryParams.append('search', search);
        const response = await apiClient(`${API_BASE_URL}/special-cases/unique-values?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Error al obtener valores únicos');
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
