import type { User } from '../types';
import { API_BASE_URL, apiClient } from './apiClient';

const API_URL = `${API_BASE_URL}/users`;

export class UsersService {
    static async getUsers(): Promise<User[]> {
        const response = await apiClient(API_URL);
        if (!response.ok) throw new Error('Failed to fetch users');
        return response.json();
    }

    static async getUserById(id: string): Promise<User | undefined> {
        const users = await this.getUsers();
        return users.find(u => u.id === id);
    }

    static async saveUser(user: Omit<User, 'id' | 'created_at'> | User): Promise<User> {
        const url = 'id' in user ? `${API_URL}/${user.id}` : API_URL;
        // The previous UsersService had createUser taking Omit<User, 'id'|'created_at'>
        const method = 'id' in user ? 'PUT' : 'POST';

        const response = await apiClient(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => null);
            throw new Error(errData?.error || 'Failed to save user');
        }
        return response.json();
    }

    static async createUser(user: Omit<User, 'id' | 'created_at'>): Promise<User> {
        return this.saveUser(user);
    }

    static async deleteUser(id: string): Promise<void> {
        const response = await apiClient(`${API_URL}/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete user');
    }
}
