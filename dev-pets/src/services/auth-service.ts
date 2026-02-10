import apiClient from "../lib/api-client";
import { User } from "../types/user";


export const authService = {
    loginWithGoogle: (): void => {
        const redirectPath = window.location.pathname + window.location.search;
        if (redirectPath !== '/') {
            localStorage.setItem('auth_redirect', redirectPath);
        }

        window.location.href = 'http://localhost:8080/auth/google/login';
    },

    loginWithGithub: (): void => {
        const redirectPath = window.location.pathname + window.location.search;
        if (redirectPath !== '/') {
            localStorage.setItem('auth_redirect', redirectPath);
        }

        window.location.href = 'http://localhost:8080/auth/github/login';
    },

    checkAuth: async (): Promise<{ authenticated: boolean; user?: User }> => {
        return apiClient.get('/auth/check');
    },

    logout: async (): Promise<void> => {
        try {
            await apiClient.post('/auth/logout');
        } catch (error) {
            console.warn('Logout API call failed, but cleaning up locally:', error);
        }
    },

    getCurrentUser: async (): Promise<User> => {
        return apiClient.get('/auth/user/me');
    },

    validateSession: async (): Promise<boolean> => {
        try {
            const response = await apiClient.get('/auth/check');
            return response.authenticated;
        } catch (error: any) {
            if (error.response?.status === 401) {
                return false;
            }
            throw error;
        }
    },
};