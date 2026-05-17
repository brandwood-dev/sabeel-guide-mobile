import { io, Socket } from 'socket.io-client';
import { SERVER_BASE_URL } from './api';

export interface InAppNotification {
    type: string;
    title: string;
    message: string;
    actionLabel?: string;
    action?: string;
    timestamp: string;
}

type NotificationListener = (notification: InAppNotification) => void;

class NotificationService {
    private socket: Socket | null = null;
    private listeners: NotificationListener[] = [];
    private isConnected = false;

    connect(token: string) {
        if (this.socket?.connected) return;

        this.socket = io(`${SERVER_BASE_URL}/notifications`, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });

        this.socket.on('connect', () => {
            console.log('[WS] Connected to notifications gateway');
            this.isConnected = true;
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[WS] Disconnected:', reason);
            this.isConnected = false;
        });

        this.socket.on('connection_ack', (data: any) => {
            console.log('[WS] Connection acknowledged:', data);
        });

        this.socket.on('profile_incomplete', (notification: InAppNotification) => {
            console.log('[WS] Received profile_incomplete notification');
            this.listeners.forEach(listener => listener(notification));
        });

        this.socket.on('new_notification', (payload: any) => {
            const notification: InAppNotification = {
                type: payload?.data?.type || payload?.type || 'notification',
                title: payload?.title || 'Notification',
                message: payload?.body || payload?.message || '',
                actionLabel: payload?.actionLabel,
                action: payload?.action,
                timestamp: payload?.timestamp || new Date().toISOString(),
            };
            this.listeners.forEach(listener => listener(notification));
        });

        this.socket.on('connect_error', (err) => {
            console.warn('[WS] Connection error:', err.message);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            console.log('[WS] Manually disconnected');
        }
    }

    addListener(listener: NotificationListener): () => void {
        this.listeners.push(listener);
        // Return an unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    get connected() {
        return this.isConnected;
    }
}

export const notificationService = new NotificationService();
