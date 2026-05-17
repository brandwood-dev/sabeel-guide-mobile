import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Platform,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    FlatList,
    Image,
    ScrollView,
    Dimensions,
    StatusBar,
    Modal,
    Alert,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { messagingApi } from '@/services/api';
import { createMessagingSocket } from '@/services/messagingSocket';
import { useUser } from '@/context/UserContext';
import { getUserAvatarUrl } from '@/services/media';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Swipeable } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');

const getConversationsCacheKey = (roleKey: string) => `@guide_conversations_cache_${roleKey}`;

type ConversationItem = {
    id: string;
    displayName: string;
    imageUrl?: string;
    roleLabel?: string;
    lastMessageText?: string;
    lastMessageAt?: string;
    lastMessageTs?: number;
    isLocked?: boolean;
    unread?: number;
};

const dedupeConversationsById = (items: ConversationItem[]) => {
    const map = new Map<string, ConversationItem>();
    for (const item of items) {
        if (!item?.id) continue;
        map.set(String(item.id), item);
    }
    return Array.from(map.values());
};

const ChatScreen = () => {
    const router = useRouter();
    const navigation = useNavigation<any>();
    const { user, unreadMessagesCount, setUnreadMessagesCount, userMode } = useUser();
    const roleKey = String((user as any)?.activeRole || userMode || 'guide') === 'agency' ? 'agency' : 'freelance';
    const CONVERSATIONS_CACHE_KEY = getConversationsCacheKey(roleKey);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('Tous');
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmModal, setConfirmModal] = useState<{
        visible: boolean;
        type: 'archive' | 'delete';
        conversationId: string;
    }>({ visible: false, type: 'archive', conversationId: '' });

    const socketRef = useRef<any>(null);
    const unreadByConversationRef = useRef<Record<string, number>>({});
    const globalUnreadRef = useRef<number>(0);

    const mountedRef = useRef(true);

    const saveToCache = async (data: ConversationItem[]) => {
        try {
            await AsyncStorage.setItem(CONVERSATIONS_CACHE_KEY, JSON.stringify(data));
        } catch (e) {
            // ignore
        }
    };

    const handleArchive = (conversationId: string) => {
        setConfirmModal({ visible: true, type: 'archive', conversationId });
    };

    const handleDelete = (conversationId: string) => {
        setConfirmModal({ visible: true, type: 'delete', conversationId });
    };

    const executeConfirmAction = async () => {
        const { type, conversationId } = confirmModal;
        setConfirmModal({ visible: false, type, conversationId: '' });

        try {
            if (type === 'archive') {
                await messagingApi.archiveConversation(conversationId);
            } else {
                await messagingApi.deleteConversation(conversationId);
            }

            unreadByConversationRef.current[conversationId] = 0;

            setConversations((prev) => {
                const next = (Array.isArray(prev) ? prev : []).filter((c) => c.id !== conversationId);
                saveToCache(next);
                return next;
            });
        } catch (e: any) {
            Alert.alert('Erreur', e?.response?.data?.message || e?.message || "L'action a échoué");
        }
    };

    const renderRightActions = (conversationId: string) => (
        <View style={styles.swipeActions}>
            <TouchableOpacity
                style={[styles.swipeButton, { backgroundColor: '#6B7280' }]}
                onPress={() => handleArchive(conversationId)}
            >
                <Ionicons name="archive-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.swipeButton, { backgroundColor: '#EF4444' }]}
                onPress={() => handleDelete(conversationId)}
            >
                <Ionicons name="trash-outline" size={22} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    const loadFromCache = async () => {
        try {
            const cached = await AsyncStorage.getItem(CONVERSATIONS_CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed)) {
                    setConversations(parsed);
                    setLoading(false);
                }
            }
        } catch (e) {
            // ignore
        }
    };

    const fetchConversations = async (mounted: { current: boolean }) => {
        try {
            setLoading(true);
            const res = await messagingApi.getMyConversations();
            const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.conversations) ? res.data.conversations : []);

            const mapped: ConversationItem[] = list.map((conv: any) => {
                const rawTs =
                    conv.lastMessageAt ||
                    conv.lastMessage?.createdAt ||
                    conv.updatedAt ||
                    conv.createdAt ||
                    null;
                const lastMessageTs = rawTs ? Date.parse(String(rawTs)) : NaN;

                const isGroupConversation = Boolean(conv.groupId || conv.freelanceGroupId);

                const roleLabel = isGroupConversation
                    ? 'Groupe'
                    : (conv.pilgrimUserId ? 'Pèlerin' : 'Agence');

                return {
                    id: String(conv.id),
                    displayName:
                        (isGroupConversation ? (conv.groupName || 'Groupe') : null) ||
                        (conv.pilgrimUserId ? (conv.pilgrimDisplayName || 'Pèlerin') : null) ||
                        conv.agencyDisplayName ||
                        conv.guideDisplayName ||
                        'Discussion',
                    imageUrl:
                        (isGroupConversation ? (conv.groupImageUrl || '') : null) ||
                        (conv.pilgrimUserId ? (conv.pilgrimImageUrl || '') : null) ||
                        conv.agencyImageUrl ||
                        conv.guideImageUrl ||
                        '',
                    roleLabel,
                    lastMessageText: conv.lastMessageText || '',
                    lastMessageAt: conv.lastMessageAt
                        ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '',
                    lastMessageTs: Number.isFinite(lastMessageTs) ? lastMessageTs : 0,
                    isLocked: Boolean(conv.isLocked),
                    unread: unreadByConversationRef.current[String(conv.id)] || 0,
                };
            });

            if (mounted.current) {
                const next = dedupeConversationsById(mapped).sort((a, b) => (b.lastMessageTs || 0) - (a.lastMessageTs || 0));
                setConversations(next);
                saveToCache(next);
            }
        } catch (e) {
            if (mounted.current) {
                setConversations([]);
            }
        } finally {
            if (mounted.current) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        globalUnreadRef.current = Number.isFinite(unreadMessagesCount) ? unreadMessagesCount : 0;
    }, [unreadMessagesCount]);

    useEffect(() => {
        const mounted = { current: true };

        const unsubscribe = (navigation as any).addListener('focus', () => {
            unreadByConversationRef.current = {};
            globalUnreadRef.current = 0;
            setUnreadMessagesCount(0);

            fetchConversations(mounted);
        });

        return () => {
            mounted.current = false;
            try {
                if (typeof unsubscribe === 'function') unsubscribe();
            } catch (e) {}
        };
    }, [navigation, setUnreadMessagesCount]);

    useEffect(() => {
        const mounted = { current: true };

        if (conversations.length === 0) {
            loadFromCache();
        }
        fetchConversations(mounted);

        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const connectSocket = async () => {
            try {
                const socket = await createMessagingSocket();
                socketRef.current = socket;

                const refreshConversations = async () => {
                    try {
                        await fetchConversations({ current: mountedRef.current });
                    } catch (e) {
                        // ignore
                    }
                };

                socket.on('message_created', (payload: any) => {
                    const conversationId = payload?.conversation?.id ? String(payload.conversation.id) : '';
                    const message = payload?.message;
                    if (!conversationId || !message) return;

                    const senderUserId = message?.senderUserId ? String(message.senderUserId) : '';
                    const currentUserId = user?.id ? String(user.id) : '';
                    const isMyMessage = currentUserId && senderUserId && senderUserId === currentUserId;

                    setConversations((prev) => {
                        const nextPrev = Array.isArray(prev) ? prev : [];
                        const idx = nextPrev.findIndex((c) => c.id === conversationId);

                        const nextUnread = isMyMessage ? 0 : (unreadByConversationRef.current[conversationId] || 0) + 1;
                        if (!isMyMessage) {
                            unreadByConversationRef.current[conversationId] = nextUnread;
                            globalUnreadRef.current = (globalUnreadRef.current || 0) + 1;
                            setUnreadMessagesCount(globalUnreadRef.current);
                        }

                        const lastMessageText = String(message?.content || '');
                        const lastMessageAt = message?.createdAt
                            ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '';

                        if (idx === -1) {
                            const conv = payload?.conversation || {};
                            const roleLabel = conv.groupId
                                ? 'Groupe'
                                : (conv.pilgrimUserId ? 'Pèlerin' : 'Agence');

                            const displayName =
                                (conv.groupId ? (conv.groupName || 'Groupe') : null) ||
                                (conv.pilgrimUserId ? (conv.pilgrimDisplayName || 'Pèlerin') : null) ||
                                conv.agencyDisplayName ||
                                conv.guideDisplayName ||
                                'Discussion';

                            const imageUrl =
                                (conv.groupId ? (conv.groupImageUrl || '') : null) ||
                                (conv.pilgrimUserId ? (conv.pilgrimImageUrl || '') : null) ||
                                conv.agencyImageUrl ||
                                conv.guideImageUrl ||
                                '';

                            const item: ConversationItem = {
                                id: conversationId,
                                displayName,
                                imageUrl,
                                roleLabel,
                                lastMessageText,
                                lastMessageAt,
                                isLocked: Boolean(conv.isLocked),
                                unread: isMyMessage ? 0 : nextUnread,
                            };
                            const next = dedupeConversationsById([item, ...nextPrev]);
                            saveToCache(next);
                            return next;
                        }

                        const updated = {
                            ...nextPrev[idx],
                            lastMessageText,
                            lastMessageAt,
                            unread: isMyMessage ? nextPrev[idx].unread || 0 : nextUnread,
                        };

                        const without = nextPrev.filter((_, i) => i !== idx);
                        const next = dedupeConversationsById([updated, ...without]);
                        saveToCache(next);
                        return next;
                    });
                });

                socket.on('conversation_archived', refreshConversations);
                socket.on('conversation_unarchived', refreshConversations);
                socket.on('conversation_deleted', refreshConversations);
            } catch (e) {
                if (isMounted) {
                    console.warn('[GuideMessages] socket connect failed', (e as any)?.message);
                }
            }
        };

        connectSocket();
        return () => {
            isMounted = false;
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [user?.id]);

    const filteredChats = useMemo(() => {
        const q = searchQuery.toLowerCase();
        const bySearch = conversations.filter((c) => c.displayName.toLowerCase().includes(q));

        if (activeFilter === 'Tous') return bySearch;
        if (activeFilter === 'Pèlerins') return bySearch.filter((c) => c.roleLabel === 'Pèlerin');
        if (activeFilter === 'Groupes') return bySearch.filter((c) => c.roleLabel === 'Groupe');
        if (activeFilter === 'Agences') return bySearch.filter((c) => c.roleLabel === 'Agence');
        if (activeFilter === 'Accompagnants') return bySearch.filter((c) => c.roleLabel === 'Accompagnant');
        return bySearch;
    }, [activeFilter, conversations, searchQuery]);

    const openDiscussion = (item: any) => {
        const prevUnread = unreadByConversationRef.current[String(item.id)] || 0;
        if (prevUnread > 0) {
            unreadByConversationRef.current[String(item.id)] = 0;
            setConversations((prev) => prev.map((c) => (c.id === String(item.id) ? { ...c, unread: 0 } : c)));
            globalUnreadRef.current = Math.max(0, (globalUnreadRef.current || 0) - prevUnread);
            setUnreadMessagesCount(globalUnreadRef.current);
        }
        router.push({
            pathname: '/discussion',
            params: {
                conversationId: item.id,
                name: item.displayName,
                photo: item.imageUrl || '',
                isLocked: item.isLocked ? 'true' : 'false',
            }
        });
    };

    const renderInboxItem = ({ item }: { item: ConversationItem }) => (
        <Swipeable renderRightActions={() => renderRightActions(String(item.id))}>
            <TouchableOpacity style={styles.chatCard} onPress={() => openDiscussion(item)}>
                <View style={styles.photoContainer}>
                    <Image
                        source={{
                            uri:
                                getUserAvatarUrl(item.imageUrl) ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(item.displayName || 'User')}&background=2C5F2D&color=fff`,
                        }}
                        style={styles.chatPhoto}
                    />
                    {!item.isLocked && <View style={styles.onlineBadge} />}
                </View>
                <View style={styles.chatDetails}>
                    <View style={styles.chatHeader}>
                        <Text style={styles.chatName} numberOfLines={1}>{item.displayName}</Text>
                        <View style={styles.timeWrap}>
                            <Text style={styles.chatTime}>{item.lastMessageAt || ''}</Text>
                            {item.unread && item.unread > 0 ? (
                                <View style={styles.unreadBadge}>
                                    <Text style={styles.unreadBadgeText}>
                                        {item.unread > 99 ? '99+' : String(item.unread)}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </View>
                    {item.roleLabel ? (
                        <Text style={styles.chatRole} numberOfLines={1}>
                            {item.roleLabel}
                        </Text>
                    ) : null}
                    <View style={styles.chatFooter}>
                        <Text style={styles.lastMessage} numberOfLines={1}>
                            {item.lastMessageText || (item.isLocked ? 'Nouvelle demande de réservation' : 'Discussion')}
                        </Text>
                    </View>
                    {item.isLocked && (
                        <View style={styles.groupTag}>
                            <Ionicons name="time-outline" size={12} color={theme.colors.muted} />
                            <Text style={styles.groupTagText}>En attente de validation</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        </Swipeable>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.inboxContainer}>
                {/* Inbox Header */}
                <View style={styles.topHeader}>
                    <Text style={styles.headerTitle}>Messages</Text>
                    <TouchableOpacity
                        style={styles.headerActionButton}
                        onPress={() => router.push('/archive' as any)}
                    >
                        <Ionicons name="archive-outline" size={22} color={theme.colors.secondary} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchWrapper}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search-outline" size={20} color={theme.colors.muted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search conversations..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                {/* Filters */}
                <View style={styles.filterWrapper}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.filterScroll}
                        contentContainerStyle={styles.filterContent}
                    >
                        {['Tous', 'Pèlerins', 'Groupes', 'Agences', 'Accompagnants'].map((filter) => (
                            <TouchableOpacity
                                key={filter}
                                style={[styles.filterChip, activeFilter === filter && styles.activeFilterChip]}
                                onPress={() => setActiveFilter(filter)}
                            >
                                <Text style={[styles.filterChipText, activeFilter === filter && styles.activeFilterChipText]}>
                                    {filter}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <FlatList
                    data={filteredChats}
                    keyExtractor={(item) => item.id}
                    renderItem={renderInboxItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshing={loading}
                    onRefresh={() => { }}
                />

                <Modal
                    visible={confirmModal.visible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setConfirmModal({ ...confirmModal, visible: false })}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setConfirmModal({ ...confirmModal, visible: false })}
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.modalIndicator} />
                            <Text style={styles.modalTitle}>
                                {confirmModal.type === 'archive' ? 'Archiver la discussion' : 'Supprimer la discussion'}
                            </Text>
                            <Text style={styles.modalMessage}>
                                {confirmModal.type === 'archive'
                                    ? 'Voulez-vous archiver cette conversation ? Elle pourra être retrouvée dans vos archives.'
                                    : 'Cette action est définitive. Voulez-vous vraiment supprimer cette discussion ?'}
                            </Text>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[
                                        styles.confirmBtn,
                                        { backgroundColor: confirmModal.type === 'archive' ? theme.colors.primary : '#EF4444' },
                                    ]}
                                    onPress={executeConfirmAction}
                                >
                                    <Text style={styles.confirmBtnText}>
                                        {confirmModal.type === 'archive' ? 'Archiver' : 'Supprimer'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => setConfirmModal({ ...confirmModal, visible: false })}
                                >
                                    <Text style={styles.cancelBtnText}>Annuler</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </View>
        </SafeAreaView>
    );
};

export default ChatScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    inboxContainer: {
        flex: 1,
    },
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 14,
    },
    headerActionButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.secondary,
    },
    newChatBtn: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#F0F7F2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchWrapper: {
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: theme.colors.secondary,
    },
    filterWrapper: {
        backgroundColor: '#fff',
        paddingVertical: 8,
    },
    filterScroll: {
        maxHeight: 50,
        marginTop: 5,
        marginBottom: 5,
    },
    filterContent: {
        paddingHorizontal: 20,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 18,
        backgroundColor: '#F1F3F5',
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    activeFilterChip: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.muted,
    },
    activeFilterChipText: {
        color: '#fff',
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    chatCard: {
        flexDirection: 'row',
        padding: 10,
        borderRadius: 16,
        marginBottom: 6,
        backgroundColor: '#fff',
    },
    photoContainer: {
        position: 'relative',
    },
    chatPhoto: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F1F3F5',
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
        borderColor: '#fff',
    },
    chatDetails: {
        flex: 1,
        marginLeft: 12,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    chatRole: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.muted,
        marginBottom: 4,
        maxWidth: '80%',
    },
    timeWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    unreadBadge: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 5,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unreadBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },
    chatName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme.colors.secondary,
        maxWidth: '70%',
    },
    chatTime: {
        fontSize: 11,
        color: theme.colors.muted,
    },
    chatFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMessage: {
        fontSize: 13,
        color: theme.colors.muted,
        maxWidth: '85%',
    },
    groupTag: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 4,
    },
    groupTagText: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.muted,
    },
    swipeActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
        paddingHorizontal: 12,
    },
    swipeButton: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalIndicator: {
        width: 40,
        height: 5,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.secondary,
        textAlign: 'center',
        marginBottom: 10,
    },
    modalMessage: {
        fontSize: 14,
        color: theme.colors.muted,
        textAlign: 'center',
        marginBottom: 24,
    },
    modalActions: {
        gap: 12,
    },
    confirmBtn: {
        height: 50,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cancelBtn: {
        height: 50,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    cancelBtnText: {
        color: '#4B5563',
        fontSize: 16,
        fontWeight: '600',
    },
});

