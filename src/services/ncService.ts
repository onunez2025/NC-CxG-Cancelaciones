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
    estado: 'REGISTRADO' | 'APROBADO_SUP' | 'ASIGNADO' | 'VALIDADO' | 'CERRADO' | 'RECHAZADO';
    apro_solicitud?: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE';
    apro_obs?: string;
    apro_por?: string;
    apro_el?: string;
    vali_cliente?: 'REAL' | 'FALSA' | 'PENDIENTE';
    vali_obs?: string;
    vali_por?: string;
    vali_el?: string;
    vali_motivo_real?: string;
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
    tipo: 'NC' | 'CXG';
    correlativo: string;
    fecha: string;
    creado_por?: string;
    cliente: string;
    estado: 'REGISTRADO' | 'APROBADO_SUP' | 'ASIGNADO' | 'VALIDADO' | 'CERRADO' | 'RECHAZADO';
    observacion?: string;
    observacion_inicial?: string;
    // Native approval fields from GAC_APP_TB_CXG_NC
    aprobado?: 'true' | 'false';
    aprobado_motivo?: string;
    aprobado_observacion?: string;
    aprobado_el?: string;
    aprobado_por?: string;
    // Processing fields
    procesado?: 'true' | 'false';
    procesado_motivo?: string;
    procesado_observacion?: string;
    procesado_el?: string;
    procesado_por?: string;
    ticket_desinstalacion?: string;
    gestionado_por?: string;
    resultado?: string;
    ticket?: string;
    // Extended fields for detail view
    fsm_cliente?: string;
    tienda?: string;
    lugar_compra?: string;
    documento_cliente?: string;
    codigo_producto?: string;
    producto?: string;
    supervisor?: string;
    parent_id?: string;
    child_id?: string;
}

export interface HistorialEntry {
    id: string;
    solicitud: string;
    tipo: string;       // 'Registro' | 'Aprobación' | 'Asignación' | 'Validación' | 'Gestión' | 'Llamada'
    observacion: string;
    fecha: string;
    usuario: string;
}

export interface EquipmentHistoryEntry {
    ticket: string;
    tecnico: string;
    comentario: string;
    estado: string;
    tipo_servicio: string;
    fecha_visita: string;
    visita_realizada: boolean;
    trabajo_realizado: boolean;
}

export interface CxGNCMotivo {
    id: string;
    motivo: string;
}

export interface TicketInfo {
  ticket: string;
  cliente: string;
  producto: string;
  asunto: string;
  estado?: string;
  motivo_elevacion?: string;
  lugar_compra_id?: string;
  lugar_compra?: string;
  fecha_visita?: string;
  supervisor_nombre?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    stats?: {
        registrado: number;
        aprobado: number;
        asignado: number;
        validado: number;
        cerrado: number;
    };
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
    asignado_nombre?: string;
}

