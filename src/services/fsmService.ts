import { apiClient, API_BASE_URL } from './apiClient';

export interface FSMTracking {
    ticket: string;
    cliente: string;
    doc_cliente: string;
    distrito: string;
    ciudad: string;
    tecnico: string;
    bloque_original: string;
    rango_asignado: string | null;
    orden: string | null;
    comentario_horario: string | null;
    fecha_visita: string;
    estado: string;
    // New detail fields
    calle: string | null;
    numero_calle: string | null;
    referencia: string | null;
    equipo: string | null;
    cod_equipo: string | null;
    id_equipo: string | null;
    email: string | null;
    celular1: string | null;
    celular2: string | null;
    coment_prog: string | null;
    coment_tecnico: string | null;
}

export const fsmService = {
    getTracking: async (params?: { 
        ticket?: string; 
        cliente?: string; 
        documento?: string; 
        tecnico?: string; 
        limit?: number 
    }): Promise<FSMTracking[]> => {
        const queryParams = new URLSearchParams();
        if (params?.ticket) queryParams.append('ticket', params.ticket);
        if (params?.cliente) queryParams.append('cliente', params.cliente);
        if (params?.documento) queryParams.append('documento', params.documento);
        if (params?.tecnico) queryParams.append('tecnico', params.tecnico);
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        
        const response = await apiClient(`${API_BASE_URL}/fsm/tracking?${queryParams.toString()}`);
        if (!response.ok) {
            throw new Error('Error al obtener los datos de FSM');
        }
        return response.json();
    }
};
