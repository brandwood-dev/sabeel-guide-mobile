import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const DEFAULT_SERVER_BASE_URL = 'http://192.168.1.194:3001';

const normalizeServerBaseUrl = (value: string) => {
    const trimmed = String(value || '').trim().replace(/\/+$/, '');
    if (!trimmed) return DEFAULT_SERVER_BASE_URL;
    return trimmed.replace(/\/(api|sabeel|sabeel-guide)(\/.*)?$/i, '');
};

const configuredBaseUrl =
    (Constants?.expoConfig as any)?.extra?.SERVER_BASE_URL ||
    (Constants as any)?.manifest?.extra?.SERVER_BASE_URL ||
    DEFAULT_SERVER_BASE_URL;

export const SERVER_BASE_URL = normalizeServerBaseUrl(configuredBaseUrl);

// For Sabeel_Guide backend, REST endpoints are mounted from the server root
const BASE_URL = SERVER_BASE_URL;

// Memory fallback for when AsyncStorage is broken (Native module is null)
let currentToken: string | null = null;
export const getMemoryToken = () => currentToken;
export const API_BASE_URL = BASE_URL;

export const setMemoryToken = (token: string | null) => {
    currentToken = token;
};

const decodeJwtPayload = (token: string): any | null => {
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;

        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        const json = globalThis.atob ? globalThis.atob(padded) : Buffer.from(padded, 'base64').toString('utf8');
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
};


const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {},
});

