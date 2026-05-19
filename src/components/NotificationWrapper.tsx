import React, { useEffect, useRef } from 'react';
import { Alert, Linking, Platform, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { usePathname, useRouter } from 'expo-router';
import { notificationService } from '../services/notificationService';
import { authService } from '../services/authService';
import { ensureNotificationSetup, presentLocalMessageNotification } from '../services/localNotifications';
import { createMessagingSocket } from '../services/messagingSocket';
import { useUser } from '../context/UserContext';

export const NotificationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const router = useRouter();
    const pathname = usePathname();
    const { user, setUnreadMessagesCount } = useUser();
    const pathnameRef = useRef<string>('');

    useEffect(() => {
        pathnameRef.current = pathname || '';
    }, [pathname]);

    useEffect(() => {
        ensureNotificationSetup().catch((err) => {
            console.warn('[NotificationWrapper] Failed to setup notifications', err);
        });

        const ensureNotificationPermission = async () => {
            try {
                const perms = await Notifications.getPermissionsAsync();

                if (perms.status === 'undetermined') {
                    await Notifications.requestPermissionsAsync();
                    return;
                }

                if (perms.status === 'denied') {
                    Alert.alert(
                        'Notifications désactivées',
                        "Veuillez activer les notifications dans les réglages pour recevoir les nouveaux messages.",
                        [
                            { text: 'Annuler', style: 'cancel' },
                            {
                                text: 'Ouvrir les réglages',
                                onPress: async () => {
                                    if (Platform.OS === 'ios') {
                                        await Linking.openURL('app-settings:');
                                    } else {
                                        await Linking.openSettings();
                                    }
                                },
                            },
                        ]
                    );
                }
            } catch (e) {
                console.warn('[NotificationWrapper] Permission check failed:', e);
            }
        };

        const checkConnection = async () => {
            try {
                const token = await authService.getAccessToken();
                if (token) {
                    notificationService.connect(token);
                }
            } catch (error) {
                console.warn('[NotificationWrapper] Could not get token for WS:', error);
            }
        };

        let messagingSocket: any = null;

        const connectMessagingSocket = async () => {
            try {
                messagingSocket = await createMessagingSocket();

                messagingSocket.on('message_created', (payload: any) => {
                    const conversationId = payload?.conversation?.id
                        ? String(payload.conversation.id)
                        : (payload?.conversationId ? String(payload.conversationId) : '');
                    const message = payload?.message || payload;
                    const senderUserId = message?.senderUserId ? String(message.senderUserId) : '';
                    const currentUserId = user?.id ? String(user.id) : '';

                    if (!conversationId) return;
                    if (currentUserId && senderUserId && senderUserId === currentUserId) return;

                    const title =
                        payload?.conversation?.pilgrimDisplayName ||
                        payload?.conversation?.displayName ||
                        payload?.conversation?.title ||
                        'Nouveau message';
                    const body = String(message?.content || '');

                    presentLocalMessageNotification({
                        title,
                        body,
                        data: {
                            type: 'chat',
                            conversationId,
                        },
                    });

                    const currentPath = pathnameRef.current;
                    const isOnMessages = currentPath.includes('messages') || currentPath.includes('discussion');
                    if (!isOnMessages) {
                        setUnreadMessagesCount((prev) => prev + 1);
                    }
                });
            } catch (e) {
                console.warn('[NotificationWrapper] Could not connect messaging socket', e);
            }
        };

        let responseListener: Notifications.Subscription | null = null;

        try {
            responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
                const data: any = response?.notification?.request?.content?.data || {};

                if (data?.type === 'chat' && data?.conversationId) {
                    router.push({
                        pathname: '/discussion',
                        params: {
                            conversationId: String(data.conversationId),
                            name: data?.name ? String(data.name) : '',
                            photo: data?.photo ? String(data.photo) : '',
                        },
                    });
                }
            });
        } catch (err) {
            console.warn('[NotificationWrapper] Error setting up listeners', err);
        }

        ensureNotificationPermission();
        checkConnection();
        connectMessagingSocket();

        const unsubscribe = notificationService.addListener((notification) => {
            const isAgencyRole = String((user as any)?.activeRole || '') === 'agency';
            if (isAgencyRole && (notification.type === 'profile_incomplete' || notification.type === 'kyc')) {
                return;
            }

            presentLocalMessageNotification({
                title: notification.title,
                body: notification.message,
                data: {
                    type: notification.type,
                    ...(notification as any),
                },
            });
        });

        return () => {
            unsubscribe();
            if (responseListener) {
                responseListener.remove();
            }
            if (messagingSocket) {
                messagingSocket.disconnect();
            }
            // notificationService.disconnect(); // Keep it alive
        };
    }, [setUnreadMessagesCount, user?.id, user?.activeRole]);

    return (
        <View style={{ flex: 1 }}>
            {children}
        </View>
    );
};
