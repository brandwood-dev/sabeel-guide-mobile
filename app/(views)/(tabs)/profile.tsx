import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    TextInput,
    Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';


// Sabeel_Guide specific imports
import { theme } from '@/theme';
import { Button } from '@/components/common/Button';
import { ActivityIndicator } from 'react-native';
import { useTrans } from '@/hooks/useTrans';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ProfileMenuItem } from '@/components/common/ProfileMenuItem';
import { useUser } from '@/context/UserContext';
import { authService } from '@/services/authService';
import { getUserAvatarUrl } from '@/services/media';
import { freelanceComplianceApi, reviewsApi } from '@/services/api';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
    const { t, language } = useTrans();
    const isRTL = language === 'ar';
    const colors = useThemeColors() as any;
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { userMode, setUserMode, setAgencyId, setShowAgencyIdPopup } = useUser();



    // User state
    const [user, setUser] = useState<any>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    const isAgencyRole = String(user?.activeRole || '') === 'agency' || userMode === 'agency';
    const hasAgency = Boolean(user?.agencyId);
    const isFreelanceRole = !isAgencyRole && String(user?.activeRole || '') === 'freelance';

    const [compliance, setCompliance] = useState<any>(null);
    const [complianceLoading, setComplianceLoading] = useState(false);

    const [agencyIdInput, setAgencyIdInput] = useState('');
    const [isJoiningAgency, setIsJoiningAgency] = useState(false);
    const [isSwitchingRole, setIsSwitchingRole] = useState(false);
    const [showJoinAgencyModal, setShowJoinAgencyModal] = useState(false);

    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviews, setReviews] = useState<any[]>([]);
    const [reviewsCount, setReviewsCount] = useState(0);
    const [averageRating, setAverageRating] = useState(0);

    useEffect(() => {
        fetchProfile();
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchProfile();
            setTimeout(() => {
                fetchCompliance();
            }, 150);
        }, [user?.activeRole, userMode])
    );

    const fetchCompliance = async (activeRoleOverride?: string) => {
        const role = String(activeRoleOverride || user?.activeRole || '').toLowerCase();
        if (role !== 'freelance') {
            setCompliance(null);
            return;
        }
        setComplianceLoading(true);
        try {
            const res = await freelanceComplianceApi.getMe();
            const data = res.data;
            console.log('[Profile] compliance data:', data);
            console.log('[Profile] compliance eligible:', Boolean(data?.eligible));
            console.log('[Profile] compliance documentsDone:', Boolean(data?.documentsDone));
            console.log('[Profile] compliance emailVerified:', Boolean(data?.emailVerified));
            console.log('[Profile] compliance contractDone:', Boolean(data?.contractDone));
            setCompliance(data);
        } catch (err) {
            console.warn('[Profile] fetchCompliance error:', err);
            setCompliance(null);
        } finally {
            setComplianceLoading(false);
        }
    };

    const syncComplianceReminders = async (eligible: boolean) => {
        const identifierKey = 'freelance_compliance_reminder_notification_id';
        try {
            const existingId = await AsyncStorage.getItem(identifierKey);
            if (existingId) {
                await Notifications.cancelScheduledNotificationAsync(existingId);
                await AsyncStorage.removeItem(identifierKey);
            }

            if (eligible) return;

            const perm = await Notifications.getPermissionsAsync();
            if (!perm?.granted) {
                await Notifications.requestPermissionsAsync();
            }

            const createdId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Profil freelance incomplet',
                    body: 'Complétez vos documents, vérifiez votre email et signez le contrat pour rendre votre profil visible.',
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: 6 * 60 * 60,
                    repeats: true,
                },
            });
            await AsyncStorage.setItem(identifierKey, createdId);
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        if (isAgencyRole) {
            setShowJoinAgencyModal(false);
        }
    }, [isAgencyRole]);

    const fetchProfile = async () => {
        try {
            const profileData = await authService.getProfile();
            console.log('[Profile] Data received:', {
                name: `${profileData.firstName} ${profileData.lastName}`,
                photo: profileData.photoUrl
            });
            setUser(profileData);

            try {
                setAgencyId(profileData?.agencyId ? String(profileData.agencyId) : null);
                if (profileData?.agencyId) {
                    setShowAgencyIdPopup(false);
                }
            } catch (e) {
                // ignore
            }

            if (profileData?.activeRole === 'agency') {
                setUserMode('agency');
            } else {
                setUserMode('guide');
            }

            // Check for profile completeness to trigger onboarding highlights
            if (profileData.isProfileComplete === false && profileData?.activeRole !== 'agency') {
                setOnboardingStep('personal_info');
            } else {
                setOnboardingStep('none');
            }


            // Save to local storage for offline use
            try {
                await AsyncStorage.setItem('user_data', JSON.stringify(profileData));
            } catch (e) { }

            // Load compliance status for freelance and setup reminders
            setTimeout(() => {
                fetchCompliance(profileData?.activeRole);
            }, 50);
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            // Fallback to local storage if API fails
            try {
                const localData = await AsyncStorage.getItem('user_data');
                if (localData) {
                    const parsed = JSON.parse(localData);
                    setUser(parsed);
                    setTimeout(() => {
                        fetchCompliance(parsed?.activeRole);
                    }, 50);
                    try {
                        setAgencyId(parsed?.agencyId ? String(parsed.agencyId) : null);
                        if (parsed?.agencyId) {
                            setShowAgencyIdPopup(false);
                        }
                    } catch (e) {
                        // ignore
                    }
                }
            } catch (e) { }
        } finally {
            setIsLoadingProfile(false);
        }
    };

    useEffect(() => {
        const eligible = Boolean(compliance?.eligible);
        if (!isFreelanceRole) return;
        syncComplianceReminders(eligible);
    }, [compliance?.eligible, isFreelanceRole]);

    const fetchMyReviews = async (guideId: string) => {
        if (!guideId) {
            setReviews([]);
            setReviewsCount(0);
            setAverageRating(0);
            return;
        }

        try {
            setReviewsLoading(true);
            const [summaryRes, listRes] = await Promise.all([
                reviewsApi.summaryByTarget({ targetType: 'GUIDE', targetId: guideId }),
                reviewsApi.listByTarget({ targetType: 'GUIDE', targetId: guideId }),
            ]);
            setAverageRating(Number(summaryRes.data?.averageRating || 0));
            setReviewsCount(Number(summaryRes.data?.reviewsCount || 0));
            setReviews(Array.isArray(listRes.data?.reviews) ? listRes.data.reviews : []);
        } catch {
            setReviews([]);
            setReviewsCount(0);
            setAverageRating(0);
        } finally {
            setReviewsLoading(false);
        }
    };

    useEffect(() => {
        const guideId = user?.id ? String(user.id) : '';
        if (!guideId) return;
        fetchMyReviews(guideId);
    }, [user?.id]);

    const handleJoinAgency = async () => {
        if (!agencyIdInput.trim()) {
            Alert.alert('Erreur', "Veuillez saisir l'ID de l'agence.");
            return;
        }

        setIsJoiningAgency(true);
        try {
            await authService.joinAgency(agencyIdInput.trim());
            await fetchProfile();
            Alert.alert('Succès', "Rattachement effectué. Vous pouvez maintenant switch vers le rôle Agence.");
        } catch (error: any) {
            Alert.alert('Erreur', typeof error === 'string' ? error : "Impossible de rejoindre l'agence.");
        } finally {
            setIsJoiningAgency(false);
        }
    };

    const handleBackendSwitchRole = async (target: 'guide' | 'agency') => {
        // If trying to switch to agency without being linked, ask for code/id first
        if (target === 'agency' && !hasAgency) {
            setAgencyIdInput('');
            setShowJoinAgencyModal(true);
            return;
        }

        setIsSwitchingRole(true);
        try {
            await authService.switchRole(target === 'agency' ? 'agency' : 'freelance');
            await fetchProfile();
            setUserMode(target);

            // Clear role-scoped caches so the target space reloads fresh data
            try {
                const roleKey = target === 'agency' ? 'agency' : 'freelance';
                await AsyncStorage.multiRemove([
                    `@guide_conversations_cache_${roleKey}`,
                    `@guide_notifications_cache_v1_${roleKey}`,
                    `unread_messages_count_${roleKey}`,
                ]);
            } catch (e) {
                // ignore
            }

            if (target === 'agency') {
                setShowJoinAgencyModal(false);
                router.replace('/(agency)/splash');
            } else {
                setShowJoinAgencyModal(false);
                router.replace('/(guide)/splash');
            }
        } catch (error: any) {
            Alert.alert('Erreur', typeof error === 'string' ? error : 'Impossible de switcher le rôle.');
        } finally {
            setIsSwitchingRole(false);
        }
    };

    const confirmJoinAgencyAndSwitch = async () => {
        if (!agencyIdInput.trim()) {
            Alert.alert('Erreur', "Veuillez saisir l'ID ou le code de l'agence.");
            return;
        }

        setIsSwitchingRole(true);
        setIsJoiningAgency(true);
        try {
            await authService.joinAgency(agencyIdInput.trim());
            await fetchProfile();
            setShowJoinAgencyModal(false);

            await authService.switchRole('agency');
            await fetchProfile();
            setUserMode('agency');
            try {
                const nextAgencyId = user?.agencyId ? String(user.agencyId) : null;
                setAgencyId(nextAgencyId);
                if (nextAgencyId) {
                    setShowAgencyIdPopup(false);
                }
            } catch (e) {
                // ignore
            }

            try {
                await AsyncStorage.multiRemove([
                    `@guide_conversations_cache_agency`,
                    `@guide_notifications_cache_v1_agency`,
                    `unread_messages_count_agency`,
                ]);
            } catch (e) {
                // ignore
            }

            router.replace('/(agency)/splash');
        } catch (error: any) {
            Alert.alert('Erreur', typeof error === 'string' ? error : "Impossible de rejoindre l'agence.");
        } finally {
            setIsJoiningAgency(false);
            setIsSwitchingRole(false);
            setShowJoinAgencyModal(false);
        }
    };


    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0].uri) {
            setIsLoadingProfile(true);
            try {
                await authService.uploadAvatar(result.assets[0].uri);
                await fetchProfile();
            } catch (error) {
                console.error('Upload failed:', error);
                Alert.alert('Erreur', 'Impossible de mettre à jour la photo.');
            } finally {
                setIsLoadingProfile(false);
            }
        }
    };


    const USER_NAME = user ? `${user.firstName} ${user.lastName}` : 'Chargement...';
    const USER_AVATAR =
        getUserAvatarUrl(user?.photoUrl || user?.photo) ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User' : 'User')}&background=2C5F2D&color=fff`;

    const flatListRef = useRef<FlatList>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [showQRModal, setShowQRModal] = useState(false);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [showFAQModal, setShowFAQModal] = useState(false);
    const [showLogoutSheet, setShowLogoutSheet] = useState(false);
    const [showDeleteSheet, setShowDeleteSheet] = useState(false);
    const [agreeDelete, setAgreeDelete] = useState(false);
    const [supportMessage, setSupportMessage] = useState('');
    const [isSendingSupport, setIsSendingSupport] = useState(false);
    const [locationEnabled, setLocationEnabled] = useState(user?.shareLocation || false);

    const [profileVisible, setProfileVisible] = useState(true);
    const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);


    useEffect(() => {
        if (user) {
            setProfileVisible(user.isVisible ?? true);
        }
    }, [user]);

    const handleToggleVisibility = async (value: boolean) => {
        setProfileVisible(value);
        try {
            await authService.updateProfile({ isVisible: value });
            // Update local state and stored user
            const updatedUser = { ...user, isVisible: value };
            setUser(updatedUser);
            await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
        } catch (error) {
            console.error('Failed to update visibility:', error);
            setProfileVisible(!value); // Rollback
            Alert.alert('Erreur', typeof error === 'string' ? error : 'Impossible de mettre à jour la visibilité.');
        }
    };

    const [darkMode, setDarkMode] = useState(false);

    const [searchFAQ, setSearchFAQ] = useState('');

    // Scroll / Animations
    const scrollY = useRef(new Animated.Value(0)).current;
    const switchAnim = useRef(new Animated.Value(0)).current;
    const posAnim = useRef(new Animated.Value(0)).current;
    const { isBottomNavVisible, setBottomNavVisibility, onboardingStep, setOnboardingStep } = useUser();

    // Onboarding pulse animation
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (onboardingStep === 'profile_tab') {
            setOnboardingStep('personal_info');
        }

        if (onboardingStep === 'personal_info') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [onboardingStep, setOnboardingStep, pulseAnim]);

    // Theme references
    const HEADER_FIXED = 160 + insets.top;

    const [switchVisible, setSwitchVisible] = useState(false);

    const lastScrollY = useRef(0);
    const handleVerticalScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        {
            useNativeDriver: false,
            listener: (e: any) => {
                const y = e.nativeEvent.contentOffset.y;
                const isScrollingDown = y > lastScrollY.current;

                if (isScrollingDown && y > 100) {
                    if (!switchVisible) {
                        setSwitchVisible(true);
                        Animated.spring(switchAnim, {
                            toValue: 1,
                            useNativeDriver: true,
                            tension: 40,
                            friction: 8,
                        }).start();
                    }
                    setBottomNavVisibility(false);
                } else if (!isScrollingDown || y < 50) {
                    if (switchVisible) {
                        setSwitchVisible(false);
                        Animated.spring(switchAnim, {
                            toValue: 0,
                            useNativeDriver: true,
                            tension: 40,
                            friction: 8,
                        }).start();
                    }
                    setBottomNavVisibility(true);
                }
                lastScrollY.current = y;
            }
        }
    );

    useEffect(() => {
        Animated.spring(posAnim, {
            toValue: isBottomNavVisible ? 0 : 1,
            useNativeDriver: true,
            tension: 40,
            friction: 8,
        }).start();
    }, [isBottomNavVisible]);

    useEffect(() => {
        // Reset visibility when entering
        setBottomNavVisibility(true);
    }, []);

    const switchTab = (index: number) => {
        setActiveTab(index);
        flatListRef.current?.scrollToIndex({ index, animated: true });
    };

    const handleHorizontalScroll = (e: any) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / width);
        setActiveTab(idx);
    };

    const handleLogout = () => setShowLogoutSheet(true);
    const confirmLogout = async () => {
        setIsLoggingOut(true);
        try {
            await authService.logout();
            setShowLogoutSheet(false);
            router.replace('/signin' as any);
        } catch (error) {
            console.error('Logout failed:', error);
            router.replace('/signin' as any); // Proceed anyway
        } finally {
            setIsLoggingOut(false);
        }
    };


    const confirmDelete = async () => {
        if (!deleteConfirmPassword.trim()) {
            Alert.alert('Erreur', 'Veuillez saisir votre mot de passe.');
            return;
        }
        setIsDeleting(true);
        try {
            await authService.deleteAccount(deleteConfirmPassword);
            setShowDeleteSheet(false);
            router.replace('/signin' as any);
        } catch (error: any) {
            Alert.alert('Erreur', typeof error === 'string' ? error : 'Échec de la suppression.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSwitchMode = () => {
        const target = userMode === 'guide' ? 'agency' : 'guide';
        handleBackendSwitchRole(target);
    };

    const handleSendSupport = async () => {
        if (!supportMessage.trim()) return;
        setIsSendingSupport(true);
        setTimeout(() => {
            setIsSendingSupport(false);
            setShowSupportModal(false);
            setSupportMessage('');
            Alert.alert('Succès', 'Votre message a été envoyé.');
        }, 1500);
    };

    // Tab: Compte
    const renderMonCompte = () => (
        <Animated.ScrollView
            style={{ flex: 1, backgroundColor: theme.colors.background }}
            contentContainerStyle={{
                paddingTop: HEADER_FIXED + 5,
                paddingHorizontal: 20,
                paddingBottom: 200,
            }}
            showsVerticalScrollIndicator={false}
            onScroll={handleVerticalScroll}
            scrollEventThrottle={16}
        >
            {onboardingStep === 'personal_info' && !isAgencyRole && (
                <View style={[ss.card, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary, borderWidth: 1.5, marginBottom: 20, padding: 16 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={[ss.sheetIconWrap, { marginBottom: 0, width: 44, height: 44 }]}>
                            <Ionicons name="sparkles" size={24} color={theme.colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[ss.modalTitle, { fontSize: 15, marginBottom: 2 }]}>Complétez votre profil !</Text>
                            <Text style={[ss.modalSub, { textAlign: 'left', marginBottom: 0, fontSize: 12 }]}>Ajoutez vos informations pour améliorer votre expérience Sabeel.</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[ss.sheetPrimaryBtn, { height: 40, marginTop: 12, backgroundColor: theme.colors.primary }]}
                        onPress={() => {
                            setOnboardingStep('none');
                            router.push('/(complet_profile)/personal-info' as any);
                        }}

                    >
                        <Text style={[ss.sheetPrimaryBtnText, { fontSize: 13 }]}>Continuer</Text>
                    </TouchableOpacity>
                </View>
            )}

            <Text style={ss.sectionLabel}>App préférences</Text>
            <View style={ss.card}>
                <ProfileMenuItem
                    icon="person-circle-outline"
                    label={t('Informations personnelles')}
                    onPress={() => {
                        setOnboardingStep('none');
                        router.push('/(complet_profile)/personal-info' as any);
                    }}
                    pulseAnim={onboardingStep === 'personal_info' ? pulseAnim : null}
                />

                {!isAgencyRole ? (
                    <ProfileMenuItem
                        icon="wallet-outline"
                        label={t('Portefeuille')}
                        onPress={() => router.push('/(views)/(screens)/wallet' as any)}
                    />
                ) : null}

                {userMode !== 'agency' && (
                    <ProfileMenuItem
                        icon="eye-outline"
                        label={t('Profil visible pour les pèlerins')}
                        type="toggle"
                        value={profileVisible}
                        onValueChange={handleToggleVisibility}
                    />
                )}

                <ProfileMenuItem
                    icon="globe-outline"
                    label={t('Langue')}
                    isLast={true}
                    onPress={() => router.push('/profile/language' as any)}
                />
            </View>

            {!isAgencyRole ? (
                <>
                    <Text style={ss.sectionLabel}>Vérification</Text>
                    <View style={ss.card}>
                        {isFreelanceRole ? (
                            <ProfileMenuItem
                                icon="mail-outline"
                                label={t('Vérification compte')}
                                onPress={() => router.push('/(views)/(screens)/profile/verification' as any)}
                            />
                        ) : null}

                        <ProfileMenuItem
                            icon="document-text-outline"
                            label={t('Documents')}
                            onPress={() => router.push('/(views)/(screens)/profile/document' as any)}
                        />

                        {isFreelanceRole ? (
                            <ProfileMenuItem
                                icon="document-attach-outline"
                                label={t('Contrat guide')}
                                isLast={true}
                                onPress={() => router.push('/(views)/(screens)/profile/contract' as any)}
                            />
                        ) : (
                            <ProfileMenuItem
                                icon="document-attach-outline"
                                label={t('Contrat guide')}
                                isLast={true}
                                onPress={() => router.push('/(views)/(screens)/profile/contract' as any)}
                            />
                        )}
                    </View>
                </>
            ) : null}

            <Text style={ss.sectionLabel}>Services</Text>
            <View style={ss.card}>
                <ProfileMenuItem
                    icon="business-outline"
                    label={t('Mon agence')}
                    onPress={() => router.push('/profile/agency' as any)}
                />
                <ProfileMenuItem
                    icon="qr-code-outline"
                    label={t('Mon Code QR')}
                    isLast={true}
                    onPress={() => setShowQRModal(true)}
                />
            </View>

            <Text style={ss.sectionLabel}>Autre</Text>
            <View style={ss.card}>
                <ProfileMenuItem
                    icon="lock-closed-outline"
                    label={t('Changer le mot de passe')}
                    onPress={() => router.push('/(views)/(screens)/profile/change_password' as any)}
                />
                <ProfileMenuItem
                    icon="moon-outline"
                    label={t('Mode sombre')}
                    type="toggle"
                    value={darkMode}
                    onValueChange={setDarkMode}
                />
                <ProfileMenuItem
                    icon="shield-checkmark-outline"
                    label={t('Confidentialité')}
                    onPress={() => router.push('/profile/privacy' as any)}
                />
                <ProfileMenuItem
                    icon="help-buoy-outline"
                    label={t('FAQ')}
                    onPress={() => setShowSupportModal(true)}
                />
                <ProfileMenuItem
                    icon="information-circle-outline"
                    label={t('À propos')}
                    onPress={() => router.push('/profile/about' as any)}
                />
                <ProfileMenuItem
                    icon="log-out-outline"
                    label={t('Se déconnecter')}
                    onPress={handleLogout}
                />
                <ProfileMenuItem
                    icon="trash-outline"
                    label={t('Supprimer le compte')}
                    onPress={() => setShowDeleteSheet(true)}
                    isLast={true}
                />
            </View>

            <View style={ss.versionContainer}>
                <Text style={ss.versionText}>Sabeel Guide V1.0.0</Text>
            </View>
        </Animated.ScrollView>
    );

    // Tab: Avis
    const renderMesAvis = () => (
        <Animated.ScrollView
            style={{ flex: 1, backgroundColor: theme.colors.background }}
            contentContainerStyle={{
                paddingTop: HEADER_FIXED + 5,
                paddingHorizontal: 24,
                paddingBottom: 200,
            }}
            showsVerticalScrollIndicator={false}
            onScroll={handleVerticalScroll}
            scrollEventThrottle={16}
        >
            <View style={[ss.card, { padding: 16, marginBottom: 14 }]}> 
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[ss.modalTitle, { fontSize: 14, marginBottom: 0 }]}>{t('Avis')}</Text>
                    <Text style={[ss.modalSub, { textAlign: 'right', marginBottom: 0 }]}>
                        {averageRating > 0 ? averageRating.toFixed(1) : '0.0'} ({reviewsCount})
                    </Text>
                </View>
            </View>

            {reviewsLoading ? (
                <View style={ss.emptyCard}>
                    <ActivityIndicator color={theme.colors.primary} />
                    <Text style={[ss.emptyText, { marginTop: 10 }]}>{t('Chargement...')}</Text>
                </View>
            ) : reviews.length === 0 ? (
                <View style={ss.emptyCard}>
                    <View style={ss.emptyIcon}>
                        <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.primary} />
                    </View>
                    <Text style={ss.emptyTitle}>{t('Aucun avis publié')}</Text>
                    <Text style={ss.emptyText}>
                        {t('Consultez les retours des pèlerins sur vos services.')}
                    </Text>
                </View>
            ) : (
                <View style={{ gap: 12 }}>
                    {reviews.map((r: any) => {
                        const authorName = `${r?.author?.firstName || ''} ${r?.author?.lastName || ''}`.trim() || 'Pèlerin';
                        const createdAt = r?.createdAt ? String(r.createdAt) : '';
                        const rating = Number(r?.rating || 0);
                        const comment = String(r?.comment || '').trim();

                        return (
                            <View key={String(r?.id || Math.random())} style={[ss.card, { padding: 14 }]}> 
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={[ss.modalTitle, { fontSize: 13, marginBottom: 0 }]}>{authorName}</Text>
                                    <Text style={[ss.modalSub, { textAlign: 'right', marginBottom: 0 }]}>{createdAt}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 6 }}>
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Ionicons
                                            key={s}
                                            name="star"
                                            size={14}
                                            color={s <= Math.round(rating) ? '#F59E0B' : 'rgba(0,0,0,0.12)'}
                                        />
                                    ))}
                                </View>
                                <Text style={[ss.modalSub, { textAlign: 'left', marginBottom: 0 }]}>{comment || '-'}</Text>
                            </View>
                        );
                    })}
                </View>
            )}
        </Animated.ScrollView>
    );

    const tabs = [
        { id: 0, content: renderMonCompte() },
        { id: 1, content: renderMesAvis() },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
                {/* Animated Header */}
                <Animated.View style={[
                    ss.header,
                    {
                        height: HEADER_FIXED,
                        paddingTop: insets.top,
                    },
                ]}>
                    <View style={ss.topBar}>
                        <TouchableOpacity
                            style={ss.topBarCenter}
                            activeOpacity={0.8}
                            onPress={handlePickImage}
                        >

                            <View style={ss.avatarWrap}>
                                <Image source={{ uri: USER_AVATAR }} style={ss.avatar} />
                                {isFreelanceRole && Boolean(compliance?.eligible) ? (
                                    <View style={ss.verifiedBadge}>
                                        <Ionicons name="checkmark" size={14} color="#fff" />
                                    </View>
                                ) : null}
                                <View style={ss.cameraBadge}>
                                    <Ionicons name="camera" size={14} color="#fff" />
                                </View>
                            </View>

                            <View style={{ alignItems: 'center' }}>
                                <Text style={ss.userName}>{USER_NAME}</Text>
                                {userMode === 'agency' ? (
                                    <View style={[ss.roleBadge, { marginTop: 4 }]}>
                                        <Text style={ss.roleText}>{t('Agence')}</Text>
                                    </View>
                                ) : isFreelanceRole && Boolean(compliance?.eligible) ? (
                                    <View style={[ss.roleBadge, { marginTop: 4 }]}>
                                        <Text style={ss.roleText}>{t('Vérifié')}</Text>
                                    </View>
                                ) : null}
                                {user?.bio ? (
                                    <Text style={ss.userBio} numberOfLines={1}>{user.bio}</Text>
                                ) : null}
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Tab bar */}
                    <View style={ss.tabBar}>
                        {[t('Mon Compte'), t('Avis')].map((label, i) => (
                            <TouchableOpacity
                                key={i}
                                style={ss.tabBtn}
                                onPress={() => switchTab(i)}
                            >
                                <Text style={[
                                    ss.tabLabel,
                                    {
                                        color: activeTab === i ? theme.colors.primary : theme.colors.muted,
                                        fontWeight: activeTab === i ? '900' : '600',
                                    },
                                ]}>
                                    {label}
                                </Text>
                                {activeTab === i && (
                                    <View style={ss.tabIndicator} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>

                {/* Swipeable Content */}
                <FlatList
                    ref={flatListRef}
                    data={tabs}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleHorizontalScroll}
                    scrollEventThrottle={16}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <View style={{ width }}>{item.content}</View>
                    )}
                />

                {/* QR Modal */}
                <Modal visible={showQRModal} transparent animationType="slide" onRequestClose={() => setShowQRModal(false)}>
                    <View style={ss.modalOverlay}>
                        <View style={ss.modalSheet}>
                            <View style={ss.sheetHandle} />
                            <TouchableOpacity style={ss.modalClose} onPress={() => setShowQRModal(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.muted} />
                            </TouchableOpacity>
                            <Text style={ss.modalTitle}>Mon QR Code</Text>
                            <Text style={ss.modalSub}>Présentez ce code pour identification rapide.</Text>
                            <View style={ss.qrWrap}>
                                <QRCode
                                    value={user?.uniqueIdentifier || 'SABEEL-GUIDE'}
                                    size={140}
                                    color={theme.colors.primary}
                                    backgroundColor="#fff"
                                />
                            </View>
                            <View style={ss.idBadge}>
                                <Text style={ss.idText}>ID: {user?.uniqueIdentifier}</Text>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* ═════ FAQ / Support Modal (Integrated) ═════ */}
                <Modal visible={showSupportModal} transparent animationType="slide">
                    <View style={ss.modalOverlay}>
                        <View style={[ss.modalSheet, { height: '70%', paddingBottom: 0 }]}>
                            <View style={ss.sheetHandle} />
                            <TouchableOpacity
                                style={ss.modalClose}
                                onPress={() => setShowSupportModal(false)}
                            >
                                <Ionicons name="close" size={24} color={theme.colors.muted} />
                            </TouchableOpacity>

                            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
                                <View style={{ alignItems: 'center', marginTop: 10 }}>
                                    <View style={ss.sheetIconWrap}>
                                        <Ionicons name="headset-outline" size={30} color={theme.colors.primary} />
                                    </View>
                                    <Text style={ss.modalTitle}>Centre de Support</Text>
                                    <Text style={ss.modalSub}>Posez votre question ou signalez une difficulté.</Text>
                                </View>

                                <View style={{ paddingHorizontal: 20, width: '100%' }}>
                                    <Text style={ss.inputLabel}>Votre message</Text>
                                    <TextInput
                                        multiline
                                        numberOfLines={6}
                                        placeholder="Décrivez votre demande en détail..."
                                        placeholderTextColor={theme.colors.muted}
                                        style={ss.textArea}
                                        value={supportMessage}
                                        onChangeText={setSupportMessage}
                                    />
                                </View>
                            </ScrollView>

                            <View style={{ padding: 20, width: '100%', marginBottom: insets.bottom }}>
                                <TouchableOpacity
                                    style={[ss.sheetPrimaryBtn, { backgroundColor: theme.colors.primary, marginTop: 0 }]}
                                    onPress={handleSendSupport}
                                    disabled={isSendingSupport}
                                >
                                    <Ionicons name="send" size={18} color="#fff" />
                                    <Text style={ss.sheetPrimaryBtnText}>{isSendingSupport ? 'Envoi...' : 'Envoyer'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* ═════ Logout Sheet ═════ */}
                <Modal visible={showLogoutSheet} transparent animationType="slide" onRequestClose={() => setShowLogoutSheet(false)}>
                    <TouchableOpacity style={ss.modalOverlay} activeOpacity={1} onPress={() => setShowLogoutSheet(false)}>
                        <TouchableOpacity activeOpacity={1} style={[ss.modalSheet, { paddingBottom: insets.bottom + 24 }]}>
                            <View style={ss.sheetHandle} />
                            <TouchableOpacity style={ss.modalClose} onPress={() => setShowLogoutSheet(false)}>
                                <Ionicons name="close" size={22} color={theme.colors.muted} />
                            </TouchableOpacity>
                            <View style={ss.sheetIconWrap}>
                                <Ionicons name="log-out-outline" size={30} color={theme.colors.primary} />
                            </View>
                            <Text style={ss.sheetTitle}>{t('Se déconnecter')}</Text>
                            <Text style={ss.sheetDesc}>Êtes-vous sûr de vouloir vous déconnecter de votre mission ?</Text>
                            <Button
                                title={t('Se déconnecter')}
                                onPress={confirmLogout}
                                loading={isLoggingOut}
                                style={{ width: '100%' }}
                            />


                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>

                {/* ═════ Delete Account Sheet ═════ */}
                <Modal visible={showDeleteSheet} transparent animationType="slide" onRequestClose={() => setShowDeleteSheet(false)}>
                    <TouchableOpacity style={ss.modalOverlay} activeOpacity={1} onPress={() => setShowDeleteSheet(false)}>
                        <TouchableOpacity activeOpacity={1} style={[ss.modalSheet, { paddingBottom: insets.bottom + 24 }]}>
                            <View style={ss.sheetHandle} />
                            <TouchableOpacity style={ss.modalClose} onPress={() => setShowDeleteSheet(false)}>
                                <Ionicons name="close" size={22} color={theme.colors.muted} />
                            </TouchableOpacity>
                            <View style={[ss.sheetIconWrap, { backgroundColor: '#FFF5F5' }]}>
                                <Ionicons name="trash-outline" size={30} color="#F44336" />
                            </View>
                            <Text style={ss.sheetTitle}>{t('Supprimer le compte')}</Text>
                            <Text style={ss.sheetDesc}>
                                Attention : Cette action est irréversible. Vos données seront définitivement supprimées.
                            </Text>
                            <TouchableOpacity
                                style={[ss.agreeRow, { borderColor: agreeDelete ? theme.colors.primary : theme.colors.border }]}
                                onPress={() => setAgreeDelete(!agreeDelete)}
                                activeOpacity={0.8}
                            >
                                <View style={[ss.checkbox, { backgroundColor: agreeDelete ? theme.colors.primary : 'transparent', borderColor: agreeDelete ? theme.colors.primary : theme.colors.border }]}>
                                    {agreeDelete && <Ionicons name="checkmark" size={12} color="#fff" />}
                                </View>
                                <Text style={ss.agreeText}>Je comprends et j&apos;accepte de supprimer mon compte.</Text>
                            </TouchableOpacity>

                            {agreeDelete && (
                                <View style={{ width: '100%', marginTop: 20 }}>
                                    <Text style={ss.inputLabel}>Confirmez avec votre mot de passe</Text>
                                    <TextInput
                                        style={ss.modalInput}
                                        placeholder="Mot de passe actuel"
                                        placeholderTextColor={theme.colors.muted}
                                        secureTextEntry
                                        value={deleteConfirmPassword}
                                        onChangeText={setDeleteConfirmPassword}
                                    />
                                </View>
                            )}

                            <Button
                                title={t('Supprimer définitivement')}
                                onPress={confirmDelete}
                                loading={isDeleting}
                                variant="primary"
                                style={{ backgroundColor: (agreeDelete && deleteConfirmPassword) ? '#F44336' : theme.colors.divider, marginTop: 24, width: '100%' }}
                                disabled={!agreeDelete || !deleteConfirmPassword}
                            />

                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>

                {/* ═════ Join Agency Modal (shown on switch to agency) ═════ */}
                <Modal
                    visible={showJoinAgencyModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowJoinAgencyModal(false)}
                >
                    <KeyboardAvoidingView
                        style={ss.modalOverlay}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        <View style={[ss.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
                            <ScrollView
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={{ paddingBottom: 4 }}
                                showsVerticalScrollIndicator={false}
                            >
                                <View style={ss.sheetHandle} />
                                <TouchableOpacity style={ss.modalClose} onPress={() => setShowJoinAgencyModal(false)}>
                                    <Ionicons name="close" size={22} color={theme.colors.muted} />
                                </TouchableOpacity>

                                <Text style={ss.modalTitle}>Rejoindre une agence</Text>
                                <Text style={[ss.modalSub, { textAlign: 'left' }]}>Saisissez l'ID ou le code de votre agence pour activer le rôle Guide Agence.</Text>

                                <View style={{ width: '100%', marginTop: 16 }}>
                                    <Text style={ss.inputLabel}>ID / Code de l'agence</Text>
                                    <TextInput
                                        style={ss.modalInput}
                                        value={agencyIdInput}
                                        onChangeText={setAgencyIdInput}
                                        placeholder="ID ou Code de l'agence"
                                        placeholderTextColor={theme.colors.muted}
                                        autoCapitalize="characters"
                                    />

                                    <Button
                                        title={isJoiningAgency || isSwitchingRole ? '...' : 'OK'}
                                        onPress={confirmJoinAgencyAndSwitch}
                                        loading={isJoiningAgency || isSwitchingRole}
                                        variant="primary"
                                        style={{ marginTop: 14, width: '100%', backgroundColor: theme.colors.primary }}
                                        disabled={isJoiningAgency || isSwitchingRole}
                                    />
                                </View>
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>

                {/* Floating Switch Button */}
                <Animated.View
                    pointerEvents={switchVisible ? 'auto' : 'none'}
                    style={[
                        ss.floatBtn,
                        {
                            opacity: switchAnim,
                            bottom: 120,
                            transform: [
                                {
                                    translateY: switchAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [80, 0],
                                    }),
                                },
                                {
                                    translateY: posAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, 85],
                                    }),
                                }
                            ],
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={[ss.switchBtn, { backgroundColor: theme.colors.secondary }]}
                        onPress={handleSwitchMode}
                        activeOpacity={0.9}
                    >
                        <Ionicons name="swap-horizontal" size={20} color="#fff" />
                        <Text style={ss.switchBtnText}>
                            Switch to {userMode === 'guide' ? 'Agency' : 'Guide'} Mode
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </SafeAreaView>
        </View>
    );
};

