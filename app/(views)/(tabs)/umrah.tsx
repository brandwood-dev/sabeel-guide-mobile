import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    ScrollView,
    FlatList,
    Image,
    Modal,
    Platform,
    Dimensions,
    Alert,
    Animated,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { Button } from '@/components/common/Button';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useUser } from '@/context/UserContext';
import { useFocusEffect } from '@react-navigation/native';
import { CustomAlert } from '@/components/common/CustomAlert';
import { useChat } from '@/context/ChatContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, getMemoryToken, sabeelGuideGroupsApi, freelanceGroupsApi, reservationApi } from '@/services/api';
import { getUserAvatarUrl } from '@/services/media';

const { width } = Dimensions.get('window');

type ApiPilgrim = {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    photo?: string;
};

type ApiGroup = {
    id: string;
    name: string;
    capacity?: number;
    departureDate?: string;
    imageUrl?: string | null;
    pilgrims?: ApiPilgrim[];
};

type ApiFreelanceGroup = {
    id: string;
    name: string;
    period?: string | null;
    city?: string | null;
    maxPilgrims?: number | null;
    imageUrl?: string | null;
};

type RequestItem = {
    id: string;
    pilgrimId?: string;
    name: string;
    type: string;
    date: string;
    photo: string;
};

const initialRequests: RequestItem[] = [];

