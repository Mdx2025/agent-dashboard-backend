// src/services/api.ts

// Base URL for the backend API
// Hardcoded for Railway production - change here if backend URL changes
const API_BASE_URL = 'https://agent-dashboard-backend-production.up.railway.app/api';

/**
 * A simple wrapper around fetch for making API calls.
 * Handles JSON serialization and deserialization automatically.
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Default headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    // Handle 204 No Content (e.g., DELETE)
    if (response.status === 204) {
      return undefined as T;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

export { apiRequest };
