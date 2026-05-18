import { apiClient, API_BASE_URL } from './apiClient';

export interface LaborColor {
    labor: string;
    color_fondo: string;
    color_text: string;
}

const API_URL = `${API_BASE_URL}/programa-supervisores/colores`;

export class LaborColorService {
    static async getColors(): Promise<LaborColor[]> {
        const response = await apiClient(API_URL);
        if (!response.ok) throw new Error('Error al obtener colores de labores');
        return response.json();
    }
}