const UmrahScreen = () => {
    const router = useRouter();
    const { userMode, user } = useUser();
    const { addGroupChat } = useChat();
    const [activeTab, setActiveTab] = useState('Pilgrims');
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [pilgrims, setPilgrims] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [requests, setRequests] = useState<RequestItem[]>(initialRequests);
    const [activeFilter, setActiveFilter] = useState('All');

    const canManageGroups = userMode === 'guide' && user?.activeRole === 'freelance';

    useFocusEffect(
        React.useCallback(() => {
            const mountedRef = { current: true };
            loadGroupsAndPilgrims(mountedRef);
            return () => {
                mountedRef.current = false;
            };
        }, [userMode, (user as any)?.activeRole]),
    );

    const loadGroupsAndPilgrims = async (mountedRef: { current: boolean }) => {
        try {
            const isFreelance = userMode === 'guide' && user?.activeRole === 'freelance';

            if (isFreelance) {
                const [groupsRes, reservationsRes] = await Promise.all([
                    freelanceGroupsApi.getMine(),
                    reservationApi.getGuideReservations(),
                ]);

                const groupsData = (groupsRes as any)?.data;
                const apiGroups: ApiFreelanceGroup[] = Array.isArray(groupsData?.groups) ? groupsData.groups : [];

                const reservationsData = (reservationsRes as any)?.data;
                const reservationsList: any[] = Array.isArray(reservationsData?.reservations)
                    ? reservationsData.reservations
                    : (Array.isArray(reservationsData) ? reservationsData : []);

                const acceptedReservations = reservationsList.filter((r: any) => String(r?.status || '').toLowerCase() === 'accepted');
                const pendingReservations = reservationsList.filter((r: any) => String(r?.status || '').toLowerCase() === 'pending');

                const groupDetails = await Promise.all(
                    apiGroups.map(async (g) => {
                        try {
                            const detail = await freelanceGroupsApi.getById(String(g.id));
                            return detail?.data?.group || null;
                        } catch {
                            return null;
                        }
                    }),
                );

                const pilgrimIdToGroupName = new Map<string, string>();
                groupDetails
                    .filter(Boolean)
                    .forEach((gd: any) => {
                        const groupName = String(gd?.name || 'Groupe');
                        const members = Array.isArray(gd?.pilgrims) ? gd.pilgrims : [];
                        members.forEach((p: any) => {
                            if (p?.id) pilgrimIdToGroupName.set(String(p.id), groupName);
                        });
                    });

                if (!mountedRef.current) return;

                const mappedGroups = apiGroups.map((g) => ({
                    id: String(g.id),
                    name: String(g.name || ''),
                    count: groupDetails.find((d: any) => String(d?.id) === String(g.id))?.pilgrims?.length || 0,
                    max: Number(g.maxPilgrims || 0),
                    date: String(g.period || ''),
                    status: 'Confirmed',
                    city: String(g.city || ''),
                    image: g.imageUrl || null,
                    pilgrims: [],
                }));

                const acceptedByPilgrimId = new Map<string, any>();
                acceptedReservations.forEach((r: any) => {
                    const p = r?.pilgrim || r?.user || r?.pilgrimUser || null;
                    const pilgrimId = String(r?.pilgrimUserId || p?.id || '').trim();
                    if (!pilgrimId) return;
                    const prev = acceptedByPilgrimId.get(pilgrimId);
                    if (!prev) {
                        acceptedByPilgrimId.set(pilgrimId, r);
                        return;
                    }
                    const prevDate = prev?.updatedAt || prev?.respondedAt || prev?.createdAt;
                    const nextDate = r?.updatedAt || r?.respondedAt || r?.createdAt;
                    if (nextDate && (!prevDate || String(nextDate) > String(prevDate))) {
                        acceptedByPilgrimId.set(pilgrimId, r);
                    }
                });

                const mappedPilgrims = Array.from(acceptedByPilgrimId.entries())
                    .map(([pilgrimId, r]) => {
                        const p = r?.pilgrim || r?.user || r?.pilgrimUser || null;
                        const summaryFullName = `${r?.pilgrimFirstName || ''} ${r?.pilgrimLastName || ''}`.trim();
                        const apiFullName = `${p?.firstName || ''} ${p?.lastName || ''}`.trim();
                        const fullName =
                            String(r?.pilgrimName || '').trim() ||
                            summaryFullName ||
                            apiFullName ||
                            'Pèlerin';
                        const groupName = pilgrimIdToGroupName.get(pilgrimId) || '';
                        const photo = String(r?.pilgrimImageUrl || '').trim() || (p?.photo ?? '');
                        return {
                            id: pilgrimId,
                            name: fullName,
                            status: groupName ? 'Assigned' : 'Solo',
                            group: groupName,
                            passport: '—',
                            photo,
                            email: p?.email || r?.pilgrimEmail,
                            phoneNumber: p?.phoneNumber || r?.pilgrimPhone,
                        };
                    })
                    .filter((x) => Boolean(x?.id));

                const mappedRequests: RequestItem[] = pendingReservations
                    .map((r: any) => {
                        const p = r?.pilgrim || r?.user || r?.pilgrimUser || r?.pilgrimUserData || null;
                        const pilgrimId = String(r?.pilgrimUserId || p?.id || '');
                        const apiFullName = `${p?.firstName || ''} ${p?.lastName || ''}`.trim();
                        const summaryFullName = `${r?.pilgrimFirstName || ''} ${r?.pilgrimLastName || ''}`.trim();
                        const fullName =
                            String(r?.pilgrimName || '').trim() ||
                            summaryFullName ||
                            apiFullName ||
                            'Pèlerin';
                        const photoUrl =
                            String(r?.pilgrimImageUrl || '').trim() ||
                            (getUserAvatarUrl(p?.photo) || '');
                        return {
                            id: String(r?.id || ''),
                            pilgrimId: String(r?.pilgrimUserId || pilgrimId || '').trim() || undefined,
                            name: fullName,
                            type: 'Reservation',
                            date: r?.createdAt ? String(r.createdAt).slice(0, 10) : '',
                            photo: photoUrl,
                        };
                    })
                    .filter((x) => Boolean(x.id));

                setGroups(mappedGroups);
                setPilgrims(mappedPilgrims);
                setRequests(mappedRequests);
                return;
            }

            const res = await sabeelGuideGroupsApi.getMyGroups();
            const data = (res as any)?.data;
            const apiGroups: ApiGroup[] = Array.isArray(data?.groups) ? data.groups : [];

            if (!mountedRef.current) return;

            const mappedGroups = apiGroups.map((g) => ({
                id: String(g.id),
                name: g.name,
                count: Array.isArray(g.pilgrims) ? g.pilgrims.length : 0,
                max: Number(g.capacity || 0),
                date: g.departureDate ? String(g.departureDate).slice(0, 10) : '',
                status: 'Confirmed',
                city: '',
                image: g.imageUrl || null,
                pilgrims: Array.isArray(g.pilgrims) ? g.pilgrims : [],
            }));

            setGroups(mappedGroups);

            const allPilgrims = apiGroups.flatMap((g) =>
                (Array.isArray(g.pilgrims) ? g.pilgrims : []).map((p) => ({
                    id: String(p.id),
                    name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Pèlerin',
                    status: 'Assigned',
                    group: g.name,
                    passport: '—',
                    photo: p.photo,
                    email: p.email,
                    phoneNumber: p.phoneNumber,
                }))
            );
            setPilgrims(allPilgrims);
        } catch (e) {
            if (mountedRef.current) {
                setGroups([]);
                setPilgrims([]);
            }
        }
    };

    useEffect(() => {
        const mountedRef = { current: true };

        // Reset role-scoped data immediately to avoid mixing between spaces
        setGroups([]);
        setPilgrims([]);

        loadGroupsAndPilgrims(mountedRef);
        return () => {
            mountedRef.current = false;
        };
    }, [userMode, user?.activeRole]);

    // UI States
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [qrModalVisible, setQRModalVisible] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();

    // New Group State
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDate, setNewGroupDate] = useState('');
    const [newGroupCity, setNewGroupCity] = useState('');
    const [newGroupMax, setNewGroupMax] = useState('');
    const [newGroupImage, setNewGroupImage] = useState<string | null>(null);
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [deleteGroupModalVisible, setDeleteGroupModalVisible] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState<{ id: string; name: string } | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [pickingStep, setPickingStep] = useState<'start' | 'end' | 'none'>('none');
    const [selectedDate, setSelectedDate] = useState(new Date());

    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'success' as 'success' | 'error' | 'warning',
        actionLabel: "D'accord",
        onAction: undefined as (() => void) | undefined,
    });

    const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' = 'success', actionLabel?: string, onAction?: () => void) => {
        setAlertConfig({
            visible: true,
            title,
            message,
            type,
            actionLabel: actionLabel || "D'accord",
            onAction,
        });
    };

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (userMode === 'agency' && activeTab === 'Requests') {
            setActiveTab('Pilgrims');
        }
    }, [userMode, activeTab]);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, [activeTab]);

    const handlePickGroupImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showAlert('Permission Requise', 'Nous avons besoin de la permission pour accéder à vos photos.', 'warning');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setNewGroupImage(result.assets[0].uri);
        }
    };

    const handleTakeGroupPhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'We need permission to access your camera.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setNewGroupImage(result.assets[0].uri);
        }
    };

    const handleDateChange = (event: any, date?: Date) => {
        if (event.type === 'dismissed') {
            setShowDatePicker(false);
            setPickingStep('none');
            return;
        }

        if (date) {
            if (pickingStep === 'start') {
                setStartDate(date);
                setSelectedDate(date); // Next picker starts from here
                setPickingStep('end');
                // On Android, we need to show the picker again for the end date
                if (Platform.OS === 'android') {
                    setShowDatePicker(false);
                    setTimeout(() => setShowDatePicker(true), 100);
                }
            } else if (pickingStep === 'end') {
                if (startDate && date < startDate) {
                    Alert.alert('Erreur', 'La date de fin doit être après la date de début');
                    return;
                }
                setEndDate(date);
                setShowDatePicker(false);
                setPickingStep('none');

                if (startDate) {
                    const diffTime = Math.abs(date.getTime() - startDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    const format = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                    setNewGroupDate(`${format(startDate)} - ${format(date)} - ${diffDays} jours`);
                }
            }
        }
    };

    const handleCreateGroup = async () => {
        if (isCreatingGroup) return;
        if (!canManageGroups) {
            showAlert('Accès refusé', "La création de groupe est disponible uniquement pour le guide freelance.", 'warning');
            return;
        }

        const name = String(newGroupName || '').trim();
        if (!name) {
            showAlert('Erreur', 'Veuillez saisir le nom du groupe.', 'error');
            return;
        }

        setIsCreatingGroup(true);
        try {
            let uploadedImageKey: string | undefined = undefined;
            if (newGroupImage) {
                const uploadUri = String(newGroupImage).startsWith('file://')
                    ? String(newGroupImage)
                    : `file://${String(newGroupImage)}`;
                const formData = new FormData();
                formData.append('image', {
                    uri: uploadUri,
                    name: `group-${Date.now()}.jpg`,
                    type: 'image/jpeg',
                } as any);

                // Use fetch for multipart upload (more reliable than axios FormData on React Native)
                const token = getMemoryToken() || (await AsyncStorage.getItem('auth_token'));
                const uploadResp = await fetch(`${String(API_BASE_URL || '').replace(/\/+$/, '')}/sabeel-guide/freelance-groups/upload-image`, {
                    method: 'POST',
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    body: formData as any,
                });
                if (!uploadResp.ok) {
                    const text = await uploadResp.text().catch(() => '');
                    throw new Error(text || `Upload failed (${uploadResp.status})`);
                }
                const uploadJson = await uploadResp.json().catch(() => null);
                uploadedImageKey = uploadJson?.imageUrl ? String(uploadJson.imageUrl) : undefined;
            }

            if (editingGroupId) {
                await freelanceGroupsApi.update(editingGroupId, {
                    name,
                    period: newGroupDate || undefined,
                    city: newGroupCity || undefined,
                    maxPilgrims: newGroupMax ? Number(newGroupMax) : undefined,
                    imageUrl: uploadedImageKey || undefined,
                });
            } else {
                await freelanceGroupsApi.create({
                    name,
                    period: newGroupDate || undefined,
                    city: newGroupCity || undefined,
                    maxPilgrims: newGroupMax ? Number(newGroupMax) : undefined,
                    imageUrl: uploadedImageKey,
                });
            }

            setCreateModalVisible(false);
            setNewGroupName('');
            setNewGroupDate('');
            setNewGroupCity('');
            setNewGroupMax('');
            setNewGroupImage(null);
            setStartDate(null);
            setEndDate(null);
            setPickingStep('none');
            setShowDatePicker(false);
            setEditingGroupId(null);

            await loadGroupsAndPilgrims({ current: true });
            showAlert('Succès', editingGroupId ? 'Groupe modifié avec succès.' : 'Groupe créé avec succès.', 'success');
        } catch (e: any) {
            showAlert('Erreur', (e as any)?.message || "Impossible de créer le groupe.", 'error');
        } finally {
            setIsCreatingGroup(false);
        }
    };

    const handleOpenScanner = async () => {
        if (!permission?.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
                showAlert('Caméra Requise', 'Nous avons besoin de la caméra pour scanner le QR Code.', 'error');
                return;
            }
        }
        setQRModalVisible(true);
    };

    const handleRejectRequest = (requestId: string) => {
        const isFreelance = userMode === 'guide' && user?.activeRole === 'freelance';
        if (isFreelance) {
            (async () => {
                try {
                    await reservationApi.rejectGuideReservation(requestId);
                    setRequests((prev) => prev.filter((r) => r.id !== requestId));
                    showAlert('Requête Rejetée', 'La requête a été refusée.', 'success');
                } catch (e: any) {
                    showAlert('Erreur', e?.response?.data?.message || e?.message || 'Impossible de rejeter la requête.', 'error');
                }
            })();
            return;
        }

        setRequests(requests.filter(r => r.id !== requestId));
        showAlert('Requête Rejetée', 'La requête a été définitivement supprimée.', 'success');
    };

    const handleAcceptRequest = (requestId: string) => {
        const isFreelance = userMode === 'guide' && user?.activeRole === 'freelance';
        if (isFreelance) {
            (async () => {
                try {
                    const req = (Array.isArray(requests) ? requests : []).find((r) => String(r.id) === String(requestId));
                    if (req) {
                        setRequests((prev) => (Array.isArray(prev) ? prev : []).filter((r) => String(r.id) !== String(requestId)));
                        if (req.pilgrimId) {
                            setPilgrims((prev) => {
                                const next = Array.isArray(prev) ? prev : [];
                                const exists = next.some((p: any) => String(p?.id) === String(req.pilgrimId));
                                if (exists) return next;
                                return [
                                    {
                                        id: String(req.pilgrimId),
                                        name: String(req.name || 'Pèlerin'),
                                        status: 'Solo',
                                        group: '',
                                        passport: '—',
                                        photo: req.photo || '',
                                    },
                                    ...next,
                                ];
                            });
                        }
                    }
                    await reservationApi.acceptGuideReservation(requestId);
                    showAlert('Requête Acceptée', 'La réservation a été acceptée.', 'success');
                    await loadGroupsAndPilgrims({ current: true });
                } catch (e: any) {
                    await loadGroupsAndPilgrims({ current: true });
                    showAlert('Erreur', e?.response?.data?.message || e?.message || "Impossible d'accepter la requête.", 'error');
                }
            })();
            return;
        }

        const request = requests.find(r => r.id === requestId);
        if (request) {
            const newPilgrim = {
                id: request.id,
                name: request.name,
                status: 'Assigned',
                group: 'En attente',
                passport: 'A vérifier',
                photo: request.photo
            };
            setPilgrims([newPilgrim, ...pilgrims]);
            setRequests(requests.filter(r => r.id !== requestId));
            showAlert('Requête Acceptée', `${request.name} a été ajouté à votre liste de pèlerins.`, 'success');
        }
    };

    const openEditGroup = (item: any) => {
        setEditingGroupId(String(item?.id || ''));
        setNewGroupName(String(item?.name || ''));
        setNewGroupDate(String(item?.date || ''));
        setNewGroupCity(String(item?.city || ''));
        setNewGroupMax(item?.max ? String(item.max) : '');
        setNewGroupImage(item?.image ? String(item.image) : null);
        setCreateModalVisible(true);
    };

    const handleDeleteGroup = async (groupId: string) => {
        try {
            await freelanceGroupsApi.delete(groupId);
            setGroups((prev) => (Array.isArray(prev) ? prev : []).filter((g: any) => String(g.id) !== String(groupId)));
            showAlert('Supprimé', 'Le groupe a été supprimé.', 'success');
        } catch (e: any) {
            showAlert('Erreur', e?.response?.data?.message || e?.message || 'Impossible de supprimer le groupe.', 'error');
        }
    };

    const openDeleteGroupSheet = (item: any) => {
        setGroupToDelete({ id: String(item?.id || ''), name: String(item?.name || 'Groupe') });
        setDeleteGroupModalVisible(true);
    };

    const openProfile = (pilgrim: any) => {
        router.push({
            pathname: '/(views)/(screens)/profile/pilgrim_profile',
            params: {
                id: pilgrim.id,
                name: pilgrim.name,
                status: pilgrim.status,
                group: pilgrim.group || 'Individual',
                passport: pilgrim.passport,
                photo: pilgrim.photo
            }
        });
    };

    const onBarCodeScanned = ({ data }: { data: string }) => {
        setQRModalVisible(false);
        if (userMode === 'agency') {
            Alert.alert("Tracking Started", `Scanning pilgrim QR: ${data}\nTracking active for this pilgrim ✅`);
        } else {
            Alert.alert("QR Scanned", `Data: ${data}\nPilgrim added successfully ✅`);
        }
        // Logic to find/add pilgrim based on QR data
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

    const renderPilgrimCard = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.card} onPress={() => openProfile(item)}>
            <Image
                source={{
                    uri:
                        getUserAvatarUrl(item.photo) ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'User')}&background=2C5F2D&color=fff`,
                }}
                style={styles.cardImage}
            />
            <View style={styles.cardInfo}>
                <View style={styles.cardHeaderRow}>
                    <Text style={[styles.cardName, { flex: 1 }]} numberOfLines={1}>{item.name}</Text>
                    {item.group && (
                        <View style={[styles.groupBadge, { maxWidth: '40%' }]}>
                            <Text style={styles.groupBadgeText} numberOfLines={1}>{item.group}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="passport" size={14} color={theme.colors.muted} />
                    <Text style={styles.cardSub}> {item.passport}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderGroupCard = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => {
                // Navigate to group detail screen
                router.push({
                    pathname: '/groupe_screen',
                    params: {
                        id: item.id,
                        name: item.name,
                        date: item.date,
                        city: item.city,
                        max: String(item.max || ''),
                        count: String(item.count || ''),
                        status: item.status
                    }
                });
            }}
        >
            <View style={[styles.groupIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <MaterialCommunityIcons name="account-group" size={30} color={theme.colors.primary} />
            </View>
            <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardSub}>{item.city} • {item.date}</Text>
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${item.max ? (item.count / item.max) * 100 : 0}%` },
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>{item.count}/{item.max} Pilgrims</Text>
                </View>
            </View>
            {canManageGroups ? (
                <TouchableOpacity
                    style={styles.chevronButton}
                    onPress={() => {
                        Alert.alert(
                            item.name,
                            'Actions du groupe',
                            [
                                { text: 'Annuler', style: 'cancel' },
                                { text: 'Modifier', onPress: () => openEditGroup(item) },
                                {
                                    text: 'Supprimer',
                                    style: 'destructive',
                                    onPress: () => openDeleteGroupSheet(item),
                                },
                            ]
                        );
                    }}
                >
                    <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.muted} />
                </TouchableOpacity>
            ) : (
                <View style={styles.chevronButton}>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
                </View>
            )}
        </TouchableOpacity>
    );

    const renderRequestCard = ({ item }: { item: typeof initialRequests[0] }) => (
        <View style={styles.requestCard}>
            <View style={styles.requestMain}>
                <Image
                    source={{
                        uri:
                            item.photo ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'User')}&background=2C5F2D&color=fff`,
                    }}
                    style={styles.cardImage}
                />
                <View style={styles.cardInfo}>
                    <View style={styles.requestHeader}>
                        <Text style={styles.cardName}>{item.name}</Text>
                        <View style={styles.badgeNew}>
                            <Text style={styles.badgeNewText}>New</Text>
                        </View>
                    </View>
                    <Text style={styles.packetText}>{item.type}</Text>
                    <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={14} color={theme.colors.muted} />
                        <Text style={styles.dateText}>{item.date}</Text>
                    </View>
                </View>
            </View>
            <View style={styles.requestActions}>
                <TouchableOpacity
                    style={[styles.requestActionBtn, styles.rejectBtn]}
                    onPress={() => handleRejectRequest(item.id)}
                >
                    <Text style={[styles.btnText, styles.rejectText]}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.requestActionBtn, styles.acceptBtn]}
                    onPress={() => handleAcceptRequest(item.id)}
                >
                    <Text style={[styles.btnText, styles.acceptText]}>Accept</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const filteredPilgrims = pilgrims.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.passport.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = activeFilter === 'All' || p.status === activeFilter;
        return matchesSearch && matchesFilter;
    });

    return (
        <SafeAreaView style={styles.container}>
            {/* Top App Bar */}
            <View style={styles.appBar}>
                <Text style={styles.headerTitle}>Gestion Umrah</Text>
                <View style={styles.headerIcons}>
                    {canManageGroups && (
                        <TouchableOpacity style={styles.headerBtn} onPress={() => setCreateModalVisible(true)}>
                            <Ionicons name="add" size={26} color={theme.colors.secondary} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.headerBtn} onPress={handleOpenScanner}>
                        <MaterialCommunityIcons name="qrcode-scan" size={20} color={theme.colors.secondary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchWrapper}>
                <View style={styles.searchBarContainer}>
                    <Ionicons name="search-outline" size={20} color={theme.colors.muted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search name, ID, group..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* Circular Filter Navigation (Replacing old Tabs) */}
            <View style={styles.filterWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterScroll}
                    contentContainerStyle={styles.filterContent}
                >
                    {(userMode === 'guide' ? ['Pilgrims', 'Groups', 'Requests'] : ['Pilgrims', 'Groups']).map((filter) => (
                        <TouchableOpacity
                            key={filter}
                            style={[styles.filterChip, activeTab === filter && styles.activeFilterChip]}
                            onPress={() => setActiveTab(filter)}
                        >
                            <Text style={[styles.filterChipText, activeTab === filter && styles.activeFilterChipText]}>
                                {filter}
                            </Text>
                            {filter === 'Requests' && requests.length > 0 && (
                                <View style={styles.chipBadge}>
                                    <Text style={styles.chipBadgeText}>{requests.length}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {activeTab === 'Pilgrims' && (
                    <FlatList
                        data={filteredPilgrims}
                        keyExtractor={(item) => item.id}
                        renderItem={renderPilgrimCard}
                        contentContainerStyle={styles.listPadding}
                        showsVerticalScrollIndicator={false}
                    />
                )}
                {activeTab === 'Groups' && (
                    <FlatList
                        data={groups}
                        keyExtractor={(item) => item.id}
                        renderItem={renderGroupCard}
                        contentContainerStyle={styles.listPadding}
                        showsVerticalScrollIndicator={false}
                    />
                )}
                {activeTab === 'Requests' && (
                    <FlatList
                        data={requests}
                        keyExtractor={(item) => item.id}
                        renderItem={renderRequestCard}
                        contentContainerStyle={styles.listPadding}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="email-open-outline" size={80} color={theme.colors.border} />
                                <Text style={styles.emptyText}>No pending requests</Text>
                            </View>
                        }
                    />
                )}
            </Animated.View>

            <Modal
                transparent
                animationType="slide"
                visible={deleteGroupModalVisible}
                onRequestClose={() => setDeleteGroupModalVisible(false)}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    style={styles.deleteModalOverlay}
                    onPress={() => setDeleteGroupModalVisible(false)}
                />
                <View style={styles.deleteModalSheet}>
                    <Text style={styles.deleteModalTitle}>Supprimer le groupe</Text>
                    <Text style={styles.deleteModalText} numberOfLines={2}>
                        {groupToDelete?.name || 'Groupe'}
                    </Text>
                    <View style={styles.deleteModalActions}>
                        <TouchableOpacity
                            style={[styles.deleteModalBtn, styles.deleteModalCancelBtn]}
                            onPress={() => setDeleteGroupModalVisible(false)}
                        >
                            <Text style={styles.deleteModalCancelText}>Annuler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.deleteModalBtn, styles.deleteModalConfirmBtn]}
                            onPress={async () => {
                                const gid = groupToDelete?.id;
                                setDeleteGroupModalVisible(false);
                                setGroupToDelete(null);
                                if (gid) await handleDeleteGroup(gid);
                            }}
                        >
                            <Text style={styles.deleteModalConfirmText}>Supprimer</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Create Group Modal */}
            <Modal
                visible={createModalVisible}
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Create New Group</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    if (isCreatingGroup) return;
                                    setCreateModalVisible(false);
                                }}
                            >
                                <Ionicons name="close" size={24} color={theme.colors.secondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalForm}>
                            {/* Group Image Picker */}
                            <View style={[styles.inputGroup, { marginBottom: 15 }]}>
                                <Text style={styles.label}>Group Image</Text>
                                <View style={styles.imagePickerContainer}>
                                    {newGroupImage ? (
                                        <View style={styles.imagePreviewContainer}>
                                            <Image source={{ uri: newGroupImage }} style={styles.groupImagePreview} />
                                            <TouchableOpacity
                                                style={styles.removeImageBtn}
                                                onPress={() => setNewGroupImage(null)}
                                            >
                                                <Ionicons name="close-circle" size={24} color="#F44336" />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <View style={styles.imagePickerButtons}>
                                            <TouchableOpacity
                                                style={[styles.imagePickerBtn, { padding: 12 }]}
                                                onPress={handlePickGroupImage}
                                            >
                                                <MaterialCommunityIcons name="image" size={24} color={theme.colors.primary} />
                                                <Text style={[styles.imagePickerText, { fontSize: 12 }]}>Choose from Gallery</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Group Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter group name"
                                    value={newGroupName}
                                    onChangeText={setNewGroupName}
                                />
                            </View>

                            <View style={[styles.inputGroup, { marginTop: 4 }]}>
                                <Text style={styles.label}>Period</Text>
                                <TouchableOpacity
                                    style={styles.datePickerButton}
                                    onPress={() => {
                                        setPickingStep('start');
                                        setShowDatePicker(true);
                                    }}
                                >
                                    <MaterialCommunityIcons name="calendar" size={18} color={theme.colors.primary} />
                                    <Text style={[styles.datePickerText, { fontSize: 13 }]}>
                                        {newGroupDate || 'Select period'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={18} color={theme.colors.muted} />
                                </TouchableOpacity>
                                {showDatePicker && (
                                    <View style={styles.datePickerWrapper}>
                                        <DateTimePicker
                                            value={selectedDate}
                                            mode="date"
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            onChange={handleDateChange}
                                            minimumDate={pickingStep === 'end' && startDate ? startDate : new Date()}
                                        />
                                    </View>
                                )}
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Destination City</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Makkah or Madinah"
                                    value={newGroupCity}
                                    onChangeText={setNewGroupCity}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Max Pilgrims</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="20"
                                    value={newGroupMax}
                                    onChangeText={setNewGroupMax}
                                    keyboardType="numeric"
                                />
                            </View>

                            <Button
                                title={isCreatingGroup ? 'Création...' : 'Create Group'}
                                onPress={handleCreateGroup}
                                style={styles.createBtn}
                                disabled={isCreatingGroup}
                            />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* QR Scanner Modal */}
            <Modal
                visible={qrModalVisible}
                animationType="fade"
            >
                <SafeAreaView style={styles.qrContainer}>
                    <View style={styles.qrHeader}>
                        <TouchableOpacity onPress={() => setQRModalVisible(false)}>
                            <Ionicons name="arrow-back" size={28} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.qrTitle}>Scan Pilgrim QR</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    {permission?.granted ? (
                        <CameraView
                            onBarcodeScanned={onBarCodeScanned}
                            barcodeScannerSettings={{
                                barcodeTypes: ["qr"],
                            }}
                            facing="back"
                            style={styles.camera}
                        >
                            <View style={styles.scannerOverlay}>
                                <View style={styles.scannerFrame} />
                                <Text style={styles.scannerText}>Centrer le QR Code dans le cadre</Text>
                            </View>
                        </CameraView>
                    ) : (
                        <View style={[styles.camera, { justifyContent: 'center', alignItems: 'center' }]}>
                            <MaterialCommunityIcons name="camera-off" size={60} color="rgba(255,255,255,0.4)" />
                            <Text style={[styles.scannerText, { textAlign: 'center', paddingHorizontal: 40 }]}>
                                L&apos;accès à la caméra est nécessaire pour scanner le badge du pèlerin.
                            </Text>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: theme.colors.primary, marginTop: 20, paddingHorizontal: 20 }]}
                                onPress={requestPermission}
                            >
                                <Text style={styles.actionBtnText}>Autoriser la Caméra</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </SafeAreaView>
            </Modal>

            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                actionLabel={alertConfig.actionLabel}
                onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
                onAction={() => {
                    setAlertConfig({ ...alertConfig, visible: false });
                    if (alertConfig.onAction) alertConfig.onAction();
                }}
            />
        </SafeAreaView>
    );
};

export default UmrahScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FB',
    },
    appBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 10,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F3F5',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.secondary,
    },
    headerIcons: {
        flexDirection: 'row',
    },
    headerBtn: {
        marginLeft: 18,
    },
    searchWrapper: {
        paddingHorizontal: 20,
        paddingBottom: 10,
        backgroundColor: theme.colors.surface,
    },
    searchBarContainer: {
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
        backgroundColor: '#F8F9FB',
        paddingVertical: 8,
    },
    chipBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#4CAF50',
        width: 14,
        height: 14,
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    chipBadgeText: {
        color: '#fff',
        fontSize: 7,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
    },
    listPadding: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    requestCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        // No flex row here as layout is vertical (Main + Actions)
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    cardImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f1f1f1',
    },
    groupIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardInfo: {
        flex: 1,
        marginLeft: 16,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    requestMain: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    cardName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.secondary,
        marginRight: 8,
    },
    cardSub: {
        fontSize: 12,
        color: theme.colors.muted,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    groupBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    groupBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    badgeNew: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    badgeNewText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
    },
    packetText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.secondary,
        marginBottom: 4,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dateText: {
        fontSize: 12,
        color: theme.colors.muted,
    },
    deleteModalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    deleteModalSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
    },
    deleteModalTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.secondary,
        marginBottom: 6,
    },
    deleteModalText: {
        fontSize: 13,
        color: theme.colors.muted,
        marginBottom: 14,
    },
    deleteModalActions: {
        flexDirection: 'row',
        gap: 10,
    },
    deleteModalBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteModalCancelBtn: {
        backgroundColor: '#F3F4F6',
    },
    deleteModalConfirmBtn: {
        backgroundColor: '#EF4444',
    },
    deleteModalCancelText: {
        color: theme.colors.secondary,
        fontWeight: '700',
        fontSize: 13,
    },
    deleteModalConfirmText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
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
    groupTag: {
        fontSize: 13,
        color: theme.colors.muted,
    },
    cardActions: {
        flexDirection: 'row',
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F8F9FB',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    moreBtn: {
        padding: 5,
    },
    chevronButton: {
        padding: 8,
    },
    progressContainer: {
        marginTop: 4,
    },
    progressBar: {
        height: 6,
        backgroundColor: '#F0F0F0',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 4,
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
    },
    progressText: {
        fontSize: 12,
        color: theme.colors.muted,
        fontWeight: '500',
    },
    requestActions: {
        flexDirection: 'row',
        gap: 8,
    },
    requestActionBtn: {
        flex: 1,
        paddingVertical: 7,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptBtn: {
        backgroundColor: '#4CAF50',
    },
    rejectBtn: {
        backgroundColor: '#F1F3F5',
    },
    btnText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    acceptText: {
        color: '#fff',
    },
    rejectText: {
        color: '#546E7A',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: theme.colors.muted,
        fontWeight: '500',
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
        height: '80%',
        padding: theme.spacing.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.secondary,
    },
    modalForm: {
        flex: 1,
    },
    inputGroup: {
        marginBottom: 14,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.secondary,
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        fontSize: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
        color: theme.colors.text,
    },
    createBtn: {
        marginTop: 20,
        marginBottom: 40,
    },
    qrContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    qrHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.xl,
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    qrTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    camera: {
        flex: 1,
    },
    scannerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scannerFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        borderRadius: 24,
        backgroundColor: 'transparent',
    },
    scannerText: {
        color: '#fff',
        marginTop: 30,
        fontSize: 16,
        fontWeight: '500',
    },
    imagePickerContainer: {
        marginTop: 8,
    },
    imagePickerButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    imagePickerBtn: {
        flex: 1,
        backgroundColor: '#F0F7F2',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.primary + '30',
        borderStyle: 'dashed',
    },
    imagePickerText: {
        marginTop: 8,
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.primary,
        textAlign: 'center',
    },
    imagePreviewContainer: {
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
    },
    groupImagePreview: {
        width: '100%',
        height: 140,
        borderRadius: 16,
        backgroundColor: '#f1f1f1',
    },
    removeImageBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#fff',
        borderRadius: 14,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    datePickerButton: {
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    datePickerWrapper: {
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: 10,
    },
    datePickerText: {
        flex: 1,
        fontSize: 16,
        color: theme.colors.text,
    },
    filterScroll: {
        maxHeight: 50,
        marginTop: 10,
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
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        gap: 8,
    },
    actionBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
