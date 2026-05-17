import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    Animated,
    TextInput,
    Platform,
    ImageBackground,
    Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { theme } from '@/theme';
import { Image } from 'expo-image';
import Mapbox from '@rnmapbox/maps';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { CustomAlert } from '@/components/common/CustomAlert';
import { useUser } from '@/context/UserContext';
import { getUserAvatarUrl } from '@/services/media';
import { agenciesApi, sabeelGuideGroupsApi, trackingApi, reservationApi, freelanceGroupsApi, walletApi, notificationsApi, freelanceComplianceApi } from '@/services/api';
import { notificationService } from '@/services/notificationService';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const scrollY = useRef(new Animated.Value(0)).current;

    const trackingCameraRef = useRef<any>(null);

    // Animation for the profile highlight
    const highlightAnim = useRef(new Animated.Value(0)).current;

    const { user, setBottomNavVisibility, userMode, agencyId, onboardingStep, setOnboardingStep } = useUser();

    const isAgencyRole = String((user as any)?.activeRole || '') === 'agency' || userMode === 'agency';


    useEffect(() => {
        // Reset bottom nav visibility when coming from a transition
        setBottomNavVisibility(true);

        if (params.showProfileHighlight === 'true' && onboardingStep === 'none') {
            setOnboardingStep('profile_tab');
            Animated.spring(highlightAnim, {
                toValue: 1,
                tension: 20,
                friction: 7,
                useNativeDriver: true,
            }).start();
        }
    }, [params.showProfileHighlight, userMode, agencyId]);


    const [walletModalVisible, setWalletModalVisible] = useState(false);
    const [groupsModalVisible, setGroupsModalVisible] = useState(false);
    const [sosModalVisible, setSosModalVisible] = useState(false);
    const [pilgrimsModalVisible, setPilgrimsModalVisible] = useState(false);
    const [bankLinked, setBankLinked] = useState(false); // Mock bank link status
    const [wallet, setWallet] = useState<{ id?: string; availableBalance: number; currency: string } | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);

    const [recentPilgrims, setRecentPilgrims] = useState<Array<{ id: string; name: string; group: string; time: string; status: string }>>([]);

    const [agencyName, setAgencyName] = useState<string>('');

    const [groups, setGroups] = useState<any[]>([]);
    const [groupsCount, setGroupsCount] = useState(0);
    const [pilgrims, setPilgrims] = useState<any[]>([]);
    const [pilgrimsCount, setPilgrimsCount] = useState(0);

    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
    const [sosAlerts, setSosAlerts] = useState<any[]>([]);

    const resolvePilgrimName = useCallback((p: any) => {
        const firstName = p?.firstName ?? p?.firstname ?? p?.first_name ?? '';
        const lastName = p?.lastName ?? p?.lastname ?? p?.last_name ?? '';
        const fromParts = `${String(firstName || '')} ${String(lastName || '')}`.trim();
        const fromFull = String(p?.fullName ?? p?.full_name ?? p?.name ?? '').trim();
        return fromParts || fromFull || 'Pèlerin';
    }, []);

    const unreadSosCount = useMemo(() => {
        const list = Array.isArray(sosAlerts) ? sosAlerts : [];
        return list.filter((n: any) => !n?.readAt).length;
    }, [sosAlerts]);

    const [complianceMe, setComplianceMe] = useState<any | null>(null);
    const [complianceLoading, setComplianceLoading] = useState(false);

    const refreshNotifications = useCallback(async () => {
        try {
            const res = await notificationsApi.listMine({ limit: 50, offset: 0 });
            const items = Array.isArray(res?.data?.items) ? res.data.items : (Array.isArray(res?.data) ? res.data : []);
            const unread = items.filter((n: any) => !n?.readAt).length;
            setUnreadNotificationsCount(Number.isFinite(unread) ? unread : 0);

            const sos = items.filter((n: any) => {
                const t = n?.data?.type ? String(n.data.type) : '';
                return t.toLowerCase() === 'sos' || t.toLowerCase() === 'sos_alert';
            });
            setSosAlerts(sos);
        } catch {
            // ignore
        }
    }, []);

    const refreshCompliance = useCallback(async () => {
        const isFreelance = userMode === 'guide' && String((user as any)?.activeRole || '') === 'freelance';
        if (!isFreelance) {
            setComplianceMe(null);
            return;
        }

        setComplianceLoading(true);
        try {
            const res = await freelanceComplianceApi.getMe();
            setComplianceMe(res?.data || null);
        } catch {
            setComplianceMe(null);
        } finally {
            setComplianceLoading(false);
        }
    }, [userMode, (user as any)?.activeRole]);

    useFocusEffect(
        useCallback(() => {
            refreshNotifications();
            refreshCompliance();
        }, [refreshNotifications, refreshCompliance])
    );

    useEffect(() => {
        const unsubscribe = notificationService.addListener(() => {
            setUnreadNotificationsCount((prev) => prev + 1);
            refreshNotifications();
        });
        return () => {
            unsubscribe();
        };
    }, [refreshNotifications]);

    const latestSosAlert = useMemo(() => {
        if (!Array.isArray(sosAlerts) || sosAlerts.length === 0) return null;
        const sorted = [...sosAlerts].sort((a: any, b: any) => {
            const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tb - ta;
        });
        return sorted[0];
    }, [sosAlerts]);

    const latestSosUi = useMemo(() => {
        const a: any = latestSosAlert;
        const data = a?.data || {};
        const nameFromPilgrim = data?.pilgrim
            ? String(`${data?.pilgrim?.firstName || ''} ${data?.pilgrim?.lastName || ''}`).trim()
            : '';
        const pilgrimName = String(data?.pilgrimName || nameFromPilgrim || 'Pèlerin');
        const photoRaw = data?.photo
            ? String(data.photo)
            : (data?.pilgrim?.photo ? String(data.pilgrim.photo) : '');
        const photoUrl = getUserAvatarUrl(photoRaw) || photoRaw;
        return { pilgrimName, photoUrl };
    }, [latestSosAlert]);

    const trackingMarkers = useMemo(() => {
        return (Array.isArray(pilgrims) ? pilgrims : [])
            .map((p: any) => {
                const lat = p?.latitude !== null && p?.latitude !== undefined ? Number(p.latitude) : NaN;
                const lng = p?.longitude !== null && p?.longitude !== undefined ? Number(p.longitude) : NaN;
                const ok = Number.isFinite(lat) && Number.isFinite(lng) && p?.shareLocation !== false;
                if (!ok) return null;
                return {
                    id: String(p?.id || ''),
                    name: resolvePilgrimName(p),
                    coords: [lng, lat] as any,
                    photo: p?.photo ? (getUserAvatarUrl(String(p.photo)) || String(p.photo)) : '',
                };
            })
            .filter(Boolean);
    }, [pilgrims, resolvePilgrimName]);

    const fitTrackingMarkers = useCallback(() => {
        if (!trackingCameraRef.current) return;
        if (!trackingMarkers.length) return;
        const lngs = trackingMarkers.map((m: any) => m.coords[0]);
        const lats = trackingMarkers.map((m: any) => m.coords[1]);
        const minLng = Math.min(...lngs);
        const minLat = Math.min(...lats);
        const maxLng = Math.max(...lngs);
        const maxLat = Math.max(...lats);
        trackingCameraRef.current.fitBounds([maxLng, maxLat], [minLng, minLat], [60, 60, 60, 60], 800);
    }, [trackingMarkers]);

    const computeKycUi = useCallback(() => {
        const eligible = Boolean(complianceMe?.eligible);
        const documentsDone = Boolean(complianceMe?.documentsDone);
        const emailVerified = Boolean(complianceMe?.emailVerified);
        const contractDone = Boolean(complianceMe?.contractDone);

        if (eligible) {
            return { label: 'Vérifié', color: '#16A34A', bg: '#E8F5E9', subtitle: 'Votre compte est vérifié.' };
        }

        const remaining: string[] = [];
        if (!documentsDone) remaining.push('Documents');
        if (!emailVerified) remaining.push('Email');
        if (!contractDone) remaining.push('Contrat');

        if (remaining.length === 0) {
            return { label: 'En attente', color: '#2196F3', bg: '#E3F2FD', subtitle: 'Vérification en cours.' };
        }

        return {
            label: 'Reste',
            color: '#FF9800',
            bg: '#FFF3E0',
            subtitle: `À compléter: ${remaining.join(', ')}`,
        };
    }, [complianceMe]);

    const fetchWallet = async () => {
        try {
            const [walletRes, txRes] = await Promise.all([
                walletApi.getMe(),
                walletApi.listTransactions({ limit: 10, offset: 0 }),
            ]);
            if (walletRes?.data?.wallet) {
                setWallet({
                    id: walletRes.data.wallet.id ? String(walletRes.data.wallet.id) : undefined,
                    availableBalance: walletRes.data.wallet.availableBalance || 0,
                    currency: walletRes.data.wallet.currency || 'MAD',
                });
            }
            const items = Array.isArray(txRes?.data?.items) ? txRes.data.items : [];
            setTransactions(items);
        } catch {}
    };

    useEffect(() => {
        let mounted = true;

        // Reset role-scoped data to avoid mixing between spaces
        setRecentPilgrims([]);
        setPilgrims([]);
        setPilgrimsCount(0);

        const loadRecent = async () => {
            await fetchWallet(); // fetch wallet balance
            try {
                const res = await trackingApi.getMyPilgrimsPositions();
                const raw = Array.isArray(res.data?.pilgrims) ? res.data.pilgrims : (Array.isArray(res.data) ? res.data : []);

                const isFreelance = userMode === 'guide' && String((user as any)?.activeRole || '') === 'freelance';

                // Keep full list for modal + counts
                const mappedPilgrims = raw
                    .map((p: any) => ({
                        id: String(p?.id || ''),
                        firstName: p?.firstName,
                        lastName: p?.lastName,
                        photo: p?.photo,
                        groupId: p?.groupId ? String(p.groupId) : '',
                        uniqueIdentifier: p?.uniqueIdentifier ? String(p.uniqueIdentifier) : '',
                        latitude: p?.latitude,
                        longitude: p?.longitude,
                        shareLocation: p?.shareLocation,
                        updatedAt: p?.updatedAt || null,
                    }))
                    .filter((p: any) => p.id);

                const items = raw
                    .map((p: any) => {
                        const updatedAtRaw = p?.updatedAt || p?.lastUpdate || p?.updated_at || null;
                        const ts = updatedAtRaw ? Date.parse(String(updatedAtRaw)) : 0;
                        const lat = p?.latitude !== null && p?.latitude !== undefined ? Number(p.latitude) : NaN;
                        const lng = p?.longitude !== null && p?.longitude !== undefined ? Number(p.longitude) : NaN;
                        const hasPosition = Number.isFinite(lat) && Number.isFinite(lng) && p?.shareLocation !== false;

                        return {
                            id: String(p?.id || ''),
                            name: resolvePilgrimName(p),
                            group: p?.groupId ? String(p.groupId) : '',
                            ts,
                            status: hasPosition ? 'Active' : 'Inactive',
                            photo: p?.photo ? String(p.photo) : '',
                        };
                    })
                    .filter((p: any) => p.id)
                    .sort((a: any, b: any) => (b.ts || 0) - (a.ts || 0))
                    .slice(0, 6)
                    .map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        group: p.group,
                        time: p.ts ? new Date(p.ts).toLocaleString() : '',
                        status: p.status,
                    }));

                if (!mounted) return;
                setRecentPilgrims(items);
                if (isFreelance) {
                    try {
                        const reservationsRes = await reservationApi.getGuideReservations();
                        const reservationsData = (reservationsRes as any)?.data;
                        const reservationsList: any[] = Array.isArray(reservationsData?.reservations)
                            ? reservationsData.reservations
                            : (Array.isArray(reservationsData) ? reservationsData : []);
                        const accepted = reservationsList.filter((r: any) => String(r?.status || '').toLowerCase() === 'accepted');

                        const byPilgrimId = new Map<string, any>();
                        accepted.forEach((r: any) => {
                            const pid = String(r?.pilgrimUserId || '').trim();
                            if (!pid) return;
                            const prev = byPilgrimId.get(pid);
                            if (!prev) {
                                byPilgrimId.set(pid, r);
                                return;
                            }
                            const prevDate = prev?.updatedAt || prev?.respondedAt || prev?.createdAt;
                            const nextDate = r?.updatedAt || r?.respondedAt || r?.createdAt;
                            if (nextDate && (!prevDate || String(nextDate) > String(prevDate))) {
                                byPilgrimId.set(pid, r);
                            }
                        });

                        const pilgrimsFromReservations = Array.from(byPilgrimId.entries()).map(([pid, r]) => {
                            const summaryFullName = `${r?.pilgrimFirstName || ''} ${r?.pilgrimLastName || ''}`.trim();
                            const name = String(r?.pilgrimName || '').trim() || summaryFullName || 'Pèlerin';
                            const photo = String(r?.pilgrimImageUrl || '').trim();
                            return {
                                id: pid,
                                firstName: r?.pilgrimFirstName,
                                lastName: r?.pilgrimLastName,
                                photo: photo || '',
                                groupId: '',
                                uniqueIdentifier: r?.uniqueIdentifier ? String(r.uniqueIdentifier) : '',
                                updatedAt: r?.updatedAt || r?.respondedAt || r?.createdAt || null,
                                name,
                            };
                        });

                        if (!mounted) return;
                        setPilgrims(pilgrimsFromReservations);
                        setPilgrimsCount(pilgrimsFromReservations.length);
                    } catch {
                        if (!mounted) return;
                        setPilgrims(mappedPilgrims);
                        setPilgrimsCount(mappedPilgrims.length);
                    }

                    try {
                        const groupsRes = await freelanceGroupsApi.getMine();
                        const groupsData = (groupsRes as any)?.data;
                        const apiGroups = Array.isArray(groupsData?.groups) ? groupsData.groups : [];
                        const groupDetails = await Promise.all(
                            apiGroups.map(async (g: any) => {
                                try {
                                    const detail = await freelanceGroupsApi.getById(String(g.id));
                                    return detail?.data?.group || null;
                                } catch {
                                    return null;
                                }
                            }),
                        );
                        const mappedGroups = apiGroups
                            .map((g: any) => {
                                const detail = groupDetails.find((d: any) => String(d?.id) === String(g?.id));
                                const count = Array.isArray(detail?.pilgrims) ? detail.pilgrims.length : 0;
                                return {
                                    id: String(g?.id || ''),
                                    name: String(g?.name || 'Groupe'),
                                    pilgrimsCount: count,
                                    departureDate: g?.period ? String(g.period) : '',
                                };
                            })
                            .filter((g: any) => g.id);
                        if (!mounted) return;
                        setGroups(mappedGroups);
                        setGroupsCount(mappedGroups.length);
                    } catch {
                        if (!mounted) return;
                        setGroups([]);
                        setGroupsCount(0);
                    }

                    return;
                }

                setPilgrims(mappedPilgrims);
                setPilgrimsCount(mappedPilgrims.length);

                try {
                    const groupsRes = await sabeelGuideGroupsApi.getMyGroups();
                    const backendGroups = Array.isArray(groupsRes.data?.groups)
                        ? groupsRes.data.groups
                        : (Array.isArray(groupsRes.data) ? groupsRes.data : []);
                    const mappedGroups = backendGroups.map((g: any) => ({
                        id: String(g?.id || ''),
                        name: String(g?.name || 'Groupe'),
                        pilgrimsCount: Array.isArray(g?.pilgrims) ? g.pilgrims.length : 0,
                        departureDate: g?.departureDate ? String(g.departureDate).slice(0, 10) : '',
                    })).filter((g: any) => g.id);
                    if (!mounted) return;
                    setGroups(mappedGroups);
                    setGroupsCount(mappedGroups.length);
                } catch {
                    if (!mounted) return;
                    setGroups([]);
                    setGroupsCount(0);
                }
            } catch {
                if (!mounted) return;
                setRecentPilgrims([]);
                setPilgrims([]);
                setPilgrimsCount(0);
                setGroups([]);
                setGroupsCount(0);
            }
        };

        loadRecent();
        return () => {
            mounted = false;
        };
    }, [userMode, user?.activeRole]);

    useEffect(() => {
        let mounted = true;

        const loadAgency = async () => {
            const id = agencyId ? String(agencyId) : ((user as any)?.agencyId ? String((user as any).agencyId) : '');
            if (!isAgencyRole || !id) {
                setAgencyName('');
                return;
            }
            try {
                const res = await agenciesApi.getPublicAgencyById(id);
                const data = res.data?.agency || res.data;
                const name = String(data?.agencyName || data?.name || '').trim();
                if (!mounted) return;
                setAgencyName(name);
            } catch {
                if (!mounted) return;
                setAgencyName('');
            }
        };

        loadAgency();
        return () => {
            mounted = false;
        };
    }, [isAgencyRole, (user as any)?.agencyId]);

    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'success' as 'success' | 'error' | 'warning',
        actionLabel: "D'accord",
    });

    const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' = 'success') => {
        setAlertConfig({ visible: true, title, message, type, actionLabel: "D'accord" });
    };

    const handleWithdraw = () => {
        const available = wallet?.availableBalance || 0;
        if (available < 50000) { // 500.00 MAD in cents
            showAlert("Solde Insuffisant", "Un solde minimum de 500 MAD est requis pour effectuer un retrait.", "warning");
            return;
        }
        if (!bankLinked) {
            showAlert("Action Requise", "Veuillez lier un compte bancaire ou une carte pour retirer votre solde.", "warning");
            return;
        }
        setWalletModalVisible(false);
        router.push('/(views)/(screens)/wallet');
    };

    
    const headerHeight = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [120, 80],
        extrapolate: 'clamp',
    });

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header / AppBar */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>Dashboard</Text>

                    <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/notifications')}>
                        <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
                        {unreadNotificationsCount > 0 ? (
                            <View style={styles.badge}>
                                {unreadNotificationsCount > 9 ? (
                                    <Text style={styles.badgeText}>9+</Text>
                                ) : (
                                    <Text style={styles.badgeText}>{unreadNotificationsCount}</Text>
                                )}
                            </View>
                        ) : null}
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
            >


                {/* Profile Completion Highlight */}
                {params.showProfileHighlight === 'true' && (
                    <Animated.View style={[
                        styles.highlightBanner,
                        {
                            opacity: highlightAnim,
                            transform: [{
                                translateY: highlightAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-20, 0]
                                })
                            }]
                        }
                    ]}>
                        <View style={styles.highlightContent}>
                            <View style={styles.highlightIconContainer}>
                                <Ionicons name="person-circle" size={32} color={theme.colors.primary} />
                            </View>
                            <View style={styles.highlightTextContainer}>
                                <Text style={styles.highlightTitle}>Complétez votre profil</Text>
                                <Text style={styles.highlightSubtitle}>Plus que quelques étapes pour débloquer toutes les fonctionnalités.</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.highlightButton}
                                onPress={() => router.push('/profile')}
                            >
                                <Text style={styles.highlightButtonText}>Go</Text>
                                <Ionicons name="arrow-forward" size={16} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                )}

                {/* Combined Stats Grid Section */}
                <View style={styles.activityGrid}>
                    <View style={styles.sectionHeaderCompact}>
                        <Text style={styles.sectionTitleRefined}>Aperçu de l&apos;activité</Text>
                    </View>
                    <View style={styles.activityCard}>
                        {/* Top row: Wallet & Groups */}
                        <View style={styles.activityRow}>
                            {!isAgencyRole ? (
                                <TouchableOpacity
                                    style={[styles.activityItem, { borderRightWidth: 1, borderRightColor: '#F0F0F0' }]}
                                    onPress={async () => {
                            await fetchWallet();
                            setWalletModalVisible(true);
                        }}
                                >
                                    <View style={[styles.activityIconWrap, { backgroundColor: theme.colors.primary + '15' }]}>
                                        <Ionicons name="wallet-outline" size={20} color={theme.colors.primary} />
                                    </View>
                                    <View>
                                        <Text style={styles.activityValue}>{wallet ? ((wallet.availableBalance / 100).toFixed(2)) : '0.00'} {wallet?.currency || 'MAD'}</Text>
                                        <Text style={styles.activityLabel}>Wallet</Text>
                                    </View>
                                </TouchableOpacity>
                            ) : (
                                <View style={[styles.activityItem, { borderRightWidth: 1, borderRightColor: '#F0F0F0' }]}>
                                    <View style={[styles.activityIconWrap, { backgroundColor: theme.colors.primary + '15' }]}>
                                        <Ionicons name="business-outline" size={20} color={theme.colors.primary} />
                                    </View>
                                    <View>
                                        <Text style={styles.activityValue} numberOfLines={1}>
                                            {agencyName || 'Mon agence'}
                                        </Text>
                                        <Text style={styles.activityLabel}>Agence</Text>
                                    </View>
                                </View>
                            )}
                            <TouchableOpacity
                                style={styles.activityItem}
                                onPress={() => setGroupsModalVisible(true)}
                            >
                                <View style={[styles.activityIconWrap, { backgroundColor: theme.colors.primary + '15' }]}>
                                    <Ionicons name="people-outline" size={20} color={theme.colors.primary} />
                                </View>
                                <View>
                                    <Text style={styles.activityValue}>{groupsCount}</Text>
                                    <Text style={styles.activityLabel}>Groupes</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.activityDivider} />

                        {/* Bottom row: Pilgrims & Pending */}
                        <View style={styles.activityRow}>
                            <TouchableOpacity
                                style={[styles.activityItem, { borderRightWidth: 1, borderRightColor: '#F0F0F0' }]}
                                onPress={() => setPilgrimsModalVisible(true)}
                            >
                                <View style={[styles.activityIconWrap, { backgroundColor: theme.colors.primary + '15' }]}>
                                    <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
                                </View>
                                <View>
                                    <Text style={styles.activityValue}>{pilgrimsCount}</Text>
                                    <Text style={styles.activityLabel}>Pèlerins</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.activityItem}
                                onPress={() => setSosModalVisible(true)}
                            >
                                <View style={[styles.activityIconWrap, { backgroundColor: theme.colors.primary + '15' }]}>
                                    <Ionicons name="warning-outline" size={20} color={theme.colors.primary} />
                                </View>
                                <View>
                                    <Text style={styles.activityValue}>{unreadSosCount}</Text>
                                    <Text style={styles.activityLabel}>Alert</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>



                {/* Urgent notification */}
                {latestSosAlert && (
                    <TouchableOpacity
                        style={styles.alertCard}
                        onPress={() => setSosModalVisible(true)}
                        activeOpacity={0.85}
                    >
                        {latestSosUi?.photoUrl ? (
                            <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', marginRight: 12 }}>
                                <Image source={{ uri: latestSosUi.photoUrl }} style={{ width: 40, height: 40 }} />
                            </View>
                        ) : (
                            <View style={styles.alertIconBg}>
                                <Ionicons name="alert" size={20} color="#FF3B30" />
                            </View>
                        )}
                        <View style={styles.alertMain}>
                            <Text style={styles.alertTitle}>SOS Alert</Text>
                            <Text style={styles.alertDesc} numberOfLines={2}>
                                {latestSosUi?.pilgrimName || 'Pèlerin'}
                            </Text>
                        </View>
                        <View style={styles.alertClose}>
                            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
                        </View>
                    </TouchableOpacity>
                )}



                {/* Map Section */}
                <View style={styles.sectionHeaderRefined}>
                    <Text style={styles.sectionTitleRefined}>Tracking en temps réel</Text>
                    <TouchableOpacity onPress={() => router.push('/tracking')}>
                        <Text style={styles.actionTextSmall}>Plein écran</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.mapContainer}>
                    <View style={styles.mapPlaceholder}>
                        {!trackingMarkers.length ? (
                            <View style={{ flex: 1 }}>
                                <Image
                                    source={{ uri: 'https://images.unsplash.com/photo-1526778545894-62b44c2860b1?w=800' }}
                                    style={styles.mapImage}
                                />
                                <View style={styles.mapOverlay}>
                                    <View style={styles.mapBadge}>
                                        <View style={styles.liveIndicator} />
                                        <Text style={styles.liveText}>LIVE</Text>
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <View style={{ flex: 1 }}>
                                <Mapbox.MapView
                                    style={styles.mapImage}
                                    styleURL={Mapbox.StyleURL.Street}
                                    logoEnabled={false}
                                    attributionEnabled={false}
                                    compassEnabled={false}
                                >
                                    <Mapbox.Camera
                                        ref={trackingCameraRef}
                                        zoomLevel={5}
                                        centerCoordinate={(trackingMarkers as any)[0]?.coords || [0, 0]}
                                        animationDuration={600}
                                    />
                                    {(trackingMarkers as any).map((m: any) => (
                                        <Mapbox.PointAnnotation key={m.id} id={m.id} coordinate={m.coords}>
                                            <View style={[styles.markerBubble, { borderColor: theme.colors.primary }]}>
                                                {m.photo ? (
                                                    <Image source={{ uri: m.photo }} style={styles.markerAvatar} />
                                                ) : (
                                                    <View
                                                        style={[
                                                            styles.markerAvatar,
                                                            { backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={{
                                                                fontSize: 10,
                                                                fontWeight: '900',
                                                                color: theme.colors.secondary,
                                                            }}
                                                        >
                                                            {String(m.name || 'P').slice(0, 1).toUpperCase()}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </Mapbox.PointAnnotation>
                                    ))}
                                </Mapbox.MapView>
                                <View style={styles.mapOverlay}>
                                    <View style={styles.mapBadge}>
                                        <View style={styles.liveIndicator} />
                                        <Text style={styles.liveText}>LIVE</Text>
                                    </View>
                                    <TouchableOpacity style={styles.mapFab} onPress={fitTrackingMarkers}>
                                        <Ionicons name="locate" size={24} color={theme.colors.primary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {recentPilgrims.length ? (
                    <View>
                        <View style={styles.sectionHeaderRefined}>
                            <Text style={styles.sectionTitleRefined}>Pèlerins Récents</Text>
                            <TouchableOpacity onPress={() => router.push('/tracking')}>
                                <Text style={styles.actionTextSmall}>Tout voir</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.pilgrimList}>
                            {(recentPilgrims as any[]).map((item) => (
                                <View key={item.id} style={styles.pilgrimItem}>
                                    <View style={styles.pilgrimInfo}>
                                        <View style={styles.pilgrimAvatarPlaceholder}>
                                            <Text style={styles.avatarText}>{String(item?.name || 'P').slice(0, 1)}</Text>
                                        </View>
                                        <View>
                                            <Text style={styles.pilgrimName}>{item.name}</Text>
                                            <View style={styles.pilgrimSubRow}>
                                                <Text style={styles.pilgrimGroup}>{item.group || '-'}</Text>
                                                <Text style={styles.dot}>•</Text>
                                                <Text style={styles.pilgrimTime}>{item.time}</Text>
                                            </View>
                                        </View>
                                    </View>
                                    <View style={[styles.statusTag, { backgroundColor: item.status === 'Active' ? '#E8F5E9' : '#FFF3E0' }]}>
                                        <Text style={[styles.statusTagText, { color: item.status === 'Active' ? '#4CAF50' : '#FF9800' }]}>{item.status}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : null}

                {!isAgencyRole ? (
                    <View style={styles.kycSection}>
                        <View style={styles.kycCard}>
                            <View style={styles.kycInfo}>
                                <Text style={styles.kycTitle}>Statut du compte KYC</Text>
                                <Text style={styles.kycSub}>
                                    {complianceLoading ? 'Chargement...' : computeKycUi().subtitle}
                                </Text>
                            </View>
                            <View style={[styles.kycBadge, { backgroundColor: computeKycUi().bg }]}>
                                <Text style={[styles.kycStatusText, { color: computeKycUi().color }]}>
                                    {computeKycUi().label}
                                </Text>
                            </View>
                        </View>
                    </View>
                ) : null}

                <View style={{ height: 100 }} />
            </ScrollView>

            {!isAgencyRole ? (
                <Modal
                    visible={walletModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setWalletModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => setWalletModalVisible(false)} />
                        <View style={styles.walletSheet}>
                            <View style={styles.sheetHandle} />
                            <View style={styles.sheetHeader}>
                                <Text style={styles.sheetTitle}>Mon Portefeuille</Text>
                                <TouchableOpacity onPress={() => setWalletModalVisible(false)} style={styles.sheetCloseBtn}>
                                    <Ionicons name="close" size={24} color={theme.colors.secondary} />
                                </TouchableOpacity>
                            </View>

                            <ImageBackground
                                source={{ uri: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800' }}
                                style={styles.walletCardNew}
                                imageStyle={{ borderRadius: 24 }}
                            >
                                <View style={styles.walletCardOverlay}>
                                    <Text style={styles.balanceLabel}>Solde Disponible</Text>
                                    <Text style={styles.balanceMain}>{wallet ? ((wallet.availableBalance / 100).toFixed(2)) : '0.00'} {wallet?.currency || 'MAD'}</Text>
                                    <TouchableOpacity style={styles.withdrawBtnNew} onPress={handleWithdraw}>
                                        <MaterialCommunityIcons name="bank-transfer-out" size={22} color="#fff" />
                                        <Text style={styles.withdrawBtnText}>Retirer l&apos;argent</Text>
                                    </TouchableOpacity>
                                </View>
                            </ImageBackground>

                            <View style={styles.historySection}>
                                <View style={styles.historyHeader}>
                                    <Text style={styles.historyTitle}>Historique des transactions</Text>
                                    <Text style={styles.historyAction}>Tout voir</Text>
                                </View>
                                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
                                    {transactions.map(tx => {
                                        const incoming = String(tx.toWalletId || '') === String(wallet?.id);
                                        const amount = typeof tx.amount === 'number' ? tx.amount : 0;
                                        const amountText = `${(amount / 100).toFixed(2)} ${tx.currency || 'MAD'}`;
                                        const sign = incoming ? '+' : '-';
                                        const typeLabel = tx.type?.toUpperCase().includes('WITHDRAWAL') ? 'Withdrawal' :
                                                          tx.type?.toUpperCase().includes('EARNING') ? 'Incoming' :
                                                          tx.type?.toUpperCase().includes('PAYMENT') ? 'Payment' :
                                                          tx.type?.toUpperCase().includes('TOPUP') ? 'Topup' :
                                                          tx.type?.toUpperCase().includes('REFUND') ? 'Refund' :
                                                          tx.type || 'Transaction';
                                        const dateStr = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '';
                                        return (
                                            <View key={tx.id} style={styles.txItem}>
                                                <View style={[styles.txIconWrap, { backgroundColor: incoming ? '#E8F5E9' : '#F8F9FA' }]}>
                                                    <Ionicons
                                                        name={incoming ? "arrow-down-outline" : "arrow-up-outline"}
                                                        size={18}
                                                        color={incoming ? "#4CAF50" : theme.colors.muted}
                                                    />
                                                </View>
                                                <View style={styles.txInfo}>
                                                    <Text style={styles.txTitle}>{typeLabel}</Text>
                                                    <Text style={styles.txDate}>{dateStr}</Text>
                                                </View>
                                                <Text style={[styles.txAmount, { color: incoming ? '#4CAF50' : theme.colors.secondary }]}>
                                                    {sign} {amountText}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        </View>
                    </View>
                </Modal>
            ) : null}

            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
                onAction={() => setAlertConfig({ ...alertConfig, visible: false })}
            />

            {/* Groups Modal */}
            <Modal
                visible={groupsModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setGroupsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setGroupsModalVisible(false)} />
                    <View style={styles.walletSheet}>
                        <View style={styles.sheetHandle} />
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Mes Groupes ({groupsCount})</Text>
                            <TouchableOpacity onPress={() => setGroupsModalVisible(false)} style={styles.sheetCloseBtn}>
                                <Ionicons name="close" size={24} color={theme.colors.secondary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
                            {groups.map((g: any) => (
                                <View key={String(g.id)} style={styles.modalListItem}>
                                    <View style={[styles.modalListIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                                        <Ionicons name="people-outline" size={20} color={theme.colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.modalListTitle}>{String(g?.name || 'Groupe')}</Text>
                                        <Text style={styles.modalListSub}>{g?.departureDate ? `Départ: ${g.departureDate}` : ''}</Text>
                                    </View>
                                    <Text style={styles.modalListValue}>{Number(g?.pilgrimsCount || 0)}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Pilgrims Modal */}
            <Modal
                visible={pilgrimsModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setPilgrimsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setPilgrimsModalVisible(false)} />
                    <View style={styles.walletSheet}>
                        <View style={styles.sheetHandle} />
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Tous les Pèlerins ({pilgrimsCount})</Text>
                            <TouchableOpacity onPress={() => setPilgrimsModalVisible(false)} style={styles.sheetCloseBtn}>
                                <Ionicons name="close" size={24} color={theme.colors.secondary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
                            {pilgrims.map((p: any) => (
                                <View key={String(p.id)} style={styles.modalListItem}>
                                    <View style={[styles.modalListIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                                        <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.modalListTitle}>{resolvePilgrimName(p)}</Text>
                                        <Text style={styles.modalListSub}>{String(p?.phoneNumber || p?.phone || '')}</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* SOS Modal */}
            <Modal
                visible={sosModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSosModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setSosModalVisible(false)} />
                    <View style={styles.walletSheet}>
                        <View style={styles.sheetHandle} />
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>SOS Alert</Text>
                            <TouchableOpacity onPress={() => setSosModalVisible(false)} style={styles.sheetCloseBtn}>
                                <Ionicons name="close" size={24} color={theme.colors.secondary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
                            {Array.isArray(sosAlerts) && sosAlerts.length ? (
                                sosAlerts
                                    .slice()
                                    .sort((a: any, b: any) => {
                                        const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
                                        const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
                                        return tb - ta;
                                    })
                                    .map((a: any) => {
                                        const data = a?.data || {};
                                        const nameFromPilgrim = data?.pilgrim
                                            ? String(`${data?.pilgrim?.firstName || ''} ${data?.pilgrim?.lastName || ''}`).trim()
                                            : '';
                                        const pilgrimName = String(data?.pilgrimName || nameFromPilgrim || 'Pèlerin');

                                        const latRaw =
                                            data?.latitude !== undefined
                                                ? data.latitude
                                                : (data?.location?.latitude !== undefined ? data.location.latitude : undefined);
                                        const lngRaw =
                                            data?.longitude !== undefined
                                                ? data.longitude
                                                : (data?.location?.longitude !== undefined ? data.location.longitude : undefined);
                                        const lat = latRaw !== null && latRaw !== undefined ? Number(latRaw) : NaN;
                                        const lng = lngRaw !== null && lngRaw !== undefined ? Number(lngRaw) : NaN;
                                        const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
                                        const resolved = Boolean(a?.readAt);
                                        const photo = data?.photo
                                            ? String(data.photo)
                                            : (data?.pilgrim?.photo ? String(data.pilgrim.photo) : '');
                                        const photoUrl = getUserAvatarUrl(photo) || photo;

                                        return (
                                            <TouchableOpacity
                                                key={String(a?.id || Math.random())}
                                                style={styles.modalListItem}
                                                activeOpacity={0.85}
                                                onPress={() => {
                                                    if (hasCoords) {
                                                        setSosModalVisible(false);
                                                        router.push({
                                                            pathname: '/tracking' as any,
                                                            params: {
                                                                focusPilgrimId: data?.pilgrimUserId
                                                                    ? String(data.pilgrimUserId)
                                                                    : (data?.pilgrim?.id ? String(data.pilgrim.id) : ''),
                                                                focusLat: String(lat),
                                                                focusLng: String(lng),
                                                            },
                                                        });
                                                    }
                                                }}
                                            >
                                                <View style={[styles.modalListIconWrap, { backgroundColor: resolved ? '#E8F5E9' : '#FFECEC' }]}>
                                                    <Ionicons
                                                        name={resolved ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                                                        size={20}
                                                        color={resolved ? '#16A34A' : '#FF3B30'}
                                                    />
                                                </View>

                                                {photoUrl ? (
                                                    <View style={{ width: 42, height: 42, borderRadius: 21, overflow: 'hidden', marginRight: 10 }}>
                                                        <Image source={{ uri: photoUrl }} style={{ width: 42, height: 42 }} />
                                                    </View>
                                                ) : null}

                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.modalListTitle} numberOfLines={1}>
                                                        {pilgrimName}
                                                    </Text>
                                                    <Text style={styles.modalListSub} numberOfLines={2}>
                                                        {String(a?.title || 'Alerte SOS')}
                                                        {hasCoords ? ` • ${lat.toFixed(5)}, ${lng.toFixed(5)}` : ''}
                                                    </Text>
                                                </View>

                                                {!resolved ? (
                                                    <TouchableOpacity
                                                        style={styles.modalActionBtn}
                                                        onPress={async () => {
                                                            try {
                                                                if (a?.id) {
                                                                    await notificationsApi.markRead(String(a.id));
                                                                    await refreshNotifications();
                                                                }
                                                            } catch {
                                                                // ignore
                                                            }
                                                        }}
                                                    >
                                                        <Text style={styles.modalActionBtnText}>Résoudre</Text>
                                                    </TouchableOpacity>
                                                ) : (
                                                    <View style={[styles.modalActionBtn, { backgroundColor: '#E8F5E9' }]}>
                                                        <Text style={[styles.modalActionBtnText, { color: '#16A34A' }]}>OK</Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })
                            ) : (
                                <View style={styles.modalEmptyWrap}>
                                    <Text style={styles.modalEmptyTitle}>Aucune alerte SOS</Text>
                                    <Text style={styles.modalEmptySub}>Les alertes SOS reçues s'afficheront ici.</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView >
    );
};

export default HomeScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F9FB',
    },
    scrollContent: {
        paddingBottom: 20,
    },
    // Header Styles
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 14,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconBtn: {
        padding: 6,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    headerLeftBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.secondary,
    },
    branding: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    logoBox: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 22,
    },
    greetingTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: theme.colors.secondary,
        letterSpacing: -0.3,
    },
    greetingSub: {
        fontSize: 12,
        color: theme.colors.muted,
        fontWeight: '600',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    circleBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#FF3B30',
        borderWidth: 1.5,
        borderColor: '#fff',
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
        lineHeight: 12,
    },
    avatarWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        padding: 2,
    },
    avatarImg: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
    },
    greetingSection: {
        marginTop: 20,
    },
    greetingText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.secondary,
    },
    subGreeting: {
        fontSize: 14,
        color: theme.colors.muted,
        marginTop: 4,
    },
    // Dashboard Activity Overview
    activityGrid: {
        marginHorizontal: 20,
        marginTop: 24,
    },
    sectionHeaderCompact: {
        marginBottom: 10,
        paddingHorizontal: 4,
    },
    sectionTitleRefined: {
        fontSize: 11,
        fontWeight: '900',
        color: theme.colors.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    activityCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 8,
        elevation: 6,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    activityItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
    },
    activityIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityValue: {
        fontSize: 15,
        fontWeight: '900',
        color: theme.colors.secondary,
    },
    activityLabel: {
        fontSize: 11,
        color: theme.colors.muted,
        fontWeight: '700',
        marginTop: 1,
    },
    activityDivider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginHorizontal: 16,
    },
    // Section Header
    sectionHeaderRefined: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginTop: 28,
        marginBottom: 12,
    },
    actionTextSmall: {
        fontSize: 12,
        color: theme.colors.primary,
        fontWeight: '800',
    },
    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        gap: 12,
    },
    statCard: {
        width: (width - 32 - 12) / 2,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    statIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.secondary,
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.muted,
        marginTop: 2,
    },
    // Wallet Card
    walletCard: {
        marginHorizontal: 20,
        marginTop: 16, // Reduced from 20
        borderRadius: 24,
        overflow: 'hidden',
        height: 120, // Reduced from 140
    },
    walletBg: {
        width: '100%',
        height: '100%',
    },
    walletOverlay: {
        flex: 1,
        backgroundColor: 'rgba(43, 45, 66, 0.6)',
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    walletLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginBottom: 6,
    },
    walletAmount: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
    },
    withdrawBtn: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    withdrawText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    // Urgent notification
    alertCard: {
        marginHorizontal: 20,
        marginTop: 20,
        backgroundColor: '#FFF5F5',
        borderRadius: 20,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFEBEA',
        gap: 12,
    },
    alertIconBg: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: '#FFEBEA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertMain: {
        flex: 1,
    },
    alertTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FF3B30',
        letterSpacing: -0.2,
    },
    alertDesc: {
        fontSize: 11,
        color: '#8E8E93',
        marginTop: 2,
        fontWeight: '500',
    },
    alertClose: {
        padding: 4,
    },
    // Quick Actions
    quickActionsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
    },
    actionCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        gap: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    actionIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: theme.colors.secondary,
        textAlign: 'center',
    },
    // Map Section
    mapContainer: {
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    mapPlaceholder: {
        height: 160, // Reduced from 200
        borderRadius: 24,
        backgroundColor: '#E0E0E0',
        overflow: 'hidden',
        position: 'relative',
    },
    mapImage: {
        width: '100%',
        height: '100%',
        opacity: 0.9,
    },
    mapOverlay: {
        ...StyleSheet.absoluteFillObject,
        padding: 16,
        justifyContent: 'space-between',
    },
    mapBadge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    liveIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F44336',
    },
    liveText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#F44336',
    },
    mapFab: {
        alignSelf: 'flex-end',
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    markerPointer: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 3,
        borderColor: '#fff',
        padding: 2,
        backgroundColor: theme.colors.primary,
    },
    markerBubble: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 3,
        borderColor: '#fff',
        padding: 2,
        backgroundColor: theme.colors.primary,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        ...Platform.select({
            android: {
                elevation: 4,
            },
        }),
    },
    markerAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
    },
    // KYC Section
    kycSection: {
        paddingHorizontal: 20,
        marginTop: 12,
    },
    kycCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#E3F2FD',
    },
    kycInfo: {
        flex: 1,
    },
    kycTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.secondary,
    },
    kycSub: {
        fontSize: 11,
        color: theme.colors.muted,
        marginTop: 2,
    },
    kycBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    kycStatusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    // New Styles for Added Components
    barChartContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 120,
        paddingTop: 10,
    },
    barColumn: {
        alignItems: 'center',
        gap: 8,
    },
    barValue: {
        width: 25,
        borderRadius: 6,
    },
    barLabel: {
        fontSize: 10,
        color: theme.colors.muted,
    },
    pilgrimList: {
        paddingHorizontal: 20,
        gap: 8,
    },
    pilgrimItem: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    pilgrimInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    pilgrimAvatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F0F7F2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    pilgrimName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme.colors.secondary,
    },
    pilgrimSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    pilgrimGroup: {
        fontSize: 12,
        color: theme.colors.muted,
    },
    dot: {
        fontSize: 12,
        color: '#D1D1D1',
    },
    pilgrimTime: {
        fontSize: 12,
        color: theme.colors.muted,
    },
    statusTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusTagText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    // Highlight Banner Styles
    highlightBanner: {
        marginHorizontal: 20,
        marginTop: 16,
        backgroundColor: '#fff',
        borderRadius: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#F0F7F2',
        overflow: 'hidden',
    },
    highlightContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    highlightIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F0F7F2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    highlightTextContainer: {
        flex: 1,
    },
    highlightTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme.colors.secondary,
    },
    highlightSubtitle: {
        fontSize: 12,
        color: theme.colors.muted,
        marginTop: 2,
        lineHeight: 16,
    },
    highlightButton: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 4,
    },
    highlightButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
    },
    // Wallet Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    walletSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E5E7EB',
        alignSelf: 'center',
        marginBottom: 20,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: theme.colors.secondary,
    },
    sheetCloseBtn: {
        padding: 4,
    },
    walletCardNew: {
        height: 160,
        width: '100%',
        marginBottom: 30,
    },
    walletCardOverlay: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(44, 95, 45, 0.85)',
        borderRadius: 24,
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    balanceMain: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '900',
        marginBottom: 20,
    },
    withdrawBtnNew: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 16,
        gap: 8,
    },
    withdrawBtnText: {
        color: theme.colors.primary,
        fontWeight: '800',
        fontSize: 15,
    },
    historySection: {
        marginTop: 10,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    historyTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: theme.colors.secondary,
    },
    historyAction: {
        fontSize: 13,
        color: theme.colors.primary,
        fontWeight: '700',
    },
    txItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F8F9FA',
    },
    txIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    txInfo: {
        flex: 1,
    },
    txTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.secondary,
    },
    txDate: {
        fontSize: 12,
        color: theme.colors.muted,
        marginTop: 2,
    },
    txAmount: {
        fontSize: 14,
        fontWeight: '800',
    },
    // Generic Modal List Styles
    modalListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F8F9FA',
    },
    modalListIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalListIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    modalListTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: theme.colors.secondary,
    },
    modalEmptyWrap: {
        paddingVertical: 26,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalEmptyTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: theme.colors.secondary,
        marginBottom: 6,
    },
    modalEmptySub: {
        fontSize: 12,
        color: theme.colors.muted,
        fontWeight: '600',
        textAlign: 'center',
    },
    modalListSub: {
        fontSize: 12,
        color: theme.colors.muted,
        marginTop: 2,
    },
    modalListValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    modalActionBtn: {
        backgroundColor: theme.colors.primary + '10',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
    },
    modalActionBtnText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 12,
    },
});
