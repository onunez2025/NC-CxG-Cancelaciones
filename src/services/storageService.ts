export class StorageService {
    private static prefix = 'ebm_';

    static set<T>(key: string, value: T): void {
        try {
            localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(value));
        } catch (e) {
            console.error('Error saving to localStorage', e);
            throw e; // Re-throw to let callers handle it (e.g. QuotaExceededError)
        }
    }

    static get<T>(key: string): T | null {
        try {
            const item = localStorage.getItem(`${this.prefix}${key}`);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Error reading from localStorage', e);
            return null;
        }
    }

    static remove(key: string): void {
        localStorage.removeItem(`${this.prefix}${key}`);
    }

    static clear(): void {
        Object.keys(localStorage).forEach((key) => {
            if (key.startsWith(this.prefix)) {
                localStorage.removeItem(key);
            }
        });
    }

    // Specific helpers
    static getToken(): string | null {
        return this.get<string>('auth_token');
    }

    static setToken(token: string): void {
        this.set('auth_token', token);
    }

    static getCurrentUser(): unknown {
        return this.get('current_user');
    }

    static setCurrentUser(user: unknown): void {
        this.set('current_user', user);
    }
}
