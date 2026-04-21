import { apiClient, API_BASE_URL } from './apiClient';

export interface Cancellation {
    id: string;
    correlativo: string;
    fecha_solicitud: string;
    cliente: string;
    motive: string;
    estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
    ticket?: string;
    observacion?: string;
}

export interface CxGNC {
    id: string;
    tipo: 'CXG' | 'NC';
    correlativo: string;
    fecha: string;
    cliente: string;
    estado: 'PENDIENTE' | 'PROCESADO';
    ticket?: string;
    observacion?: string;
}

export interface TicketInfo {
    ticket: string;
    cliente: string;
    producto: string;
    asunto: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
}

export const ncService = {
    async getCancellations(params?: { 
        page?: number; 
        pageSize?: number; 
        search?: string; 
    }): Promise<PaginatedResponse<Cancellation>> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
        if (params?.search) queryParams.append('search', params.search);

        const response = await apiClient(`${API_BASE_URL}/cancelaciones?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Error al obtener cancelaciones');
        return response.json();
    },

    async getCxGNC(params?: { 
        page?: number; 
        pageSize?: number; 
        search?: string; 
    }): Promise<PaginatedResponse<CxGNC>> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
        if (params?.search) queryParams.append('search', params.search);

        const response = await apiClient(`${API_BASE_URL}/cxg-nc?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Error al obtener CxG/NC');
        return response.json();
    },

    async approveCancellation(id: string): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/cancelaciones/${id}/approve`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Error al aprobar cancelación');
    },

    async rejectCancellation(id: string): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/cancelaciones/${id}/reject`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Error al rechazar cancelación');
    },

    async createCancellation(data: Partial<Cancellation>): Promise<Cancellation> {
        const response = await apiClient(`${API_BASE_URL}/cancelaciones`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Error al crear cancelación');
        return response.json();
    },

    async createCxGNC(data: Partial<CxGNC>): Promise<CxGNC> {
        const response = await apiClient(`${API_BASE_URL}/cxg-nc`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Error al crear CxG/NC');
        return response.json();
    },

    async updateCxGNCStatus(id: string, estado: 'PENDIENTE' | 'PROCESADO'): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/cxg-nc/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ estado })
        });
        if (!response.ok) throw new Error('Error al actualizar estado de CxG/NC');
    },

    async getTicketDetails(ticketId: string): Promise<TicketInfo> {
        const response = await apiClient(`${API_BASE_URL}/tickets/${ticketId}`);
        if (response.status === 404) throw new Error('Ticket no encontrado');
        if (!response.ok) throw new Error('Error al buscar el ticket');
        return response.json();
    }
};