export const ncService = {
    async getCancellations(params?: { 
        page?: number; 
        pageSize?: number; 
        search?: string;
        estado?: string;
        asignado_a?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        filters?: Record<string, string | string[]>;
    }): Promise<PaginatedResponse<Cancellation>> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
        if (params?.search) queryParams.append('search', params.search);
        if (params?.estado && params.estado !== 'TODOS') queryParams.append('estado', params.estado);
        if (params?.asignado_a) queryParams.append('asignado_a', params.asignado_a);
        if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
        
        if (params?.filters) {
            for (const [key, value] of Object.entries(params.filters)) {
                const serialized = Array.isArray(value) ? value.join(',') : value;
                if (serialized) {
                    queryParams.append(`filter_${key}`, serialized);
                }
            }
        }

        const response = await apiClient(`${API_BASE_URL}/cancelaciones?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Error al obtener cancelaciones');
        return response.json();
    },

    async getUniqueCancellationColumnValues(column: string, search?: string): Promise<string[]> {
        const queryParams = new URLSearchParams({ column });
        if (search) queryParams.append('search', search);
        
        const response = await apiClient(`${API_BASE_URL}/cancelaciones/unique-values?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Error al obtener valores únicos de cancelaciones');
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
        tipo?: string;
        estado?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        filters?: Record<string, string | string[]>;
    }): Promise<PaginatedResponse<CxGNC>> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
        if (params?.search) queryParams.append('search', params.search);
        if (params?.tipo && params.tipo !== 'TODOS') queryParams.append('tipo', params.tipo);
        if (params?.estado && params.estado !== 'TODOS') queryParams.append('estado', params.estado);
        if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
        
        if (params?.filters) {
            for (const [key, value] of Object.entries(params.filters)) {
                const serialized = Array.isArray(value) ? value.join(',') : value;
                if (serialized) {
                    queryParams.append(`filter_${key}`, serialized);
                }
            }
        }

        const response = await apiClient(`${API_BASE_URL}/cxg-nc?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Error al obtener CxG/NC');
        return response.json();
    },

    async getUniqueColumnValues(column: string, search?: string): Promise<string[]> {
        const queryParams = new URLSearchParams({ column });
        if (search) queryParams.append('search', search);
        
        const response = await apiClient(`${API_BASE_URL}/cxg-nc/unique-values?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Error al obtener valores únicos');
        return response.json();
    },

    async getCxGNCDetail(id: string): Promise<CxGNC> {
        const response = await apiClient(`${API_BASE_URL}/cxg-nc/${id}`);
        if (!response.ok) throw new Error('Error al obtener detalle de CxG/NC');
        return response.json();
    },

    async getCxGNCHistorial(id: string): Promise<HistorialEntry[]> {
        const response = await apiClient(`${API_BASE_URL}/cxg-nc/${id}/historial`);
        if (!response.ok) throw new Error('Error al obtener historial de CxG/NC');
        return response.json();
    },

    async getCxGNCMotivos(): Promise<CxGNCMotivo[]> {
        const response = await apiClient(`${API_BASE_URL}/cxg-nc/motivos`);
        if (!response.ok) throw new Error('Error al obtener motivos de CxG/NC');
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

    async gestionarCxGNC(id: string, data: { observacion: string; gestionado_por: string; resultado?: 'true' | 'false' }): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/cxg-nc/${id}/gestionar`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Error al gestionar CxG/NC');
    },

    async updateCxGNCStatus(id: string, estado: 'REGISTRADO' | 'APROBADO_SUP' | 'ASIGNADO' | 'VALIDADO' | 'CERRADO'): Promise<void> {
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
    },

    async getEquipmentHistory(ticket: string): Promise<EquipmentHistoryEntry[]> {
        const response = await apiClient(`${API_BASE_URL}/fsm/equipment-history/${ticket}`);
        if (!response.ok) throw new Error('Error al obtener historial de equipo');
        return response.json();
    },

    async aprobarSolicitudCancellation(id: string, data: { aprobado: 'APROBADO' | 'RECHAZADO'; observacion: string; usuario: string }): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/cancelaciones/${id}/aprobar-solicitud`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Error al evaluar solicitud');
    },

    async aprobarMasivoCancellations(data: { ids: string[]; aprobado: 'APROBADO' | 'RECHAZADO'; observacion: string; usuario: string }): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/cancelaciones/aprobar-masivo`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Error al evaluar solicitudes en masivo');
    },

    async aprobarSolicitudCxGNC(id: string, data: { aprobado: 'true' | 'false'; motivo?: string; observacion: string; usuario: string }): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/cxg-nc/${id}/aprobar-solicitud`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Error al evaluar solicitud CxG/NC');
    },

    async validarClienteCancellation(id: string, data: { resultado: 'REAL' | 'FALSA'; observacion: string; usuario: string; motivo_real?: string }): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/cancelaciones/${id}/validar-cliente`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Error al validar cliente');
    },

    async validarClienteCxGNC(id: string, data: { resultado: 'REAL' | 'FALSA'; observacion: string; usuario: string; motivo_real?: string }): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/cxg-nc/${id}/validar-cliente`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Error al validar cliente');
    },

    async getC4CReport(ticketId: string): Promise<Response> {
        const response = await apiClient(`${API_BASE_URL}/c4c/report/${ticketId}`);
        return response;
    },

    async getAnalystsForCancellation(): Promise<any[]> {
        const response = await apiClient(`${API_BASE_URL}/cancelaciones/analistas`);
        if (!response.ok) throw new Error('Error al obtener analistas para asignación');
        return response.json();
    }
};
