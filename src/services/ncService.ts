import { apiClient, API_BASE_URL } from './apiClient';

export interface Cancellation {
    id: string;
    ticket: string;
    motivo_cancelacion_id: string;
    motivo: string;  // texto del motivo resuelto
    autorizador: string;
    fecha_generado: string;
    gestionado_por: string;
    cancelacion_correcta: string | null; // 'Si' | 'No' | null
    gestionado: string | null; // 'Si' | 'No' | null
    observacion: string;
    fecha_gestionado: string | null;
    asignado_a: string;
    asignado_por: string;
    fecha_asignado: string | null;
    cliente: string;
    estado: 'PENDIENTE' | 'EN GESTIÓN' | 'APROBADO' | 'RECHAZADO';
}

export interface CancellationDetail extends Cancellation {
    motivo_cancelacion_texto: string;
    motivo_correcto_id: string | null;
    motivo_correcto_texto: string | null;
    producto: string;
    asunto: string;
}

export interface CxGNC {
    id: string;
    tipo: 'CXG' | 'NC';
    correlativo: string;
    fecha: string;
    cliente: string;
    estado: 'PENDIENTE' | 'EN GESTIÓN' | 'PROCESADO';
    ticket?: string;
    observacion?: string;
    asignado_a?: string;
    asignado_por?: string;
    fecha_asignado?: string;
    gestionado?: string;
    observacion_gestionado?: string;
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

export interface GestionarData {
    cancelacion_correcta: 'Si' | 'No';
    motivo_correcto?: string;
    observacion?: string;
    gestionado_por: string;
}

export interface AsignarData {
    asignado_a: string;
    asignado_por: string;
}

export const ncService = {
    async getCancellations(params?: { 
        page?: number; 
        pageSize?: number; 
        search?: string;
        estado?: string;
    }): Promise<PaginatedResponse<Cancellation>> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
        if (params?.search) queryParams.append('search', params.search);
        if (params?.estado && params.estado !== 'TODOS') queryParams.append('estado', params.estado);

        const response = await apiClient(`${API_BASE_URL}/cancelaciones?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Error al obtener cancelaciones');
        return response.json();
    },

    async getCancellationDetail(id: string): Promise<CancellationDetail> {
        const response = await apiClient(`${API_BASE_URL}/cancelaciones/${id}`);
        if (!response.ok) throw new Error('Error al obtener detalle de cancelación');
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

    async gestionarCancellation(id: string, data: GestionarData): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/cancelaciones/${id}/gestionar`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Error al gestionar cancelación');
    },

    async asignarCancellation(id: string, data: AsignarData): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/cancelaciones/${id}/asignar`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Error al asignar cancelación');
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

    async createCancellation(data: { 
        cliente: string; 
        motive: string; 
        ticket?: string; 
        observacion?: string;
        usuario?: string;
    }): Promise<any> {
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

    async asignarCxGNC(id: string, data: AsignarData): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/cxg-nc/${id}/asignar`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Error al asignar CxG/NC');
    },

    async gestionarCxGNC(id: string, data: { observacion: string; gestionado_por: string; resultado?: 'Si' | 'No' }): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/cxg-nc/${id}/gestionar`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Error al gestionar CxG/NC');
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
    },

    async getCancellationMotivos(): Promise<{ id: string; motivo: string }[]> {
        const response = await apiClient(`${API_BASE_URL}/cancelaciones/motivos`);
        if (!response.ok) throw new Error('Error al obtener motivos de cancelación');
        return response.json();
    }
};