const ss = StyleSheet.create({
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: theme.colors.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        flex: 1,
    },
    topBarCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarWrap: {
        position: 'relative',
        marginBottom: 10,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    verifiedBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    userName: {
        fontSize: 15,
        fontWeight: '900',
        color: theme.colors.text,
        letterSpacing: -0.2,
    },
    userBio: {
        fontSize: 11,
        color: theme.colors.muted,
        marginTop: 2,
        fontWeight: '500',
        maxWidth: 220,
        textAlign: 'center',
    },
    userEmail: {
        fontSize: 11,
        color: theme.colors.muted,
        marginTop: 2,
        fontWeight: '500',
    },
    roleBadge: {
        backgroundColor: '#E8F5F1',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginTop: 4,
    },
    roleText: {
        fontSize: 9,
        color: theme.colors.primary,
        fontWeight: '700',
    },
    tabBar: {
        flexDirection: 'row',
        height: 42,
        paddingHorizontal: 20,
    },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabLabel: {
        fontSize: 12,
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        width: 32,
        height: 2.5,
        backgroundColor: theme.colors.primary,
        borderRadius: 2,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: theme.colors.muted,
        letterSpacing: 1.2,
        marginBottom: 8,
        marginTop: 18,
        paddingHorizontal: 4,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    emptyCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: 32,
        alignItems: 'center',
        marginTop: 24,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    emptyIcon: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#E8F5F1',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: theme.colors.text,
        marginBottom: 6,
    },
    emptyText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 19,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalOverlayCenter: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 30,
    },
    modalContent: {
        backgroundColor: theme.colors.background,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
    },
    logoutIconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#FFF1F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modalSheet: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        alignItems: 'center',
    },
    sheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.divider,
        marginBottom: 16,
    },
    modalClose: {
        position: 'absolute',
        top: 20,
        right: 20,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: theme.colors.text,
        marginBottom: 6,
    },
    modalSub: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
    },
    qrWrap: {
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        marginBottom: 16,
        alignItems: 'center',
    },
    qrPendingText: {
        fontSize: 11,
        color: theme.colors.muted,
        marginTop: 12,
        fontWeight: '600',
    },
    idBadge: {
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: '#E8F5F1',
    },
    idText: {
        fontSize: 15,
        fontWeight: '900',
        color: theme.colors.primary,
    },
    floatBtn: {
        position: 'absolute',
        left: 32,
        right: 32,
        zIndex: 100,
    },
    switchBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 18,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 12 },
            android: { elevation: 10 },
        }),
    },
    switchBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
        letterSpacing: 0.2,
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: theme.colors.text,
        marginBottom: 8,
    },
    sheetDesc: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 19,
        fontWeight: '800',
        color: theme.colors.muted,
        letterSpacing: 0.8,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: theme.colors.muted,
        letterSpacing: 0.8,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    textArea: {
        width: '100%',
        height: 120,
        borderRadius: 16,
        padding: 16,
        backgroundColor: theme.colors.surface,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        color: theme.colors.text,
        fontSize: 14,
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    sheetIconWrap: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: theme.colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    sheetPrimaryBtn: {
        width: '100%',
        height: 52,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 10,
    },
    sheetPrimaryBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
    },
    agreeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1.5,
        borderRadius: 16,
        padding: 14,
        marginVertical: 15,
        gap: 12,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    agreeText: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.text,
        fontWeight: '600',
        lineHeight: 18,
    },
    searchFAQContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        marginBottom: 20,
        width: '100%',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    modalInput: {
        width: '100%',
        height: 52,
        borderRadius: 16,
        paddingHorizontal: 16,
        backgroundColor: theme.colors.surface,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        color: theme.colors.text,
        fontSize: 14,
        marginTop: 8,
    },
    searchFAQInput: {

        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        color: theme.colors.text,
    },
    faqItem: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    faqQ: {
        fontSize: 14,
        fontWeight: '800',
        color: theme.colors.text,
        marginBottom: 4,
    },
    faqA: {
        fontSize: 13,
        color: theme.colors.muted,
        lineHeight: 18,
    },
    versionContainer: {
        alignItems: 'center',
        marginTop: 48,
    },
    versionText: {
        fontSize: 12,
        color: theme.colors.muted,
        fontWeight: '600',
    },
});
