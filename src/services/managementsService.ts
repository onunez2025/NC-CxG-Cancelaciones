import type { Management } from '../types';
import { apiClient, API_BASE_URL } from './apiClient';

const API_URL = `${API_BASE_URL}/managements`;

export class ManagementsService {
    static async getManagements(): Promise<Management[]> {
        const response = await apiClient(API_URL);
        if (!response.ok) throw new Error('Failed to fetch managements');
        return response.json();
    }

    static async saveManagement(management: Omit<Management, 'id'> | Management): Promise<Management> {
        const url = 'id' in management ? `${API_URL}/${management.id}` : API_URL;
        const method = 'id' in management ? 'PUT' : 'POST';

        const response = await apiClient(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(management)
        });

        if (!response.ok) throw new Error('Failed to save management');
        return response.json();
    }

    static async deleteManagement(id: string): Promise<void> {
        const response = await apiClient(`${API_URL}/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete management');
    }
}
