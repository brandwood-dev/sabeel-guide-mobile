import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    SafeAreaView,
    TouchableOpacity,
    FlatList,
    Image,
    Modal,
    Platform,
    Alert,
    StatusBar,
    ScrollView,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { useThemeColors, useIsDarkMode } from '@/hooks/useThemeColors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { sabeelGuideGroupsApi, freelanceGroupsApi } from '@/services/api';
import { messagingApi } from '@/services/api';
import { useUser } from '@/context/UserContext';
import { getUserAvatarUrl } from '@/services/media';

type PilgrimItem = {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    photo?: string;
};

const GroupeScreen = () => {
    const colors = useThemeColors() as any;
    const isDarkMode = useIsDarkMode();
    const router = useRouter();
    const params = useLocalSearchParams();
    const { userMode, user } = useUser();

    const groupId = (params.id as string) || '';
    const [group, setGroup] = useState<any>(null);
    const [members, setMembers] = useState<PilgrimItem[]>([]);
    const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [availablePilgrims, setAvailablePilgrims] = useState<PilgrimItem[]>([]);
    const [loading, setLoading] = useState(true);

    const isFreelance = userMode === 'guide' && user?.activeRole === 'freelance';

    const groupName = String(group?.name || (params.name as string) || 'Groupe');
    const groupDate = group?.departureDate
        ? String(group.departureDate).slice(0, 10)
        : String(group?.period || (params.date as string) || '');
    const groupCity = String((params.city as string) || '');
    const maxPilgrims = Number(group?.capacity || group?.maxPilgrims || parseInt(params.max as string) || 0);

    const remainingSpots = Math.max(0, (maxPilgrims || 0) - members.length);

    const canAssignPilgrims = isFreelance;

    useEffect(() => {
        if (!groupId) return;
        let mounted = true;

        const loadGroup = async () => {
            try {
                setLoading(true);
                const res = isFreelance
                    ? await freelanceGroupsApi.getById(groupId)
                    : await sabeelGuideGroupsApi.getGroupById(groupId);
                const data = (res as any)?.data || {};
                const nextGroup = data?.group || (data?.id ? data : null);

                if (!mounted) return;
                setGroup(nextGroup);

                const pilgrims = Array.isArray(nextGroup?.pilgrims) ? nextGroup.pilgrims : [];
                setMembers(
                    pilgrims.map((p: any) => ({
                        id: String(p.id),
                        firstName: p.firstName,
                        lastName: p.lastName,
                        email: p.email,
                        phoneNumber: p.phoneNumber,
                        photo: p.photo,
                    }))
                );
            } catch (e: any) {
                if (mounted) {
                    setGroup(null);
                    setMembers([]);
                    Alert.alert('Erreur', e?.response?.data?.message || e?.message || 'Impossible de charger le groupe');
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadGroup();
        return () => {
            mounted = false;
        };
    }, [groupId]);

    useEffect(() => {
        if (!addMemberModalVisible) return;
        let mounted = true;

        const loadAvailablePilgrims = async () => {
            try {
                const res = isFreelance
                    ? await freelanceGroupsApi.getAvailablePilgrims(groupId)
                    : await sabeelGuideGroupsApi.getAvailablePilgrims(groupId);
                const data = (res as any)?.data;
                const list = Array.isArray(data) ? data : (Array.isArray(data?.pilgrims) ? data.pilgrims : []);
                if (!mounted) return;
                setAvailablePilgrims(
                    list.map((p: any) => ({
                        id: String(p.id),
                        firstName: p.firstName,
                        lastName: p.lastName,
                        email: p.email,
                        phoneNumber: p.phoneNumber,
                        photo: p.photo,
                    }))
                );
            } catch (e: any) {
                if (mounted) {
                    setAvailablePilgrims([]);
                    Alert.alert('Erreur', e?.response?.data?.message || e?.message || 'Impossible de charger les pèlerins disponibles');
                }
            }
        };

        loadAvailablePilgrims();
        return () => {
            mounted = false;
        };
    }, [addMemberModalVisible, isFreelance]);

    const handleRemoveMember = (memberId: string, memberName: string) => {
        Alert.alert(
            'Remove Member',
            `Are you sure you want to remove ${memberName} from this group?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        if (!canAssignPilgrims) return;
                        (async () => {
                            try {
                                if (isFreelance) {
                                    await freelanceGroupsApi.removePilgrim(groupId, memberId);
                                } else {
                                    await sabeelGuideGroupsApi.removePilgrim(groupId, memberId);
                                }
                                setMembers((prev) => prev.filter((m: any) => m.id !== memberId));
                            } catch (e: any) {
                                Alert.alert('Erreur', e?.response?.data?.message || e?.message || 'Impossible de supprimer le pèlerin');
                            }
                        })();
                    }
                }
            ]
        );
    };

    const handleAddMember = async (pilgrim: PilgrimItem) => {
        if (!groupId) return;
        if (!canAssignPilgrims) return;
        if (remainingSpots <= 0) {
            Alert.alert('Groupe complet', 'Ce groupe a atteint sa capacité maximale.');
            return;
        }

        try {
            if (isFreelance) {
                await freelanceGroupsApi.assignPilgrims(groupId, [String(pilgrim.id)]);
            } else {
                await sabeelGuideGroupsApi.assignPilgrims(groupId, [String(pilgrim.id)]);
            }
            setAddMemberModalVisible(false);
            setMembers((prev) => {
                if (prev.some((m) => m.id === String(pilgrim.id))) return prev;
                return [...prev, pilgrim];
            });
        } catch (e: any) {
            Alert.alert('Erreur', e?.response?.data?.message || e?.message || 'Impossible d\'ajouter le pèlerin');
        }
    };

    const handleOpenChat = async () => {
        try {
            const res = isFreelance
                ? await messagingApi.getOrCreateFreelanceGroupConversation(groupId)
                : await messagingApi.getOrCreateGroupConversation(groupId);
            const conversation = res?.data?.conversation;
            const conversationId = conversation?.id ? String(conversation.id) : '';
            if (!conversationId) {
                Alert.alert('Erreur', 'Conversation introuvable');
                return;
            }

            router.push({
                pathname: '/discussion',
                params: {
                    conversationId,
                    name: groupName,
                    photo:
                        conversation?.groupImageUrl ||
                        'https://ui-avatars.com/api/?name=' + encodeURIComponent(groupName),
                },
            });
        } catch (e: any) {
            Alert.alert('Erreur', e?.response?.data?.message || e?.message || 'Impossible d\'ouvrir le chat');
        }
    };

    const renderMemberCard = ({ item }: { item: PilgrimItem }) => (
        <View style={[styles.memberCard, { backgroundColor: colors.surface }]}>
            <Image
                source={{
                    uri:
                        getUserAvatarUrl(item.photo) ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(`${item.firstName || ''} ${item.lastName || ''}`.trim() || 'User')}&background=2C5F2D&color=fff`,
                }}
                style={styles.memberPhoto}
            />
            <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: colors.text }]}>{`${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Pèlerin'}</Text>
                <View style={styles.statusRow}>
                    <View style={[
                        styles.statusDot,
                        { backgroundColor: '#4CAF50' }
                    ]} />
                    <Text style={[
                        styles.statusText,
                        { color: '#4CAF50' }
                    ]}>
                        Confirmed
                    </Text>
                </View>
            </View>
        </View>
    );

    const renderAvailablePilgrim = ({ item }: { item: PilgrimItem }) => (
        <TouchableOpacity
            style={[styles.availablePilgrimCard, { backgroundColor: colors.background }]}
            onPress={() => handleAddMember(item)}
        >
            <Image
                source={{
                    uri:
                        getUserAvatarUrl(item.photo) ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(`${item.firstName || ''} ${item.lastName || ''}`.trim() || 'User')}&background=2C5F2D&color=fff`,
                }}
                style={styles.memberPhoto}
            />
            <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: colors.text }]}>{`${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Pèlerin'}</Text>
            </View>
            <View style={styles.addIconContainer}>
                <Ionicons name="add-circle" size={28} color={colors.primary} />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            {/* Header with Close Button */}
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{groupName}</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Group Info Card */}
                <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <MaterialCommunityIcons name="map-marker" size={24} color={colors.primary} />
                            <View style={styles.infoTextContainer}>
                                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Destination</Text>
                                <Text style={[styles.infoValue, { color: colors.text }]}>{groupCity}</Text>
                            </View>
                        </View>
                        <View style={styles.infoItem}>
                            <MaterialCommunityIcons name="calendar" size={24} color={colors.primary} />
                            <View style={styles.infoTextContainer}>
                                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Departure Date</Text>
                                <Text style={[styles.infoValue, { color: colors.text }]}>{groupDate}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.capacitySection, { borderTopColor: colors.border }]}>
                        <View style={styles.capacityHeader}>
                            <MaterialCommunityIcons name="account-group" size={24} color={colors.primary} />
                            <Text style={[styles.capacityTitle, { color: colors.text }]}>Group Capacity</Text>
                        </View>
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { backgroundColor: isDarkMode ? '#2E3B56' : '#F0F0F0' }]}>
                                <View style={[styles.progressFill, { width: `${(members.length / maxPilgrims) * 100}%`, backgroundColor: colors.primary }]} />
                            </View>
                            <Text style={[styles.progressText, { color: colors.textSecondary }]}>{members.length}/{maxPilgrims} Pilgrims</Text>
                        </View>
                        <View style={styles.spotsContainer}>
                            <View style={[styles.spotsBadge, { backgroundColor: remainingSpots > 0 ? (isDarkMode ? 'rgba(76, 175, 80, 0.15)' : '#E8F5E9') : (isDarkMode ? 'rgba(244, 67, 54, 0.15)' : '#FFEBEE') }]}>
                                <Text style={[styles.spotsText, { color: remainingSpots > 0 ? '#4CAF50' : '#FF5252' }]}>
                                    {remainingSpots > 0 ? `${remainingSpots} spots remaining` : 'Group Full'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.chatBtn, { backgroundColor: colors.primary }]}
                        onPress={handleOpenChat}
                    >
                        <MaterialCommunityIcons name="message-text" size={20} color="#fff" />
                        <Text style={styles.actionBtnText}>Group Chat</Text>
                    </TouchableOpacity>
                    {canAssignPilgrims ? (
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.addBtn]}
                            onPress={() => setAddMemberModalVisible(true)}
                        >
                            <Ionicons name="person-add" size={20} color="#fff" />
                            <Text style={styles.actionBtnText}>Add Pilgrim</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                <View style={styles.membersSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Members</Text>

                    {members.length > 0 ? (
                        <FlatList
                            data={members}
                            keyExtractor={(item) => item.id}
                            renderItem={renderMemberCard}
                            scrollEnabled={false}
                            contentContainerStyle={styles.membersList}
                        />
                    ) : (
                        <View style={styles.emptyMembersState}>
                            <MaterialCommunityIcons name="account-off-outline" size={80} color={colors.border} />
                            <Text style={[styles.emptyMembersText, { color: colors.text }]}>No members in this group yet</Text>
                            <Text style={[styles.emptyMembersSubtext, { color: colors.textSecondary }]}>Tap &quot;Add Pilgrim&quot; to add members</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Add Member Modal */}
            <Modal
                visible={addMemberModalVisible}
                animationType="slide"
                transparent={true}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Pilgrim to Group</Text>
                            <TouchableOpacity onPress={() => setAddMemberModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                            Select a pilgrim to add to {groupName}
                        </Text>

                        <FlatList
                            data={availablePilgrims.filter((p) => !members.find((m) => m.id === p.id))}
                            keyExtractor={(item) => item.id}
                            renderItem={renderAvailablePilgrim}
                            contentContainerStyle={styles.availableList}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <MaterialCommunityIcons name="account-off" size={60} color={colors.border} />
                                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No available pilgrims</Text>
                                </View>
                            }
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default GroupeScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.xl,
        paddingTop: Platform.OS === 'android' ? 40 : theme.spacing.md,
        paddingBottom: theme.spacing.md,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    closeBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: theme.colors.secondary,
    },
    content: {
        flex: 1,
    },
    infoCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 12,
        borderRadius: 20,
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    infoTextContainer: {
        marginLeft: 12,
    },
    infoLabel: {
        fontSize: 11,
        color: theme.colors.muted,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.secondary,
    },
    capacitySection: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: theme.spacing.lg,
    },
    capacityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    capacityTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.secondary,
        marginLeft: 8,
    },
    progressContainer: {
        marginBottom: theme.spacing.md,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#F0F0F0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        color: theme.colors.muted,
        fontWeight: '600',
    },
    spotsContainer: {
        alignItems: 'flex-start',
    },
    spotsBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    spotsText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    actionButtons: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.xl,
        gap: 12,
        marginBottom: theme.spacing.xl,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        gap: 6,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    chatBtn: {
        backgroundColor: theme.colors.primary,
    },
    addBtn: {
        backgroundColor: '#4CAF50',
    },
    actionBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    membersSection: {
        paddingHorizontal: theme.spacing.xl,
        paddingBottom: 100,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.secondary,
        marginBottom: theme.spacing.lg,
    },
    membersList: {
        gap: 12,
    },
    memberCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    memberPhoto: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f1f1f1',
    },
    memberInfo: {
        flex: 1,
        marginLeft: 16,
    },
    memberName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.secondary,
        marginBottom: 2,
    },
    memberDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    memberPassport: {
        fontSize: 13,
        color: theme.colors.muted,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
    },
    removeBtn: {
        padding: 8,
    },
    emptyMembersState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyMembersText: {
        marginTop: 16,
        fontSize: 18,
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    emptyMembersSubtext: {
        marginTop: 8,
        fontSize: 14,
        color: theme.colors.muted,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '75%',
        padding: theme.spacing.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.secondary,
    },
    modalSubtitle: {
        fontSize: 14,
        color: theme.colors.muted,
        marginBottom: theme.spacing.xl,
    },
    availableList: {
        gap: 12,
        paddingBottom: 40,
    },
    availablePilgrimCard: {
        backgroundColor: '#F8F9FB',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    addIconContainer: {
        padding: 4,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: theme.colors.muted,
        fontWeight: '500',
    },
});
