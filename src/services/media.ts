import Constants from 'expo-constants';
import { SERVER_BASE_URL } from './api';

const getDefaultMinioPublicUrl = () => {
    const host = String(SERVER_BASE_URL || '').replace(/^https?:\/\//i, '').replace(/:\d+$/, '').replace(/\/+$/, '');
    if (!host) return '';
    return `http://${host}:9000`;
};

const configuredMinioPublicUrl =
    (Constants?.expoConfig as any)?.extra?.MINIO_PUBLIC_URL ||
    (Constants as any)?.manifest?.extra?.MINIO_PUBLIC_URL ||
    getDefaultMinioPublicUrl();

const encodePath = (value: string) =>
    String(value)
        .split('/')
        .map((s) => encodeURIComponent(s))
        .join('/');

export const getPublicMinioFileUrl = (bucket: string, keyOrUrl?: string | null) => {
    const value = String(keyOrUrl || '').trim();
    if (!value) return '';
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) return value;

    const base = String(configuredMinioPublicUrl || '').replace(/\/+$/, '');
    if (!base) return value;
    return `${base}/${encodePath(bucket)}/${encodePath(value)}`;
};

export const getUserAvatarUrl = (keyOrUrl?: string | null) => getPublicMinioFileUrl('images', keyOrUrl);
