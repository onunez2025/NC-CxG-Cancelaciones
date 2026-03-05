import { StorageService } from './storageService';

export const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001') + '/api';

export const apiClient = async (url: string, options: RequestInit = {}) => {
    const token = StorageService.getToken();
    const headers = new Headers(options.headers || {});

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        StorageService.remove('current_user');
        StorageService.remove('auth_token');
        // Force a reload to return to login. We would ideally dispatch an event.
        window.location.href = '/login';
    }

    return response;
};
