import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    StatusBar,
    Platform,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { useRouter } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { notificationService, InAppNotification } from '@/services/notificationService';
import { notificationsApi } from '@/services/api';

type ApiNotification = {
    id: string;
    title: string;
    body: string;
    data?: Record<string, any> | null;
    readAt?: string | null;
    createdAt: string;
};

type UiNotification = {
    id: string;
    title: string;
    description: string;
    time: string;
    type: string;
    read: boolean;
    createdAt?: string;
};

const NotificationScreen = () => {
    const router = useRouter();
    const { user, userMode } = useUser();
    const isAgencyRole = String((user as any)?.activeRole || '') === 'agency' || userMode === 'agency';
    const [notifications, setNotifications] = useState<UiNotification[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const didInitRef = useRef(false);

    const mapApiToUi = (n: ApiNotification): UiNotification => {
        const type = String((n.data as any)?.type || 'notification');
        const createdAt = String(n.createdAt || '');
        return {
            id: String(n.id),
            title: String(n.title || 'Notification'),
            description: String(n.body || ''),
            time: createdAt ? new Date(createdAt).toLocaleString() : '',
            type,
            read: Boolean(n.readAt),
            createdAt,
        };
    };

    const fetchInbox = async () => {
        setRefreshing(true);
        try {
            const res = await notificationsApi.listMine({ limit: 50, offset: 0 });
            const items = Array.isArray(res.data?.items) ? res.data.items : [];
            setNotifications(items.map(mapApiToUi));
        } catch {
            // ignore
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (!didInitRef.current) {
            didInitRef.current = true;
            fetchInbox();
        }

        const unsubscribe = notificationService.addListener((n: InAppNotification) => {
            // Block KYC/profile completion noise for agency mode
            if (isAgencyRole && (n.type === 'profile_incomplete' || n.type === 'kyc')) return;

            const item = {
                id: `rt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                title: String(n.title || 'Notification'),
                description: String(n.message || ''),
                time: n.timestamp ? new Date(n.timestamp).toLocaleString() : '',
                type: String(n.type || 'notification'),
                read: false,
                createdAt: n.timestamp ? String(n.timestamp) : undefined,
            };

            setNotifications((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                return [item, ...list].slice(0, 50);
            });
        });

        return () => {
            unsubscribe();
        };
    }, [isAgencyRole]);

    const visibleNotifications = useMemo(() => {
        const list = Array.isArray(notifications) ? notifications : [];
        return isAgencyRole ? list.filter((n) => n.type !== 'wallet' && n.type !== 'document') : list;
    }, [isAgencyRole, notifications]);

    const markAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        try {
            if (!String(id).startsWith('rt-')) {
                await notificationsApi.markRead(id);
            }
        } catch {
            // ignore
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'message': return { name: 'chatbubble-ellipses', color: '#4CAF50', bg: '#E8F5E9' };
            case 'alert': return { name: 'warning', color: '#F44336', bg: '#FFEBEE' };
            case 'pilgrim': return { name: 'person-add', color: theme.colors.primary, bg: theme.colors.primary + '15' };
            case 'wallet': return { name: 'wallet', color: '#FF9800', bg: '#FFF3E0' };
            case 'document': return { name: 'document-text', color: '#2196F3', bg: '#E3F2FD' };
            default: return { name: 'notifications', color: theme.colors.muted, bg: '#F5F5F5' };
        }
    };

    const renderItem = ({ item }: { item: UiNotification }) => {
        const iconConfig = getIcon(item.type);
        return (
            <TouchableOpacity
                style={[styles.notifCard, !item.read && styles.notifCardUnread]}
                onPress={() => markAsRead(item.id)}
            >
                <View style={[styles.iconContainer, { backgroundColor: iconConfig.bg }]}>
                    <Ionicons name={iconConfig.name as any} size={22} color={iconConfig.color} />
                </View>
                <View style={styles.notifMain}>
                    <View style={styles.notifHeader}>
                        <Text style={[styles.notifTitle, !item.read && styles.textBold]}>{item.title}</Text>
                        <Text style={styles.notifTime}>{item.time}</Text>
                    </View>
                    <Text style={styles.notifDesc} numberOfLines={2}>{item.description}</Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.secondary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <TouchableOpacity
                    onPress={async () => {
                        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                        try {
                            await notificationsApi.markAllRead();
                        } catch {
                            // ignore
                        }
                    }}
                >
                    <Text style={styles.markAll}>Tout lire</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.actionsRow}>
                <TouchableOpacity
                    onPress={fetchInbox}
                    style={styles.actionBtn}
                    activeOpacity={0.8}
                >
                    <Text style={styles.actionText}>Actualiser</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={async () => {
                        try {
                            await notificationsApi.clearAll();
                            setNotifications([]);
                        } catch {
                            // ignore
                        }
                    }}
                    style={[styles.actionBtn, styles.actionDanger]}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.actionText, styles.actionDangerText]}>Tout supprimer</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={visibleNotifications}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listPadding}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={fetchInbox} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="notifications-off-outline" size={80} color={theme.colors.border} />
                        <Text style={styles.emptyText}>Aucune notification pour le moment</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        justifyContent: 'space-between',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: theme.colors.secondary,
        letterSpacing: -0.5,
    },
    markAll: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 6,
    },
    actionBtn: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: '#F7F9FC',
        borderWidth: 1,
        borderColor: '#E8EEF5',
    },
    actionText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.secondary,
    },
    actionDanger: {
        backgroundColor: '#FFF5F5',
        borderColor: '#FFD6D6',
    },
    actionDangerText: {
        color: '#F44336',
    },
    listPadding: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 40,
    },
    notifCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 20,
        backgroundColor: '#fff',
        marginBottom: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    notifCardUnread: {
        backgroundColor: '#F8FBF9',
        borderColor: theme.colors.primary + '20',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notifMain: {
        flex: 1,
        marginLeft: 15,
    },
    notifHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    notifTitle: {
        fontSize: 15,
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    textBold: {
        fontWeight: '800',
    },
    notifTime: {
        fontSize: 11,
        color: theme.colors.muted,
    },
    notifDesc: {
        fontSize: 13,
        color: theme.colors.muted,
        lineHeight: 18,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.primary,
        marginLeft: 8,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: 20,
        fontSize: 16,
        color: theme.colors.muted,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});

export default NotificationScreen;
