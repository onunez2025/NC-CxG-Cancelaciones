import { apiClient, API_BASE_URL } from './apiClient';
import type { ProgramaSupervisor } from '../types';

const API_URL = `${API_BASE_URL}/programa-supervisores`;

export class ProgramaSupervisoresService {
  static async getPrograma(
        page = 1,
        limit = 50,
        search = '',
        sortBy = 'fecha_labor',
        sortOrder = 'DESC',
        empleadoId = '',
        startDate = '',
        endDate = ''
    ): Promise<{ data: ProgramaSupervisor[], metadata: any }> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            search,
            sortBy,
            sortOrder
        });

        if (empleadoId) params.append('empleadoId', empleadoId);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await apiClient(`${API_URL}?${params.toString()}`);
        if (!response.ok) throw new Error('Error al cargar programa de supervisores');
        return response.json();
    }
}
