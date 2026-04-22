import { apiClient, API_BASE_URL } from './apiClient';

export interface FSMTracking {
    ticket: string;
    cliente: string;
    asunto: string;
    distrito: string;
    ciudad: string;
    tecnico: string;
    bloque_original: string;
    rango_asignado: string | null;
    orden: string | null;
    comentario_horario: string | null;
    fecha_visita: string;
    estado: string;
}

export const fsmService = {
    getTracking: async (params?: { search?: string; limit?: number }): Promise<FSMTracking[]> => {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.append('search', params.search);
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        
        const response = await apiClient(`${API_BASE_URL}/fsm/tracking?${queryParams.toString()}`);
        if (!response.ok) {
            throw new Error('Error al obtener los datos de FSM');
        }
        return response.json();
    }
};
