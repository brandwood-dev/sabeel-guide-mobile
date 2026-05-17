import api, { setMemoryToken, getMemoryToken } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
    login: async (email: string, password: string) => {
        try {
            const response = await api.post('/sabeel-guide/auth/login', { email, password });
            const { accessToken, guide } = response.data;

            setMemoryToken(accessToken);

            try {
                await AsyncStorage.setItem('auth_token', accessToken);
                await AsyncStorage.setItem('user_data', JSON.stringify(guide));
            } catch (e) {
                console.warn('[AuthService] Could not save session to AsyncStorage:', e);
            }

            return { accessToken, guide };
        } catch (error: any) {
            console.error('[AuthService] Login Error:', error);
            throw error.response?.data?.message || 'Erreur lors de la connexion';
        }
    },

    signupStep1: async (data: any) => {
        try {
            const response = await api.post('/sabeel-guide/auth/signup/step1', data);
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.message || 'Erreur lors de l\'étape 1';
        }
    },

    signupStep2: async (signupToken: string, data: any) => {
        try {
            const response = await api.post('/sabeel-guide/auth/signup/step2', data, {
                headers: { Authorization: `Bearer ${signupToken}` }
            });
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.message || 'Erreur lors de l\'étape 2';
        }
    },

    signupStep3: async (signupToken: string, data: any) => {
        try {
            const response = await api.post('/sabeel-guide/auth/signup/step3', data, {
                headers: { Authorization: `Bearer ${signupToken}` }
            });
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.message || 'Erreur lors de l\'étape 3';
        }
    },

    getProfile: async () => {
        try {
            const response = await api.get('/sabeel-guide/auth/profile');
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.message || 'Erreur récupération profil';
        }
    },

    updateProfile: async (data: any) => {
        try {
            const response = await api.patch('/sabeel-guide/auth/profile', data);
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.message || 'Erreur mise à jour profil';
        }
    },

    joinAgency: async (agencyId: string) => {
        try {
            const response = await api.post('/sabeel-guide/auth/join-agency', { agencyId });
            const { accessToken, guide } = response.data || {};
            if (accessToken) {
                setMemoryToken(accessToken);
                try {
                    await AsyncStorage.setItem('auth_token', accessToken);
                    if (guide) {
                        await AsyncStorage.setItem('user_data', JSON.stringify(guide));
                    }
                } catch (e) {
                    console.warn('[AuthService] Could not save joinAgency session:', e);
                }
            }
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.message || "Erreur rattachement à l'agence";
        }
    },

    switchRole: async (targetRole: 'freelance' | 'agency') => {
        try {
            const response = await api.post('/sabeel-guide/auth/switch-role', { targetRole });
            const { accessToken, guide } = response.data || {};
            if (accessToken) {
                setMemoryToken(accessToken);
                try {
                    await AsyncStorage.setItem('auth_token', accessToken);
                    if (guide) {
                        await AsyncStorage.setItem('user_data', JSON.stringify(guide));
                    }
                } catch (e) {
                    console.warn('[AuthService] Could not save switchRole session:', e);
                }
            }
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.message || 'Erreur switch role';
        }
    },

    uploadAvatar: async (fileUri: string) => {
        try {
            const formData = new FormData();
            const filename = fileUri.split('/').pop() || 'photo.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image/jpeg`;

            formData.append('photo', {
                uri: fileUri,
                name: filename,
                type,
            } as any);

            const response = await api.post('/sabeel-guide/auth/upload-avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.message || 'Erreur upload photo';
        }
    },

    forgotPassword: async (email: string) => {
        try {
            const response = await api.post('/sabeel-guide/auth/forgot-password', { email });
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.message || 'Erreur reset password';
        }
    },

    verifyOtp: async (resetToken: string, otp: string) => {
        try {
            const response = await api.post('/sabeel-guide/auth/verify-otp', { otp }, {
                headers: { Authorization: `Bearer ${resetToken}` }
            });
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.message || 'OTP invalide';
        }
    },

    changePassword: async (resetToken: string, data: any) => {
        try {
            const response = await api.post('/sabeel-guide/auth/change-password', data, {
                headers: { Authorization: `Bearer ${resetToken}` }
            });
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.message || 'Erreur changement mot de passe';
        }
    },

    deleteAccount: async (password: string) => {
        try {
            const response = await api.post('/sabeel-guide/auth/delete-account', { password });
            try {
                await AsyncStorage.removeItem('auth_token');
                await AsyncStorage.removeItem('user_data');
            } catch (e) {
                console.warn('[AuthService] AsyncStorage access failed during deletion');
            }
            setMemoryToken(null);
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.message || 'Erreur suppression compte';
        }
    },

    logout: async () => {
        try {
            await api.post('/sabeel-guide/auth/logout');
        } catch (e) {
            // Silently ignore server-side logout failure
        } finally {
            try {
                await AsyncStorage.removeItem('auth_token');
                await AsyncStorage.removeItem('user_data');
            } catch (e) {
                console.warn('[AuthService] AsyncStorage access failed during logout');
            }
            setMemoryToken(null);
        }
    },

    setExpoPushToken: async (expoPushToken: string) => {
        try {
            const response = await api.post('/sabeel-guide/auth/expo-push-token', { expoPushToken });
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.message || 'Erreur enregistrement push token';
        }
    },

    getAccessToken: async (): Promise<string | null> => {
        const memoryToken = getMemoryToken();
        if (memoryToken) {
            return memoryToken;
        }

        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (token) {
                setMemoryToken(token);
            }
            return token;
        } catch (e) {
            return null;
        }
    }
};
