import type { AccountingAccount } from '../types';
import { apiClient, API_BASE_URL } from './apiClient';

const API_URL = `${API_BASE_URL}/accounts`;

export class AccountsService {
    static async getAccounts(): Promise<AccountingAccount[]> {
        const response = await apiClient(API_URL);
        if (!response.ok) throw new Error('Failed to fetch accounts');
        return response.json();
    }

    static async saveAccount(account: Omit<AccountingAccount, 'id'> | AccountingAccount): Promise<AccountingAccount> {
        const url = 'id' in account ? `${API_URL}/${account.id}` : API_URL;
        const method = 'id' in account ? 'PUT' : 'POST';

        const response = await apiClient(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(account)
        });

        if (!response.ok) throw new Error('Failed to save account');
        return response.json();
    }

    static async deleteAccount(id: string): Promise<void> {
        const response = await apiClient(`${API_URL}/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete account');
    }
}
