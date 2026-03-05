import type { CostCenter } from '../types';
import { apiClient, API_BASE_URL } from './apiClient';

const API_URL = `${API_BASE_URL}/cost-centers`;

export class CostCentersService {
    static async getCostCenters(): Promise<CostCenter[]> {
        const response = await apiClient(API_URL);
        if (!response.ok) throw new Error('Failed to fetch cost centers');
        return response.json();
    }

    static async saveCostCenter(costCenter: Omit<CostCenter, 'id'> | CostCenter): Promise<CostCenter> {
        const url = 'id' in costCenter ? `${API_URL}/${costCenter.id}` : API_URL;
        const method = 'id' in costCenter ? 'PUT' : 'POST';

        const response = await apiClient(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(costCenter)
        });

        if (!response.ok) throw new Error('Failed to save cost center');
        return response.json();
    }

    static async deleteCostCenter(id: string): Promise<void> {
        const response = await apiClient(`${API_URL}/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete cost center');
    }
}
