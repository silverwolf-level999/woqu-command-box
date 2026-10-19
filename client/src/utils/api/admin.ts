import { apiClient } from './apiClient';

const BASE_URL = '/api/admin';

// Helper to build query string
const buildQueryString = (params: Record<string, any>): string => {
  const queryString = new URLSearchParams(
    Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return queryString ? `?${queryString}` : '';
};

export const adminApi = {
  // Categories
  getCategories: () => apiClient.get<any>(`${BASE_URL}/categories`, { requiresAuth: true }),
  createCategory: (name: string, color: string) => apiClient.post<any>(`${BASE_URL}/categories`, { name, color }, { requiresAuth: true }),
  updateCategory: (id: number, name: string, color: string) => apiClient.patch<any>(`${BASE_URL}/categories/${id}`, { name, color }, { requiresAuth: true }),
  deleteCategory: (id: number) => apiClient.delete<any>(`${BASE_URL}/categories/${id}`, { requiresAuth: true }),

  // Comment moderation
  getComments: (params: { offset?: number; limit?: number; search?: string } = {}) =>
    apiClient.get<any>(`${BASE_URL}/comments${buildQueryString(params)}`, { requiresAuth: true }),
  updateComment: (id: number, content: string) =>
    apiClient.put<any>(`${BASE_URL}/comments/${id}`, { content }, { requiresAuth: true }),
  deleteComment: (id: number) =>
    apiClient.delete<any>(`${BASE_URL}/comments/${id}`, { requiresAuth: true }),

  // Dashboard
  getStats: () => apiClient.get<any>(`${BASE_URL}/stats`, { requiresAuth: true }),

  // Users
  getUsers: (params: {
    offset?: number;
    limit?: number;
    search?: string;
    authType?: string;
    isActive?: string;
  } = {}) =>
    apiClient.get<any>(`${BASE_URL}/users${buildQueryString(params)}`, {
      requiresAuth: true,
    }),

  getUserDetails: (id: number) =>
    apiClient.get<any>(`${BASE_URL}/users/${id}`, { requiresAuth: true }),

  createUser: (username: string, password: string) =>
    apiClient.post<any>(`${BASE_URL}/users`, { username, password }, { requiresAuth: true }),

  deleteUser: (id: number) =>
    apiClient.delete<any>(`${BASE_URL}/users/${id}`, { requiresAuth: true }),

  toggleUserActive: (id: number) =>
    apiClient.patch<any>(`${BASE_URL}/users/${id}/toggle-active`, {}, { requiresAuth: true }),

  // Snippets
  getSnippets: (params: {
    offset?: number;
    limit?: number;
    search?: string;
    userId?: string;
    isPublic?: string;
    language?: string;
    category?: string;
  } = {}) =>
    apiClient.get<any>(`${BASE_URL}/snippets${buildQueryString(params)}`, {
      requiresAuth: true,
    }),

  getSnippetDetails: (id: number) =>
    apiClient.get<any>(`${BASE_URL}/snippets/${id}`, { requiresAuth: true }),

  deleteSnippet: (id: number) =>
    apiClient.delete<any>(`${BASE_URL}/snippets/${id}`, { requiresAuth: true }),

  changeSnippetOwner: (id: number, newUserId: number) =>
    apiClient.patch<any>(
      `${BASE_URL}/snippets/${id}/owner`,
      { newUserId },
      { requiresAuth: true }
    ),

  toggleSnippetPublic: (id: number) =>
    apiClient.patch<any>(`${BASE_URL}/snippets/${id}/toggle-public`, {}, { requiresAuth: true }),

  scanSnippetsForOffensive: () =>
    apiClient.get<any>(`${BASE_URL}/snippets/scan/offensive`, { requiresAuth: true }),

  // API Keys
  getApiKeys: (params: {
    offset?: number;
    limit?: number;
    userId?: string;
  } = {}) =>
    apiClient.get<any>(`${BASE_URL}/api-keys${buildQueryString(params)}`, {
      requiresAuth: true,
    }),

  deleteApiKey: (id: number) =>
    apiClient.delete<any>(`${BASE_URL}/api-keys/${id}`, { requiresAuth: true }),

  // Shares
  getShares: (params: {
    offset?: number;
    limit?: number;
    userId?: string;
    requiresAuth?: string;
  } = {}) =>
    apiClient.get<any>(`${BASE_URL}/shares${buildQueryString(params)}`, {
      requiresAuth: true,
    }),

  deleteShare: (id: string) =>
    apiClient.delete<any>(`${BASE_URL}/shares/${id}`, { requiresAuth: true }),
};
