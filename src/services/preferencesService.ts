import { apiClient, API_BASE_URL } from './apiClient';

export const PreferencesService = {
  async getPreferences(): Promise<Record<string, unknown>> {
    try {
      const res = await apiClient(`${API_BASE_URL}/user/preferences`);
      if (res.ok) return await res.json();
      return {};
    } catch (err) {
      console.error('Error fetching preferences:', err);
      return {};
    }
  },

  async savePreference(clave: string, valor: unknown): Promise<boolean> {
    try {
      const res = await apiClient(`${API_BASE_URL}/user/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave, valor })
      });
      return res.ok;
    } catch (err) {
      console.error('Error saving preference:', err);
      return false;
    }
  }
};
