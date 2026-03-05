import type { Budget } from '../types';
import { apiClient, API_BASE_URL } from './apiClient';

const API_URL = `${API_BASE_URL}/budgets`;

export class BudgetService {
    static async getBudgets(year?: number, managementId?: string, costCenterId?: string): Promise<Budget[]> {
        let url = new URL(API_URL);
        if (year) url.searchParams.append('year', year.toString());
        if (managementId) url.searchParams.append('management_id', managementId);
        if (costCenterId) url.searchParams.append('cost_center_id', costCenterId);

        const response = await apiClient(url.toString());
        if (!response.ok) throw new Error('Failed to fetch budgets');
        return response.json();
    }

    static async saveBudget(budget: Budget): Promise<Budget> {
        if (budget.id) {
            // Update
            const response = await apiClient(`${API_URL}/${budget.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(budget)
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to update budget');
            }
            return response.json();
        } else {
            // Create
            const response = await apiClient(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(budget)
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to create budget');
            }
            return response.json();
        }
    }

    static async deleteBudget(id: string): Promise<void> {
        const response = await apiClient(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete budget');
    }

    static async deleteBudgetsBulk(year: number, managementId: string): Promise<void> {
        const response = await apiClient(`${API_URL}/bulk/${year}/${managementId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to bulk delete budgets');
    }
}
