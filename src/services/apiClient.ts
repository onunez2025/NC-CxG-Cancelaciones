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

    // Disable caching
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    const response = await fetch(url, {
        cache: 'no-store',
        ...options,
        headers,
    });

    if (response.status === 401) {
        StorageService.remove('current_user');
        StorageService.remove('auth_token');
        // Force a reload to return to login. We would ideally dispatch an event.
        window.location.href = '/login?expired=true';
    }

    return response;
};
