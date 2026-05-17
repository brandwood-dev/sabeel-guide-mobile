import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    SafeAreaView,
    TouchableOpacity,
    Image,
    ScrollView,
    StatusBar,
    Platform,
    Dimensions,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getUserAvatarUrl } from '@/services/media';
import { messagingApi } from '@/services/api';
import { useUser } from '@/context/UserContext';

const { width } = Dimensions.get('window');

const PilgrimProfileScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { userMode } = useUser();

    // Extract pilgrim data from params
    const pilgrim = {
        id: params.id as string,
        name: (params.name as string) || 'Pilgrim Name',
        status: (params.status as string) || 'Assigned',
        group: (params.group as string) || 'Individual',
        passport: (params.passport as string) || 'N/A',
        photo: (params.photo as string) || 'https://ui-avatars.com/api/?name=P',
    };

    const pilgrimAvatarUri =
        getUserAvatarUrl(pilgrim.photo) ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(pilgrim.name || 'P')}&background=2C5F2D&color=fff`;

    const openConversation = async () => {
        try {
            if (!pilgrim.id) {
                return;
            }
            const res = await messagingApi.getOrCreateGuidePilgrimConversation(String(pilgrim.id));
            const conversationId = res.data?.conversation?.id;
            if (!conversationId) {
                return;
            }

            router.push({
                pathname: '/(views)/(messages)/discussion',
                params: {
                    conversationId: String(conversationId),
                    name: pilgrim.name,
                    photo: pilgrim.photo,
                }
            });
        } catch (e: any) {
            console.warn('[PilgrimProfile] openConversation failed', e?.response?.data?.message || e?.message);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Assigned':
            case 'In group':
            case 'Confirmed': return '#4CAF50';
            case 'Waiting':
            case 'Planning': return '#FFC107';
            case 'Issue': return '#F44336';
            default: return theme.colors.muted;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Custom Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.secondary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Détails du Pèlerin</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Profile Header Card */}
                <View style={styles.profileHeaderCard}>
                    <View style={styles.photoContainer}>
                        <Image source={{ uri: pilgrimAvatarUri }} style={styles.profilePhoto} />
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(pilgrim.status) }]}>
                            <Ionicons name="checkmark-circle" size={14} color="#fff" />
                        </View>
                    </View>
                    <Text style={styles.profileName}>{pilgrim.name}</Text>
                    <View style={[styles.statusTextBadge, { backgroundColor: getStatusColor(pilgrim.status) + '15' }]}>
                        <Text style={[styles.statusLabel, { color: getStatusColor(pilgrim.status) }]}>{pilgrim.status}</Text>
                    </View>
                </View>

                {/* Info Sections */}
                <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Identification & Documents</Text>
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <View style={styles.infoIconLabel}>
                                <MaterialCommunityIcons name="passport" size={22} color={theme.colors.muted} />
                                <View style={styles.labelGroup}>
                                    <Text style={styles.infoLabel}>Numéro de Passeport</Text>
                                    <Text style={styles.infoValue}>{pilgrim.passport}</Text>
                                </View>
                            </View>
                            <TouchableOpacity>
                                <Ionicons name="copy-outline" size={18} color={theme.colors.primary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View style={styles.infoIconLabel}>
                                <MaterialCommunityIcons name="card-account-details-outline" size={22} color={theme.colors.muted} />
                                <View style={styles.labelGroup}>
                                    <Text style={styles.infoLabel}>Nationalité</Text>
                                    <Text style={styles.infoValue}>Tunisienne</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Détails du Voyage & Groupe</Text>
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <View style={styles.infoIconLabel}>
                                <MaterialCommunityIcons name="account-group-outline" size={22} color={theme.colors.muted} />
                                <View style={styles.labelGroup}>
                                    <Text style={styles.infoLabel}>Groupe Assigné</Text>
                                    <Text style={[styles.infoValue, { color: theme.colors.primary }]}>{pilgrim.group}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View style={styles.infoIconLabel}>
                                <MaterialCommunityIcons name="calendar-range" size={22} color={theme.colors.muted} />
                                <View style={styles.labelGroup}>
                                    <Text style={styles.infoLabel}>Date du Voyage</Text>
                                    <Text style={styles.infoValue}>01 Apr - 15 Apr 2026</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Données Financières</Text>
                    {userMode !== 'agency' ? (
                        <View style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <View style={styles.infoIconLabel}>
                                    <MaterialCommunityIcons name="cash-multiple" size={22} color={theme.colors.muted} />
                                    <View style={styles.labelGroup}>
                                        <Text style={styles.infoLabel}>Montant Collecté</Text>
                                        <Text style={[styles.infoValue, { color: theme.colors.secondary, fontSize: 16 }]}>1,200 TND</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ) : null}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={openConversation}
                    >
                        <Ionicons name="chatbubbles-sharp" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Envoyer Message</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={() => router.push({
                            pathname: '/(views)/(screens)/call',
                            params: {
                                pilgrimUserId: pilgrim.id,
                                name: pilgrim.name,
                                photo: pilgrim.photo,
                                status: 'Calling...',
                                type: 'sender'
                            }
                        })}
                    >
                        <Ionicons name="call" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Appeler</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default PilgrimProfileScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        height: 52,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F3F5',
        paddingTop: 20,
    },
    backBtn: {
        padding: 6,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.secondary,
    },
    headerAction: {
        padding: 6,
    },
    scrollContent: {
        paddingBottom: 30,
    },
    profileHeaderCard: {
        backgroundColor: '#fff',
        alignItems: 'center',
        paddingVertical: 16,
        marginBottom: 6,
    },
    photoContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    profilePhoto: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 3,
        borderColor: '#F8F9FB',
    },
    statusBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    profileName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.secondary,
        marginBottom: 4,
    },
    statusTextBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 10,
    },
    statusLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    infoSection: {
        paddingHorizontal: 20,
        marginTop: 5,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: theme.colors.muted,
        marginBottom: 8,
        marginTop: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 12,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoIconLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 10,
    },
    labelGroup: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 10,
        color: theme.colors.muted,
        marginBottom: 1,
    },
    infoValue: {
        fontSize: 13,
        fontWeight: 'bold',
        color: theme.colors.secondary,
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F3F5',
        marginVertical: 10,
    },
    actionsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: 18,
        gap: 10,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    actionBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
});
