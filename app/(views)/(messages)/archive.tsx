import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StatusBar,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    Alert,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';

import { createMessagingSocket } from '@/services/messagingSocket';
import { messagingApi } from '@/services/api';
import { theme } from '@/theme';
import { getUserAvatarUrl } from '@/services/media';

type ConversationItem = {
    id: string;
    displayName: string;
    imageUrl?: string;
    roleLabel?: string;
    lastMessageText?: string;
    lastMessageAt?: string;
};

const dedupeConversationsById = (items: ConversationItem[]) => {
    const map = new Map<string, ConversationItem>();
    for (const item of items) {
        if (!item?.id) continue;
        map.set(String(item.id), item);
    }
    return Array.from(map.values());
};

export default function ArchiveScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [loading, setLoading] = useState(true);

    const socketRef = useRef<any>(null);

    const fetchArchived = async (mounted: { current: boolean }) => {
        try {
            setLoading(true);
            const res = await messagingApi.getArchivedConversations();
            const list = Array.isArray(res.data)
                ? res.data
                : (Array.isArray(res.data?.conversations) ? res.data.conversations : []);

            const mapped: ConversationItem[] = list.map((conv: any) => {
                const roleLabel = conv.groupId
                    ? 'Groupe'
                    : (conv.pilgrimUserId ? 'Pèlerin' : 'Agence');

                return {
                    id: String(conv.id),
                    displayName:
                        (conv.groupId ? (conv.groupName || 'Groupe') : null) ||
                        (conv.pilgrimUserId ? (conv.pilgrimDisplayName || 'Pèlerin') : null) ||
                        conv.agencyDisplayName ||
                        conv.guideDisplayName ||
                        'Discussion',
                    imageUrl:
                        (conv.groupId ? (conv.groupImageUrl || '') : null) ||
                        (conv.pilgrimUserId ? (conv.pilgrimImageUrl || '') : null) ||
                        conv.agencyImageUrl ||
                        conv.guideImageUrl ||
                        '',
                    roleLabel,
                    lastMessageText: conv.lastMessageText || '',
                    lastMessageAt: conv.lastMessageAt
                        ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '',
                };
            });

            if (mounted.current) {
                setConversations(dedupeConversationsById(mapped));
            }
        } catch (e: any) {
            if (mounted.current) {
                setConversations([]);
                Alert.alert('Messagerie', e?.response?.data?.message || e?.message || 'Impossible de charger les archives');
            }
        } finally {
            if (mounted.current) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        const mounted = { current: true };

        const connectSocket = async () => {
            try {
                const socket = await createMessagingSocket();
                socketRef.current = socket;
                const refresh = () => fetchArchived(mounted);
                socket.on('conversation_archived', refresh);
                socket.on('conversation_unarchived', refresh);
                socket.on('conversation_deleted', refresh);
            } catch (e) {
                // ignore
            }
        };

        fetchArchived(mounted);
        connectSocket();

        return () => {
            mounted.current = false;
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return conversations;
        return conversations.filter((c) => c.displayName.toLowerCase().includes(q));
    }, [conversations, searchQuery]);

    const handleUnarchive = async (conversationId: string) => {
        try {
            await messagingApi.unarchiveConversation(conversationId);
            setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        } catch (e: any) {
            Alert.alert('Erreur', e?.response?.data?.message || e?.message || "Impossible de désarchiver");
        }
    };

    const handleDelete = async (conversationId: string) => {
        Alert.alert(
            'Supprimer la discussion',
            'Cette action est définitive. Voulez-vous continuer ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await messagingApi.deleteConversation(conversationId);
                            setConversations((prev) => prev.filter((c) => c.id !== conversationId));
                        } catch (e: any) {
                            Alert.alert('Erreur', e?.response?.data?.message || e?.message || 'Suppression impossible');
                        }
                    },
                },
            ]
        );
    };

    const renderRightActions = (conversationId: string) => (
        <View style={styles.swipeActions}>
            <TouchableOpacity
                style={[styles.swipeButton, { backgroundColor: '#6B7280' }]}
                onPress={() => handleUnarchive(conversationId)}
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

    const openConversation = (item: ConversationItem) => {
        router.push({
            pathname: '/discussion',
            params: {
                conversationId: item.id,
                name: item.displayName,
                photo: item.imageUrl || '',
                isLocked: 'false',
            },
        });
    };

    const renderItem = ({ item }: { item: ConversationItem }) => (
        <Swipeable renderRightActions={() => renderRightActions(String(item.id))}>
            <TouchableOpacity style={styles.chatCard} onPress={() => openConversation(item)}>
                <View style={styles.photoContainer}>
                    <Image
                        source={{
                            uri:
                                getUserAvatarUrl(item.imageUrl) ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(item.displayName || 'User')}&background=2C5F2D&color=fff`,
                        }}
                        style={styles.chatPhoto}
                    />
                </View>
                <View style={styles.chatDetails}>
                    <View style={styles.chatHeader}>
                        <Text style={styles.chatName} numberOfLines={1}>{item.displayName}</Text>
                        <Text style={styles.chatTime}>{item.lastMessageAt || ''}</Text>
                    </View>
                    {item.roleLabel ? (
                        <Text style={styles.chatRole} numberOfLines={1}>
                            {item.roleLabel}
                        </Text>
                    ) : null}
                    <View style={styles.chatFooter}>
                        <Text style={styles.lastMessage} numberOfLines={1}>
                            {item.lastMessageText || 'Discussion'}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Swipeable>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.inboxContainer}>
                <View style={styles.topHeader}>
                    <TouchableOpacity style={styles.headerActionButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={theme.colors.secondary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Archives</Text>
                    <View style={styles.headerActionButton} />
                </View>

                <View style={styles.searchWrapper}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search-outline" size={20} color={theme.colors.muted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Rechercher une discussion archivée..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshing={loading}
                    onRefresh={() => {}}
                    ListEmptyComponent={!loading ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="archive-outline" size={64} color={theme.colors.muted} />
                            <Text style={styles.emptyText}>Aucune discussion archivée</Text>
                        </View>
                    ) : null}
                />
            </View>
        </SafeAreaView>
    );
}

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
        paddingTop: 20,
        paddingBottom: 10,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.secondary,
    },
    headerActionButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
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
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
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
});