// Request Interceptor
api.interceptors.request.use(
    async (config) => {
        console.log(`[API] Request: ${config.method?.toUpperCase()} ${config.url}`);

        // Important: when sending FormData (file upload), do NOT force application/json.
        // Let axios set the correct multipart boundary.
        const isFormData =
            typeof FormData !== 'undefined' &&
            config.data &&
            (config.data instanceof FormData || Array.isArray((config.data as any)?._parts));
        if (isFormData) {
            config.headers = config.headers || {};
            // On React Native, Axios may fail to infer multipart headers reliably.
            // Setting multipart/form-data here prevents ERR_NETWORK with undefined status.
            (config.headers as any)['Content-Type'] = 'multipart/form-data';
        } else {
            // For normal JSON requests, ensure we keep application/json (unless already set).
            config.headers = config.headers || {};
            if (!(config.headers as any)['Content-Type'] && !(config.headers as any)['content-type']) {
                (config.headers as any)['Content-Type'] = 'application/json';
            }
        }
        try {
            let token = currentToken;

            if (!token) {
                token = await AsyncStorage.getItem('auth_token');
            }

            if (token) {
                console.log('[API] Sending request with token:', token.substring(0, 15) + '...');
                const decoded = decodeJwtPayload(token);
                if (decoded?.exp) {
                    const expMs = Number(decoded.exp) * 1000;
                    const expired = Number.isFinite(expMs) ? expMs < Date.now() : false;
                    console.log('[API] Token payload:', {
                        sub: decoded?.sub,
                        activeRole: decoded?.activeRole,
                        exp: decoded?.exp,
                        expired,
                    });
                }

                config.headers = config.headers || {};
                (config.headers as any).Authorization = `Bearer ${token}`;
            } else {
                console.log('[API] Sending request WITHOUT token');
            }
        } catch (storageError) {

            // Already logged via warn
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);


// Response Interceptor
api.interceptors.response.use(
    (response) => {
        console.log(`[API] Response: ${response.status} from ${response.config.url}`);
        return response;
    },
    async (error) => {
        console.error(`[API] Error: ${error.message} on ${error.config?.url}`, {
            code: error.code,
            status: error.response?.status,
            data: error.response?.data
        });

        if (error.response?.status === 401) {
            // Handle unauthorized
            setMemoryToken(null);
            try {
                await AsyncStorage.removeItem('auth_token');
                await AsyncStorage.removeItem('user_data');
            } catch (e) { }
        }
        return Promise.reject(error);
    }
);


export default api;

export const messagingApi = {
    getMyConversations: () => api.get('/messaging/conversations'),
    getArchivedConversations: () => api.get('/messaging/conversations/archived'),
    getConversationById: (conversationId: string) => api.get(`/messaging/conversations/${conversationId}`),
    sendMessage: (conversationId: string, data: { content: string }) => api.post(`/messaging/conversations/${conversationId}/messages`, data),
    getOrCreateGroupConversation: (groupId: string) => api.post('/messaging/conversations/group', { groupId }),
    getOrCreateFreelanceGroupConversation: (groupId: string) =>
        api.post('/messaging/conversations/freelance-group', { groupId }),
    getOrCreateGuidePilgrimConversation: (pilgrimUserId: string) =>
        api.post('/messaging/conversations/guide-pilgrim', { pilgrimUserId }),
    archiveConversation: (conversationId: string) => api.post(`/messaging/conversations/${conversationId}/archive`),
    unarchiveConversation: (conversationId: string) => api.post(`/messaging/conversations/${conversationId}/unarchive`),
    deleteConversation: (conversationId: string) => api.delete(`/messaging/conversations/${conversationId}`),
};

export const reservationApi = {
    getGuideReservations: () => api.get('/sabeel/reservations/guide'),
    acceptGuideReservation: (reservationId: string) => api.post(`/sabeel/reservations/${reservationId}/accept-guide`),
    rejectGuideReservation: (reservationId: string) => api.post(`/sabeel/reservations/${reservationId}/reject-guide`),
};

export const groupsApi = {
    getGroups: () => api.get('/admin-agence/groups'),
    getGroupById: (groupId: string) => api.get(`/admin-agence/groups/${groupId}`),
    getAvailablePilgrims: () => api.get('/admin-agence/groups/available-pilgrims'),
    assignPilgrims: (groupId: string, pilgrimIds: string[]) =>
        api.post(`/admin-agence/groups/${groupId}/assign-pilgrims`, { pilgrimIds }),
    removePilgrim: (groupId: string, pilgrimId: string) =>
        api.delete(`/admin-agence/groups/${groupId}/pilgrims/${pilgrimId}`),
};

export const sabeelGuideGroupsApi = {
    getMyGroups: () => api.get('/sabeel-guide/groups/me'),
    getGroupById: (groupId: string) => api.get(`/sabeel-guide/groups/${groupId}`),
    getAvailablePilgrims: (groupId: string) => api.get(`/sabeel-guide/groups/${groupId}/available-pilgrims`),
    assignPilgrims: (groupId: string, pilgrimIds: string[]) =>
        api.post(`/sabeel-guide/groups/${groupId}/assign-pilgrims`, { pilgrimIds }),
    removePilgrim: (groupId: string, pilgrimId: string) =>
        api.delete(`/sabeel-guide/groups/${groupId}/pilgrims/${pilgrimId}`),
};

export const freelanceGroupsApi = {
    uploadImage: (formData: any) =>
        api.post('/sabeel-guide/freelance-groups/upload-image', formData),
    getMine: () => api.get('/sabeel-guide/freelance-groups/me'),
    getById: (groupId: string) => api.get(`/sabeel-guide/freelance-groups/${groupId}`),
    getMembers: (groupId: string) => api.get(`/sabeel-guide/freelance-groups/${groupId}/pilgrims`),
    getAvailablePilgrims: (groupId: string) => api.get(`/sabeel-guide/freelance-groups/${groupId}/available-pilgrims`),
    assignPilgrims: (groupId: string, pilgrimIds: string[]) =>
        api.post(`/sabeel-guide/freelance-groups/${groupId}/assign-pilgrims`, { pilgrimIds }),
    removePilgrim: (groupId: string, pilgrimId: string) =>
        api.delete(`/sabeel-guide/freelance-groups/${groupId}/pilgrims/${pilgrimId}`),
    create: (payload: { name: string; period?: string; city?: string; maxPilgrims?: number; imageUrl?: string }) =>
        api.post('/sabeel-guide/freelance-groups', payload),
    update: (
        groupId: string,
        payload: { name?: string; period?: string; city?: string; maxPilgrims?: number; imageUrl?: string | null },
    ) => api.put(`/sabeel-guide/freelance-groups/${groupId}`, payload),
    delete: (groupId: string) => api.delete(`/sabeel-guide/freelance-groups/${groupId}`),
};

export const trackingApi = {
    getMyPilgrimsPositions: () => api.get('/tracking/guide/pilgrims-positions'),
};

export const agenciesApi = {
    getPublicAgencyById: (agencyId: string) => api.get(`/admin-agence/auth/public/agencies/${agencyId}`),
};

export const freelanceComplianceApi = {
    getMe: () => api.get('/sabeel-guide/freelance/compliance/me'),
    requestEmailOtp: (payload: { email?: string }) => api.post('/sabeel-guide/freelance/compliance/email/request-otp', payload),
    verifyEmailOtp: (payload: { email: string; otp: string }) => api.post('/sabeel-guide/freelance/compliance/email/verify-otp', payload),
    listEmails: () => api.get('/sabeel-guide/freelance/compliance/emails'),
    addEmail: (payload: { email: string }) => api.post('/sabeel-guide/freelance/compliance/emails', payload),
    uploadDocuments: (formData: any) => api.post('/sabeel-guide/freelance/compliance/documents/upload', formData),
    uploadContract: (formData: any) => api.post('/sabeel-guide/freelance/compliance/contract/upload', formData),
};

export const reviewsApi = {
    listByTarget: (params: { targetType: 'AGENCE' | 'GUIDE'; targetId: string }) =>
        api.get('/sabeel/reviews/target', { params }),
    summaryByTarget: (params: { targetType: 'AGENCE' | 'GUIDE'; targetId: string }) =>
        api.get('/sabeel/reviews/target/summary', { params }),
};

export const walletApi = {
    getMe: () => api.get('/wallet/me'),
    listTransactions: (params: { limit?: number; offset?: number }) =>
        api.get('/wallet/transactions', { params }),
    requestWithdrawal: (payload: { amountCents: number; idempotencyKey: string }) =>
        api.post('/wallet/withdrawal/request', payload),
};

export const paymentsApi = {
    connectOnboardingLink: (payload: { ownerType: 'GUIDE' | 'AGENCY' }) =>
        api.post('/payments/connect/onboarding-link', payload),
    connectStatus: () => api.get('/payments/connect/status'),
};

export const notificationsApi = {
    listMine: (params?: { limit?: number; offset?: number }) =>
        api.get('/notifications/me', { params }),
    markRead: (id: string) => api.patch(`/notifications/${id}/read`),
    markAllRead: () => api.post('/notifications/me/mark-all-read'),
    clearAll: () => api.delete('/notifications/me'),
};

