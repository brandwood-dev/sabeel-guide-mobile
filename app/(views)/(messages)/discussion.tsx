import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    View,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { useThemeColors, useIsDarkMode } from '@/hooks/useThemeColors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { messagingApi, reservationApi } from '@/services/api';
import { createMessagingSocket } from '@/services/messagingSocket';
import { getUserAvatarUrl } from '@/services/media';
import { useUser } from '@/context/UserContext';

type ChatMessage = {
    id: string;
    text: string;
    timestamp: string;
    sortTs: number;
    isSent: boolean;
    type: 'text' | 'reservation_request' | 'reservation_status' | 'system';
    reservation?: any | null;
};

const dedupeMessagesById = (items: ChatMessage[]) => {
    const seen = new Set<string>();
    const out: ChatMessage[] = [];
    for (const item of items) {
        if (!item?.id) continue;
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        out.push(item);
    }
    return out;
};

const formatTime = (value?: string | Date) => {
    if (!value) return '';
    return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const buildStableMessageId = (message: any) => {
    const rawCreatedAt = message?.createdAt ? String(message.createdAt) : '';
    const rawSender = message?.senderUserId ? String(message.senderUserId) : (message?.senderRole ? String(message.senderRole) : '');
    const rawContent = message?.content ? String(message.content) : '';
    const rawType = message?.messageType ? String(message.messageType) : '';
    return `msg:${rawCreatedAt}|${rawSender}|${rawType}|${rawContent}`;
};

const getMessageSortTs = (message: any) => {
    const raw = message?.createdAt || message?.sentAt || message?.updatedAt || null;
    const ms = raw ? Date.parse(String(raw)) : NaN;
    return Number.isFinite(ms) ? ms : 0;
};

const mapBackendMessage = (message: any, currentUserId?: string): ChatMessage => {
    const id = message?.id ? String(message.id) : buildStableMessageId(message);
    return {
        id,
        text: String(message?.content || ''),
        timestamp: formatTime(message?.createdAt),
        sortTs: getMessageSortTs(message),
        isSent: Boolean(currentUserId)
            ? String(message?.senderUserId || '') === String(currentUserId)
            : message?.senderRole === 'guide',
        type: message?.messageType || 'text',
        reservation: message?.metadata?.reservation || null,
    };
};

const DiscussionScreen = () => {
    const colors = useThemeColors() as any;
    const isDarkMode = useIsDarkMode();
    const router = useRouter();
    const params = useLocalSearchParams();
    const { conversationId, name, photo } = params;

    const { user, userMode } = useUser();
    const isAgencyRole = String((user as any)?.activeRole || '') === 'agency' || userMode === 'agency';

    const conversationIdValue = typeof conversationId === 'string' ? conversationId : '';
    const contactName = typeof name === 'string' ? name : 'Discussion';
    const contactPhoto = typeof photo === 'string' ? photo : '';

    const [conversation, setConversation] = useState<any>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);

    const listRef = useRef<FlatList<ChatMessage> | null>(null);
    const didInitialScrollRef = useRef(false);

    const scrollToBottom = () => {
        try {
            listRef.current?.scrollToEnd({ animated: false });
        } catch (e) {}
    };

    useEffect(() => {
        if (!conversationIdValue) return;

        let socketRef: any = null;
        let mounted = true;

        const syncConversation = async (initial = false) => {
            try {
                if (initial) setLoading(true);
                const res = await messagingApi.getConversationById(conversationIdValue);
                if (!mounted) return;

                const conv = res.data?.conversation || null;
                const msgs = Array.isArray(res.data?.messages) ? res.data.messages : [];
                setConversation(conv);
                const meId = (user as any)?.id ? String((user as any).id) : '';
                const mapped = msgs
                    .map((m: any) => mapBackendMessage(m, meId))
                    .sort((a: ChatMessage, b: ChatMessage) => (Number(a?.sortTs) || 0) - (Number(b?.sortTs) || 0));
                setMessages(dedupeMessagesById(mapped));
            } catch (e: any) {
                console.warn('[GuideDiscussion] sync failed', e?.message);
            } finally {
                if (mounted && initial) setLoading(false);
            }
        };

        const setupSocket = async () => {
            try {
                socketRef = await createMessagingSocket();
                socketRef.emit('join_conversation', { conversationId: conversationIdValue });

                socketRef.on('message_created', (payload: any) => {
                    if (payload?.conversation?.id !== conversationIdValue || !payload?.message) return;
                    const meId = (user as any)?.id ? String((user as any).id) : '';
                    const nextMessage = mapBackendMessage(payload.message, meId);
                    setConversation(payload.conversation || null);
                    setMessages((prev) => {
                        if (prev.some((m) => m.id === nextMessage.id)) return prev;
                        const merged = dedupeMessagesById([...prev, nextMessage]);
                        merged.sort((a, b) => (Number(a?.sortTs) || 0) - (Number(b?.sortTs) || 0));
                        return merged;
                    });
                });

                socketRef.on('reservation_updated', (payload: any) => {
                    if (payload?.conversation?.id !== conversationIdValue) return;
                    setConversation((prev: any) => ({ ...prev, ...(payload.conversation || {}) }));
                    if (payload?.message) {
                        const meId = (user as any)?.id ? String((user as any).id) : '';
                        const nextMessage = mapBackendMessage(payload.message, meId);
                        setMessages((prev) => {
                            if (prev.some((m) => m.id === nextMessage.id)) return prev;
                            const merged = dedupeMessagesById([...prev, nextMessage]);
                            merged.sort((a, b) => (Number(a?.sortTs) || 0) - (Number(b?.sortTs) || 0));
                            return merged;
                        });
                    }
                });
            } catch (e) {
                console.warn('[GuideDiscussion] socket setup failed', (e as any)?.message);
            }
        };

        syncConversation(true);
        setupSocket();

        return () => {
            mounted = false;
            if (socketRef) socketRef.disconnect();
        };
    }, [conversationIdValue]);

    useEffect(() => {
        if (loading) return;
        if (!messages?.length) return;
        if (didInitialScrollRef.current) return;

        didInitialScrollRef.current = true;
        requestAnimationFrame(() => {
            scrollToBottom();
        });
    }, [loading, messages?.length]);

    const reservationMessage = useMemo(
        () => [...messages].reverse().find((item) => item.reservation),
        [messages]
    );

    const reservationStatus = reservationMessage?.reservation?.status || (conversation?.isLocked ? 'pending' : 'accepted');
    const canSendMessages = !conversation?.isLocked;

    const handleStartCall = () => {
        const targetUserId = conversation?.pilgrimUserId ? String(conversation.pilgrimUserId) : '';
        if (!targetUserId) {
            Alert.alert('Erreur', 'Impossible de démarrer un appel pour cette discussion');
            return;
        }

        router.push({
            pathname: '/(views)/(screens)/call' as any,
            params: {
                type: 'sender',
                pilgrimUserId: targetUserId,
                name: contactName,
                photo: contactPhoto,
                conversationId: conversationIdValue ? String(conversationIdValue) : '',
            },
        });
    };

    const handleSendMessage = async () => {
        if (!inputText.trim() || !conversationIdValue) return;
        if (!canSendMessages) return;

        const messageText = inputText.trim();
        setInputText('');

        const tempId = `temp-${Date.now()}`;
        const optimistic: ChatMessage = {
            id: tempId,
            text: messageText,
            timestamp: formatTime(new Date()),
            isSent: true,
            type: 'text',
        };

        setMessages((prev) => [...prev, optimistic]);

        try {
            const res = await messagingApi.sendMessage(conversationIdValue, { content: messageText });
            const next = mapBackendMessage(res.data?.message);
            setConversation(res.data?.conversation || null);
            setMessages((prev) => dedupeMessagesById(prev.map((m) => (m.id === tempId ? next : m))));
        } catch (e: any) {
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            setInputText(messageText);
            Alert.alert('Envoi échoué', e?.response?.data?.message || e?.message || 'Impossible d\'envoyer le message');
        }
    };

    const handleAcceptReservation = async () => {
        const reservationId = reservationMessage?.reservation?.id;
        if (!reservationId) return;
        try {
            await reservationApi.acceptGuideReservation(String(reservationId));
        } catch (e: any) {
            Alert.alert('Erreur', e?.response?.data?.message || e?.message || 'Impossible d\'accepter la réservation');
        }
    };

    const handleRejectReservation = async () => {
        const reservationId = reservationMessage?.reservation?.id;
        if (!reservationId) return;
        try {
            await reservationApi.rejectGuideReservation(String(reservationId));
        } catch (e: any) {
            Alert.alert('Erreur', e?.response?.data?.message || e?.message || 'Impossible de refuser la réservation');
        }
    };

    const renderReservationCard = (item: ChatMessage) => {
        if (!item.reservation) return null;

        const statusLabel =
            reservationStatus === 'accepted'
                ? 'Réservation acceptée'
                : reservationStatus === 'rejected'
                  ? 'Réservation refusée'
                  : 'En attente de validation';

        return (
            <View style={[styles.messageContainer, styles.fullWidthMessage]}>
                <View style={[styles.reservationCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                    <View style={styles.reservationHeader}>
                        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                        <Text style={[styles.reservationTitle, { color: colors.primary }]}>Demande de réservation</Text>
                    </View>

                    <View style={styles.reservationRows}>
                        <Text style={[styles.reservationLine, { color: colors.text }]}>Client : {item.reservation.pilgrimName || 'Pèlerin'}</Text>
                        <Text style={[styles.reservationLine, { color: colors.text }]}>Date : {item.reservation.reservationDate || '-'}</Text>
                        <Text style={[styles.reservationLine, { color: colors.text }]}>Personnes : {item.reservation.pilgrimCount || 1}</Text>
                        {item.reservation.notes ? <Text style={[styles.reservationLine, { color: colors.text }]}>Note : {item.reservation.notes}</Text> : null}
                    </View>

                    {reservationStatus === 'pending' && !isAgencyRole && (
                        <View style={styles.reservationActionsRow}>
                            <TouchableOpacity style={[styles.reservationActionBtn, styles.acceptBtn, { backgroundColor: colors.primary }]} onPress={handleAcceptReservation}>
                                <Text style={styles.reservationActionText}>Accepter</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.reservationActionBtn, styles.rejectBtn]} onPress={handleRejectReservation}>
                                <Text style={styles.reservationActionText}>Refuser</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View
                        style={[
                            styles.reservationStatus,
                            reservationStatus === 'accepted'
                                ? [styles.statusAccepted, { backgroundColor: isDarkMode ? 'rgba(22, 163, 74, 0.15)' : '#D1FAE5' }]
                                : reservationStatus === 'rejected'
                                ? [styles.statusRejected, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]
                                : [styles.statusPending, { backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7' }],
                        ]}
                    >
                        <Text style={[styles.reservationStatusText, { color: colors.text }]}>{statusLabel}</Text>
                    </View>
                    <Text style={[styles.reservationTimestamp, { color: colors.textSecondary }]}>{item.timestamp}</Text>
                </View>
            </View>
        );
    };

    const renderMessage = ({ item }: { item: ChatMessage }) => {
        if (item.type === 'reservation_request' && item.reservation) {
            return renderReservationCard(item);
        }

        const isGuide = item.isSent;
        return (
            <View style={[styles.messageContainer, isGuide ? styles.guideMessage : styles.pilgrimMessage]}>
                <View style={[styles.messageBubble, isGuide ? [styles.guideBubble, { backgroundColor: colors.primary }] : [styles.pilgrimBubble, { backgroundColor: isDarkMode ? '#1E2638' : '#F1F3F5' }] ]}>
                    <Text style={[styles.messageText, { color: isGuide ? '#fff' : colors.text }]}>{item.text}</Text>
                    <Text style={[styles.messageSubTime, { color: isGuide ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>{item.timestamp}</Text>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: colors.background }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

                {/* Custom Header */}
                <View style={[styles.chatHeaderBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Image
                            source={{
                                uri:
                                    getUserAvatarUrl(contactPhoto) ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(contactName || 'User')}&background=2C5F2D&color=fff`,
                            }}
                            style={styles.headerPhoto}
                        />
                        <View>
                            <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
                                {contactName}
                            </Text>
                            <Text style={[styles.headerStatus, { color: colors.primary }]}>{conversation?.isLocked ? 'En attente' : 'Active'}</Text>
                        </View>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={handleStartCall} style={styles.headerActionIcon}>
                            <Ionicons name="call" size={22} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <FlatList
                    ref={listRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.chatList}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                />

                {/* Input Bar */}
                <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                    <TouchableOpacity style={[styles.scrollDownButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={scrollToBottom} activeOpacity={0.8}>
                        <Ionicons name="chevron-down" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <View style={[styles.inputWrapper, { backgroundColor: colors.background }]}>
                        <TextInput
                            style={[styles.textInput, { color: colors.text }]}
                            placeholder="Type a message..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            value={inputText}
                            onChangeText={setInputText}
                            editable={canSendMessages}
                        />
                    </View>
                    <TouchableOpacity
                        style={[
                            styles.sendBtn,
                            { backgroundColor: colors.primary },
                            (!inputText.trim() || !canSendMessages) && { backgroundColor: isDarkMode ? '#2E3B56' : '#CED4DA', opacity: 0.6 }
                        ]}
                        onPress={handleSendMessage}
                        disabled={!inputText.trim() || !canSendMessages}
                    >
                        <Ionicons name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
};

export default DiscussionScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    chatHeaderBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F3F5',
        marginTop: Platform.OS === 'android' ? 30 : 0,
    },
    backBtn: {
        padding: 8,
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerPhoto: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F3F5',
    },
    headerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.secondary,
        marginLeft: 12,
    },
    headerStatus: {
        fontSize: 12,
        color: '#4CAF50',
        marginLeft: 12,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    headerActionIcon: {
        padding: 8,
    },
    chatList: {
        padding: 20,
    },
    fullWidthMessage: {
        alignItems: 'stretch',
    },
    messageContainer: {
        width: '100%',
        marginVertical: 4,
    },
    guideMessage: {
        alignItems: 'flex-end',
    },
    pilgrimMessage: {
        alignItems: 'flex-start',
    },
    messageBubble: {
        maxWidth: '80%',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    guideBubble: {
        backgroundColor: theme.colors.primary,
        borderBottomRightRadius: 4,
    },
    pilgrimBubble: {
        backgroundColor: '#F1F3F5',
        borderBottomLeftRadius: 4,
    },
    accompanyingBubble: {
        backgroundColor: '#F0F7F2',
        borderWidth: 1,
        borderColor: theme.colors.primary + '30',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
        color: theme.colors.secondary,
    },
    guideText: {
        color: '#fff',
    },
    messageSubTime: {
        fontSize: 12,
        color: theme.colors.muted,
        marginTop: 6,
        textAlign: 'right',
    },
    reservationCard: {
        borderWidth: 1.5,
        borderRadius: 16,
        padding: 14,
        borderColor: theme.colors.primary,
        backgroundColor: '#fff',
    },
    reservationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    reservationTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    reservationRows: {
        gap: 6,
    },
    reservationLine: {
        fontSize: 14,
        lineHeight: 20,
        color: theme.colors.secondary,
    },
    reservationActionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
    },
    reservationActionBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
    },
    acceptBtn: {
        backgroundColor: theme.colors.primary,
    },
    rejectBtn: {
        backgroundColor: '#EF4444',
    },
    reservationActionText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    reservationStatus: {
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'center',
    },
    statusPending: {
        backgroundColor: '#FEF3C7',
    },
    statusAccepted: {
        backgroundColor: '#D1FAE5',
    },
    statusRejected: {
        backgroundColor: '#FEE2E2',
    },
    reservationStatusText: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.secondary,
    },
    reservationTimestamp: {
        marginTop: 10,
        fontSize: 11,
        color: theme.colors.muted,
        alignSelf: 'flex-end',
    },
    guideSubTime: {
        color: 'rgba(255,255,255,0.7)',
    },
    scrollDownButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F3F5',
        backgroundColor: '#fff',
        marginRight: 10,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F1F3F5',
    },
    attachmentBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0F7F2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 24,
        marginHorizontal: 12,
        paddingHorizontal: 16,
        minHeight: 44,
        maxHeight: 100,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        color: theme.colors.secondary,
        paddingVertical: 8,
    },
    emojiBtn: {
        padding: 4,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    sendBtnDisabled: {
        backgroundColor: '#CED4DA',
        shadowOpacity: 0,
        elevation: 0,
    },
});
