import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    Image,
    Platform,
    Dimensions,
    StatusBar,
    Animated as RNAnimated,
    ScrollView,
    FlatList,
    Modal,
    Vibration,
    RefreshControl,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import MapboxGL from '@rnmapbox/maps';
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { useThemeColors, useIsDarkMode } from '@/hooks/useThemeColors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useUser } from '@/context/UserContext';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { sabeelGuideGroupsApi, freelanceGroupsApi, reservationApi, trackingApi, notificationsApi } from '@/services/api';
import { createMessagingSocket } from '@/services/messagingSocket';
import { getUserAvatarUrl } from '@/services/media';
import { messagingApi } from '@/services/api';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { notificationService } from '@/services/notificationService';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Set Mapbox Access Token
const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
if (mapboxToken) {
    MapboxGL.setAccessToken(mapboxToken);
} else {
    console.warn('Mapbox access token is not set. Please set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN in your .env file.');
}

const { width, height } = Dimensions.get('window');

const inMemoryTrackingCache: Record<string, { groups: any[]; pilgrims: any[]; ts: number } | undefined> = {};

const ThreeDots = ({ color }: { color: string }) => {
    const a1 = useRef(new RNAnimated.Value(0)).current;
    const a2 = useRef(new RNAnimated.Value(0)).current;
    const a3 = useRef(new RNAnimated.Value(0)).current;

    useEffect(() => {
        const make = (v: RNAnimated.Value, delay: number) =>
            RNAnimated.loop(
                RNAnimated.sequence([
                    RNAnimated.delay(delay),
                    RNAnimated.timing(v, { toValue: 1, duration: 260, useNativeDriver: true }),
                    RNAnimated.timing(v, { toValue: 0, duration: 260, useNativeDriver: true }),
                    RNAnimated.delay(360),
                ]),
            );

        const l1 = make(a1, 0);
        const l2 = make(a2, 120);
        const l3 = make(a3, 240);
        l1.start();
        l2.start();
        l3.start();
        return () => {
            l1.stop();
            l2.stop();
            l3.stop();
        };
    }, [a1, a2, a3]);

    const dot = (v: RNAnimated.Value) => ({
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
        transform: [
            {
                translateY: v.interpolate({ inputRange: [0, 1], outputRange: [2, -3] }),
            },
        ],
    });

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <RNAnimated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, dot(a1)]} />
            <RNAnimated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, dot(a2)]} />
            <RNAnimated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, dot(a3)]} />
        </View>
    );
};

type BackendGroup = {
    id: string;
    name: string;
    departureDate?: string | Date | null;
    pack?: any;
    pilgrims?: Array<{ id: string; firstName?: string; lastName?: string; photo?: string }>;
};

type BackendPilgrimPosition = {
    id: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    name?: string;
    photo?: string;
    groupId?: string | null;
    uniqueIdentifier?: string;
    latitude?: any;
    longitude?: any;
    updatedAt?: any;
};

const TrackingScreen = () => {
    const colors = useThemeColors() as any;
    const isDarkMode = useIsDarkMode();
    const navigation = useNavigation();
    const router = useRouter();
    const params = useLocalSearchParams();
    const { userMode, user } = useUser();

    const [sosModalVisible, setSosModalVisible] = useState(false);
    const [sosAlerts, setSosAlerts] = useState<any[]>([]);

    // SOS workflow status per pilgrim (active/red, in_progress/orange, resolved/green)
    const [sosStatusByPilgrimId, setSosStatusByPilgrimId] = useState<Record<string, 'active' | 'in_progress' | 'resolved'>>({});

    const [groups, setGroups] = useState<any[]>([]);
    const [pilgrims, setPilgrims] = useState<any[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const positionsByPilgrimIdRef = useRef<Record<string, { latitude: number; longitude: number; updatedAt?: string }>>({});

    const [forceUpdate, setForceUpdate] = useState(0);

    const DEFAULT_AVATAR = 'https://randomuser.me/api/portraits/men/1.jpg';
    const DEFAULT_CENTER: [number, number] = [39.8262, 21.4225];

    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [selectedPilgrim, setSelectedPilgrim] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedVoyages, setExpandedVoyages] = useState<{ [key: string]: boolean }>({ 'Umrah #124': true });
    const [scannedPilgrims, setScannedPilgrims] = useState<string[]>([]);
    const [userLocation, setUserLocation] = useState<number[] | null>(null);
    const [routeData, setRouteData] = useState<any>(null);
    const [navigationGoal, setNavigationGoal] = useState<any>(null);
    const [routeInfo, setRouteInfo] = useState<{ distance: string, duration: string } | null>(null);

    const socketRef = useRef<any>(null);

    const alarmSoundRef = useRef<Audio.Sound | null>(null);
    const navCueSoundRef = useRef<Audio.Sound | null>(null);
    const [sosBlinkOn, setSosBlinkOn] = useState(false);
    const sosActivePilgrimIdsRef = useRef<Record<string, number>>({});
    const sosPulseAnim = useRef(new RNAnimated.Value(0)).current;
    const sosPulseLoopRef = useRef<RNAnimated.CompositeAnimation | null>(null);

    const lastNavAnnounceBucketRef = useRef<string>('');
    const lastNavAnnounceAtRef = useRef<number>(0);

    const getLatestPilgrimPosition = useCallback(
        (pilgrimId: string) => {
            const pos = positionsByPilgrimIdRef.current?.[String(pilgrimId)];
            const lat = pos?.latitude !== null && pos?.latitude !== undefined ? Number(pos.latitude) : NaN;
            const lng = pos?.longitude !== null && pos?.longitude !== undefined ? Number(pos.longitude) : NaN;
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            return { coords: [lng, lat] as any, updatedAt: pos?.updatedAt ? String(pos.updatedAt) : undefined };
        },
        [],
    );

    const haversineMeters = useCallback((start: number[], end: number[]) => {
        try {
            const R = 6371000;
            const lat1 = (start[1] * Math.PI) / 180;
            const lat2 = (end[1] * Math.PI) / 180;
            const dLat = ((end[1] - start[1]) * Math.PI) / 180;
            const dLon = ((end[0] - start[0]) * Math.PI) / 180;
            const sinDLat = Math.sin(dLat / 2);
            const sinDLon = Math.sin(dLon / 2);
            const aa = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
            const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
            return R * c;
        } catch (e) {
            return Infinity;
        }
    }, []);

    const getSosVisual = useCallback(
        (pilgrimId: string): { isSos: boolean; status: 'active' | 'in_progress' | 'resolved'; colorOn: string; colorOff: string } => {
            const pid = String(pilgrimId || '').trim();
            const status = sosStatusByPilgrimId[pid] || 'active';
            const isSos = Boolean(sosActivePilgrimIdsRef.current[pid]);
            if (!isSos) {
                return { isSos: false, status: 'active', colorOn: '#DC2626', colorOff: '#991B1B' };
            }

            if (status === 'resolved') {
                return { isSos: true, status, colorOn: '#16A34A', colorOff: '#15803D' };
            }
            if (status === 'in_progress') {
                return { isSos: true, status, colorOn: '#FDBA74', colorOff: '#FB923C' };
            }
            return { isSos: true, status: 'active', colorOn: '#DC2626', colorOff: '#991B1B' };
        },
        [sosStatusByPilgrimId],
    );

    const stopAlarmSound = useCallback(async () => {
        try {
            if (alarmSoundRef.current) {
                await alarmSoundRef.current.stopAsync().catch((e) => {});
                await alarmSoundRef.current.unloadAsync().catch((e) => {});
                alarmSoundRef.current = null;
            }
        } catch (e) {
            // ignore
        }
    }, []);

    const stopNavCueSound = useCallback(async () => {
        try {
            if (navCueSoundRef.current) {
                await navCueSoundRef.current.stopAsync().catch((e) => {});
                await navCueSoundRef.current.unloadAsync().catch((e) => {});
                navCueSoundRef.current = null;
            }
        } catch (e) {
            // ignore
        }
    }, []);

    const playNavCueSound = useCallback(async () => {
        try {
            await stopNavCueSound();
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });
            const { sound } = await Audio.Sound.createAsync(
                require('../../../assets/sounds/alarm.mp3'),
                { shouldPlay: true, isLooping: false, volume: 0.25 },
            );
            navCueSoundRef.current = sound;

            // Stop quickly to behave like a short cue.
            setTimeout(() => {
                stopNavCueSound();
            }, 900);
        } catch (e) {
            // ignore
        }
    }, [stopNavCueSound]);

    const stopNavigationVoice = useCallback(() => {
        try {
            Speech.stop();
        } catch (e) {
            // ignore
        }
    }, []);

    const speakNavigation = useCallback((text: string) => {
        try {
            if (!text) return;
            Speech.stop();
            Speech.speak(text, {
                language: 'fr-FR',
                rate: 1.0,
                pitch: 1.0,
            });
        } catch (e) {
            // ignore
        }
    }, []);

    const formatDistanceFr = useCallback((meters: number) => {
        if (!Number.isFinite(meters)) return '';
        if (meters < 1000) return `${Math.round(meters)} mètres`;
        const km = meters / 1000;
        if (km < 10) return `${km.toFixed(1)} kilomètres`;
        return `${Math.round(km)} kilomètres`;
    }, []);

    const computeNavAnnounceBucket = useCallback((meters: number) => {
        if (!Number.isFinite(meters)) return '';
        if (meters <= 30) return 'arrive';
        if (meters <= 50) return '50m';
        if (meters <= 200) return '200m';
        if (meters <= 500) return '500m';
        if (meters <= 1000) return '1km';
        return 'far';
    }, []);

    useEffect(() => {
        return () => {
            stopNavigationVoice();
            stopNavCueSound();
        };
    }, [stopNavigationVoice, stopNavCueSound]);

    const playAlarmSound = useCallback(async () => {
        try {
            await stopAlarmSound();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                staysActiveInBackground: true,
                shouldDuckAndroid: false,
                playThroughEarpieceAndroid: false,
            });
            const { sound } = await Audio.Sound.createAsync(
                require('../../../assets/sounds/alarm.mp3'),
                { shouldPlay: true, isLooping: true },
            );
            alarmSoundRef.current = sound;
        } catch (e) {
            // ignore
        }
    }, [stopAlarmSound]);

    const refreshSosAlerts = useCallback(async () => {
        try {
            const uid = String((user as any)?.id || (user as any)?.userId || '').trim();
            if (!uid) return;

            const res = await notificationsApi.listMine({ limit: 50, offset: 0 });
            const alerts = Array.isArray(res?.data?.items)
                ? res.data.items
                : (Array.isArray(res?.data) ? res.data : (Array.isArray((res as any)?.data?.notifications) ? (res as any).data.notifications : []));

            const onlySos = (alerts || []).filter((a: any) => {
                const raw =
                    (a?.data?.type !== undefined ? String(a.data.type) : '') ||
                    (a?.type !== undefined ? String(a.type) : '') ||
                    (a?.notificationType !== undefined ? String(a.notificationType) : '');
                const t = raw.toLowerCase();
                return t === 'sos' || t === 'sos_alert' || t.includes('sos');
            });
            setSosAlerts(onlySos);

            // Sync SOS visual/status state from fetched alerts so existing (preloaded) SOS are animated/vibrating
            const nextStatus: Record<string, 'active' | 'in_progress' | 'resolved'> = {};
            const now = Date.now();
            for (const a of onlySos || []) {
                if (!a || a?.readAt) continue;
                const data = (a as any)?.data || {};
                const pidRaw = data?.pilgrim?.id || data?.pilgrimUserId || '';
                const pid = String(pidRaw || '').trim();
                if (!pid) continue;

                const raw = String(data?.sosStatus || '').trim().toLowerCase();
                const status: 'active' | 'in_progress' | 'resolved' =
                    raw === 'in_progress' || raw === 'inprogress' || raw === 'en_cours' || raw === 'encours'
                        ? 'in_progress'
                        : raw === 'resolved'
                            ? 'resolved'
                            : 'active';

                nextStatus[pid] = status;

                // Keep blinking marker for all active SOS alerts
                sosActivePilgrimIdsRef.current[pid] = now;
            }
            if (Object.keys(nextStatus).length) {
                setSosStatusByPilgrimId((prev) => ({ ...prev, ...nextStatus }));
            }
        } catch (e) {
            // ignore
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            refreshSosAlerts();
        }, [refreshSosAlerts]),
    );

    // Blink loop + cleanup expired SOS (2 minutes)
    useEffect(() => {
        const id = setInterval(() => {
            setSosBlinkOn((v) => !v);
            const now = Date.now();
            const map = sosActivePilgrimIdsRef.current;
            for (const k of Object.keys(map)) {
                if (now - map[k] > 2 * 60 * 1000) {
                    delete map[k];
                }
            }
        }, 600);
        return () => clearInterval(id);
    }, []);

    const stopSosVibration = useCallback(() => {
        try {
            if (sosVibrationIntervalRef.current) {
                clearInterval(sosVibrationIntervalRef.current);
                sosVibrationIntervalRef.current = null;
            }
        } catch (e) {
            // ignore
        }
    }, []);

    const startSosVibration = useCallback(() => {
        try {
            if (sosVibrationIntervalRef.current) return;
            // Vibrate immediately, then repeat until SOS is no longer active.
            try {
                Vibration.vibrate([0, 800, 300, 800, 300, 800]);
            } catch (e) {
                // ignore
            }
            sosVibrationIntervalRef.current = setInterval(() => {
                try {
                    Vibration.vibrate([0, 800, 300, 800, 300, 800]);
                } catch (e) {
                    // ignore
                }
            }, 3500);
        } catch (e) {
            // ignore
        }
    }, []);

    const stopSosPulse = useCallback(() => {
        try {
            sosPulseAnim.stopAnimation();
            sosPulseAnim.setValue(0);
        } catch (e) {
            // ignore
        }
    }, [sosPulseAnim]);

    const startSosPulse = useCallback(() => {
        try {
            sosPulseAnim.stopAnimation();
            sosPulseAnim.setValue(0);
            RNAnimated.loop(
                RNAnimated.sequence([
                    RNAnimated.timing(sosPulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
                    RNAnimated.timing(sosPulseAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
                ]),
            ).start();
        } catch (e) {
            // ignore
        }
    }, [sosPulseAnim]);

    // Realtime SOS handling: vibrate + alarm + refresh + blink marker
    useEffect(() => {
        const unsubscribe = notificationService.addListener((n: any) => {
            const type = String(n?.type || '').toLowerCase();
            if (type === 'sos_status') {
                const pid = String((n as any)?.data?.pilgrimUserId || '').trim();
                const statusRaw = String((n as any)?.data?.status || '').trim().toLowerCase();
                if (!pid) return;

                const status: 'active' | 'in_progress' | 'resolved' =
                    statusRaw === 'in_progress' || statusRaw === 'inprogress' || statusRaw === 'en_cours' || statusRaw === 'encours'
                        ? 'in_progress'
                        : statusRaw === 'resolved'
                            ? 'resolved'
                            : 'active';

                setSosStatusByPilgrimId((prev) => ({ ...prev, [pid]: status }));

                // Keep marker blinking even when resolved (green) for a short period (cleanup loop will remove later)
                sosActivePilgrimIdsRef.current[pid] = Date.now();

                if (status === 'active') {
                    startSosVibration();
                    startSosPulse();
                } else {
                    stopSosVibration();
                    stopAlarmSound();
                }

                refreshSosAlerts();
                return;
            }

            if (type !== 'sos' && type !== 'sos_alert') return;

            const pilgrimId = String((n as any)?.data?.pilgrim?.id || (n as any)?.pilgrim?.id || (n as any)?.data?.pilgrimUserId || '').trim();
            if (pilgrimId) {
                sosActivePilgrimIdsRef.current[pilgrimId] = Date.now();
                setSosStatusByPilgrimId((prev) => ({ ...prev, [pilgrimId]: 'active' }));
            }

            // Strong haptic + vibration pattern
            try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } catch (e) {}
            try {
                Vibration.vibrate([0, 800, 300, 800, 300, 800]);
            } catch (e) {}

            // Start continuous vibration + pulse immediately for active SOS
            startSosVibration();
            startSosPulse();

            playAlarmSound();
            refreshSosAlerts();
            setSosModalVisible(true);
            setSelectedPilgrim(pilgrimId);
            bottomSheetRef.current?.snapToIndex(0);
        });

        return () => {
            unsubscribe();
        };
    }, [playAlarmSound, refreshSosAlerts, setSelectedPilgrim, startSosPulse, startSosVibration, stopAlarmSound, stopSosVibration]);

    // Keep vibration + pulse animation running while there is at least one active SOS alert
    useEffect(() => {
        const hasActive =
            Array.isArray(sosAlerts) &&
            sosAlerts.some((a: any) => {
                if (a?.readAt) return false;
                const pid = String(a?.data?.pilgrim?.id || a?.data?.pilgrimUserId || '').trim();
                const stRaw = String(a?.data?.sosStatus || '').trim().toLowerCase();
                const st: 'active' | 'in_progress' | 'resolved' =
                    stRaw === 'in_progress' || stRaw === 'inprogress' || stRaw === 'en_cours' || stRaw === 'encours'
                        ? 'in_progress'
                        : stRaw === 'resolved'
                            ? 'resolved'
                            : 'active';

                // Only vibrate for active SOS (not for in_progress)
                if (pid && sosStatusByPilgrimId[pid]) {
                    return sosStatusByPilgrimId[pid] === 'active';
                }
                return st === 'active';
            });
        if (hasActive) {
            startSosVibration();
            startSosPulse();
        } else {
            stopSosVibration();
            stopSosPulse();
            stopAlarmSound();
        }

        return () => {
            // no-op
        };
    }, [sosAlerts, sosStatusByPilgrimId, startSosVibration, stopSosVibration, startSosPulse, stopSosPulse, stopAlarmSound]);

    const updateSosStatusForNotification = useCallback(
        async (notificationId: string, pilgrimId: string, status: 'active' | 'in_progress' | 'resolved') => {
            if (!notificationId || !pilgrimId) return;
            try {
                try {
                    await notificationsApi.updateSosStatus(String(notificationId), status);
                } catch (e) {
                    // ignore
                }
                setSosStatusByPilgrimId((prev) => ({ ...prev, [String(pilgrimId)]: status }));

                // Always keep marker blinking for some time (cleanup loop will remove)
                sosActivePilgrimIdsRef.current[String(pilgrimId)] = Date.now();

                if (status !== 'active') {
                    stopSosVibration();
                    stopAlarmSound();
                }

                // Re-fetch to sync UI list/readAt/state
                refreshSosAlerts();
            } catch (e) {
                // ignore
            }
        },
        [refreshSosAlerts, stopAlarmSound, stopSosVibration],
    );

    // Auto-resolve SOS when navigating and arriving near the pilgrim
    useEffect(() => {
        try {
            if (!navigationGoal?.id) return;
            const pid = String(navigationGoal.id);
            if (sosStatusByPilgrimId[pid] !== 'in_progress') return;
            if (!userLocation || !Array.isArray(userLocation)) return;

            const live = getLatestPilgrimPosition(pid);
            const target = (live?.coords || navigationGoal?.coords) as any;
            if (!Array.isArray(target) || !Number.isFinite(target[0]) || !Number.isFinite(target[1])) return;

            const d = haversineMeters(userLocation as any, target as any);
            if (!Number.isFinite(d) || d > 30) return;

            const n = (sosAlerts || []).find((a: any) => {
                const apid = String(a?.data?.pilgrim?.id || a?.data?.pilgrimUserId || '').trim();
                return apid && apid === pid && !a?.readAt;
            });
            if (n?.id) {
                updateSosStatusForNotification(String(n.id), pid, 'resolved');
            }
        } catch (e) {
            // ignore
        }
    }, [navigationGoal, userLocation, sosStatusByPilgrimId, sosAlerts, getLatestPilgrimPosition, haversineMeters, updateSosStatusForNotification]);

    useEffect(() => {
        return () => {
            stopAlarmSound();
        };
    }, [stopAlarmSound]);

    useEffect(() => {
        const focusLatRaw: any = (params as any)?.focusLat;
        const focusLngRaw: any = (params as any)?.focusLng;
        const focusPilgrimIdRaw: any = (params as any)?.focusPilgrimId;

        const lat = focusLatRaw !== undefined && focusLatRaw !== null ? Number(focusLatRaw) : NaN;
        const lng = focusLngRaw !== undefined && focusLngRaw !== null ? Number(focusLngRaw) : NaN;
        const focusPilgrimId = focusPilgrimIdRaw ? String(focusPilgrimIdRaw) : '';

        if (Number.isFinite(lat) && Number.isFinite(lng) && cameraRef.current) {
            setTimeout(() => {
                try {
                    cameraRef.current?.setCamera({
                        centerCoordinate: [lng, lat],
                        zoomLevel: 15,
                        animationDuration: 900,
                    } as any);
                } catch (e) {
                    // ignore
                }
            }, 350);
        }

        if (focusPilgrimId) {
            setSelectedPilgrim(focusPilgrimId);
            bottomSheetRef.current?.snapToIndex(0);
        }
    }, [params]);

    // Location Permission Request
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Permission to access location was denied');
                return;
            }
        })();
    }, []);

    // QR Scanner States
    const [isScanning, setIsScanning] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    const bottomSheetRef = useRef<BottomSheet>(null);
    const cameraRef = useRef<any>(null);
    const routeSourceRef = useRef<any>(null);
    const slideAnim = useRef(new RNAnimated.Value(300)).current;
    const didInitialFitRef = useRef(false);

    const snapPoints = useMemo(() => ['15%', '45%', '85%'], []);

    const computeGroupFallbackCoordinate = useCallback(
        (groupId: string | null | undefined) => {
            if (!groupId) return null;
            const groupPilgrims = pilgrims.filter((p) => String(p.group) === String(groupId));
            const coords = groupPilgrims
                .map((p) => p?.coords)
                .filter((c) => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]));
            if (coords.length === 0) return null;
            const sum = coords.reduce(
                (acc: any, c: any) => ({ lng: acc.lng + c[0], lat: acc.lat + c[1] }),
                { lng: 0, lat: 0 },
            );
            return [sum.lng / coords.length, sum.lat / coords.length];
        },
        [pilgrims],
    );

    // Initial camera fit to show all available positions (only once)
    useEffect(() => {
        if (didInitialFitRef.current) return;
        if (!cameraRef.current) return;

        const groupCoords = groups
            .map((g: any) => g?.coords)
            .filter((c: any) => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]));

        const pilgrimCoords = pilgrims
            .map((p: any) => p?.coords)
            .filter((c: any) => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]));

        const allCoords = groupCoords.length ? groupCoords : pilgrimCoords;
        if (allCoords.length === 0) return;

        const minLng = Math.min(...allCoords.map((c: any) => c[0]));
        const minLat = Math.min(...allCoords.map((c: any) => c[1]));
        const maxLng = Math.max(...allCoords.map((c: any) => c[0]));
        const maxLat = Math.max(...allCoords.map((c: any) => c[1]));

        const lngSpan = Math.abs(maxLng - minLng);
        const latSpan = Math.abs(maxLat - minLat);
        const midLng = (minLng + maxLng) / 2;
        const midLat = (minLat + maxLat) / 2;

        didInitialFitRef.current = true;
        setTimeout(() => {
            // If all pilgrims are very close (same city), don't zoom too much.
            // Instead, use a country-level zoom so the user sees the surrounding area.
            if (lngSpan < 0.25 && latSpan < 0.25) {
                cameraRef.current?.setCamera({
                    centerCoordinate: [midLng, midLat],
                    zoomLevel: 5.5,
                    animationDuration: 1200,
                } as any);
                return;
            }

            cameraRef.current?.fitBounds(
                [maxLng, maxLat],
                [minLng, minLat],
                [100, 80, 100, 80],
                1200,
            );
        }, 350);
    }, [groups, pilgrims]);

    // Effect to hide tab bar on this page
    useEffect(() => {
        navigation.setOptions({
            tabBarStyle: { display: 'none' }
        });

        // Return tab bar to normal when leaving
        return () => {
            navigation.setOptions({
                tabBarStyle: undefined
            });
        };
    }, [navigation]);

    // Animate Popup Selection and handle BottomSheet visibility
    useEffect(() => {
        const shouldShow = !!selectedGroup || !!selectedPilgrim;
        if (shouldShow) {
            RNAnimated.spring(slideAnim, {
                toValue: 0,
                delay: 200,
                useNativeDriver: true,
                damping: 15,
                stiffness: 100,
            }).start();
        } else {
            slideAnim.setValue(300);
            // Re-open bottom sheet if we closed the selection
            bottomSheetRef.current?.snapToIndex(1);
        }
    }, [selectedGroup, selectedPilgrim]);

    const roleKey = useMemo(() => {
        const isAgencyRole = userMode === 'agency' || String((user as any)?.activeRole || '') === 'agency';
        return isAgencyRole ? 'agency' : 'freelance';
    }, [userMode, (user as any)?.activeRole]);

    const loadTrackingData = useCallback((opts?: { force?: boolean; showLoader?: boolean }) => {
        const COLORS = ['#FF5722', '#2196F3', '#9C27B0', '#4CAF50', '#FFC107', '#E91E63'];
        let mounted = true;

        const cacheKey = `tracking_${roleKey}`;
        const cached = inMemoryTrackingCache[cacheKey];

        // Show cached data instantly (no loader), then refresh in background.
        if (!opts?.force && cached && Array.isArray(cached.groups) && Array.isArray(cached.pilgrims)) {
            setGroups(cached.groups);
            setPilgrims(cached.pilgrims);
            setInitialLoading(false);
        }

        if (opts?.showLoader && (!cached || !Array.isArray(cached.pilgrims) || cached.pilgrims.length === 0)) {
            setInitialLoading(true);
        }

        // Only hard-reset if forcing a refresh AND we want a loader.
        if (opts?.force && opts?.showLoader) {
            setGroups([]);
            setPilgrims([]);
            positionsByPilgrimIdRef.current = {};
        }

        const load = async () => {
            try {
                const posRes = await trackingApi.getMyPilgrimsPositions();

                const rawPilgrims: BackendPilgrimPosition[] = Array.isArray(posRes.data?.pilgrims)
                    ? posRes.data.pilgrims
                    : (Array.isArray(posRes.data) ? posRes.data : []);

                const isFreelance = userMode === 'guide' && String((user as any)?.activeRole || '') === 'freelance';

                if (isFreelance) {
                    const reservationsRes = await reservationApi.getGuideReservations();
                    const reservationsData = (reservationsRes as any)?.data;
                    const reservationsList: any[] = Array.isArray(reservationsData?.reservations)
                        ? reservationsData.reservations
                        : (Array.isArray(reservationsData) ? reservationsData : []);

                    const acceptedReservations = reservationsList.filter(
                        (r: any) => String(r?.status || '').toLowerCase() === 'accepted',
                    );

                    const pilgrimProfileById = new Map<string, { id: string; name: string; photo: string; uniqueIdentifier?: string }>();
                    acceptedReservations.forEach((r: any) => {
                        const pilgrimId = String(r?.pilgrimUserId || r?.pilgrim?.id || r?.user?.id || '').trim();
                        if (!pilgrimId) return;
                        const summaryFullName = `${r?.pilgrimFirstName || ''} ${r?.pilgrimLastName || ''}`.trim();
                        const fullName =
                            String(r?.pilgrimName || '').trim() ||
                            summaryFullName ||
                            'Pèlerin';
                        const photoUrl = String(r?.pilgrimImageUrl || '').trim();
                        pilgrimProfileById.set(pilgrimId, {
                            id: pilgrimId,
                            name: fullName,
                            photo: photoUrl || '',
                            uniqueIdentifier: r?.uniqueIdentifier ? String(r.uniqueIdentifier) : undefined,
                        });
                    });

                    const acceptedPilgrimIds = Array.from(
                        new Set(
                            acceptedReservations
                                .map((r: any) => String(r?.pilgrimUserId || r?.pilgrim?.id || r?.user?.id || ''))
                                .filter((id: string) => id),
                        ),
                    );

                    const groupsRes = await freelanceGroupsApi.getMine();
                    const groupsData = (groupsRes as any)?.data;
                    const apiGroups = Array.isArray(groupsData?.groups) ? groupsData.groups : [];

                    const groupDetails = await Promise.all(
                        apiGroups.map(async (g: any) => {
                            try {
                                const detail = await freelanceGroupsApi.getById(String(g.id));
                                return detail?.data?.group || null;
                            } catch (e) {
                                return null;
                            }
                        }),
                    );

                    const groupIdToMembers = new Map<string, any[]>();
                    const memberIdsSet = new Set<string>();
                    groupDetails.filter(Boolean).forEach((gd: any) => {
                        const gid = String(gd?.id || '');
                        if (!gid) return;
                        const members = Array.isArray(gd?.pilgrims) ? gd.pilgrims : [];
                        groupIdToMembers.set(gid, members);
                        members.forEach((p: any) => {
                            if (p?.id) memberIdsSet.add(String(p.id));
                        });
                    });

                    const soloIds = acceptedPilgrimIds.filter((id) => !memberIdsSet.has(String(id)));

                    const filteredRawPilgrims = rawPilgrims.filter((p) => acceptedPilgrimIds.includes(String(p?.id)));

                    // Map positions
                    positionsByPilgrimIdRef.current = {};
                    filteredRawPilgrims.forEach((p: any) => {
                        const lat = p?.latitude !== null && p?.latitude !== undefined ? Number(p.latitude) : NaN;
                        const lng = p?.longitude !== null && p?.longitude !== undefined ? Number(p.longitude) : NaN;
                        if (Number.isFinite(lat) && Number.isFinite(lng)) {
                            positionsByPilgrimIdRef.current[String(p.id)] = {
                                latitude: lat,
                                longitude: lng,
                                updatedAt: p?.updatedAt ? String(p.updatedAt) : undefined,
                            };
                        }
                    });

                    const mappedGroups = apiGroups.map((g: any, idx: number) => {
                        const gid = String(g?.id || '');
                        const members = groupIdToMembers.get(gid) || [];
                        const firstMemberWithPos = members
                            .map((m: any) => ({ id: String(m?.id || ''), pos: getLatestPilgrimPosition(String(m?.id || '')) }))
                            .find((x: any) => x?.pos?.coords);

                        return {
                            id: gid,
                            name: String(g?.name || 'Groupe'),
                            voyage: 'Groupes',
                            date: String(g?.period || ''),
                            color: COLORS[idx % COLORS.length],
                            pilgrimIds: members.map((m: any) => String(m?.id || '')).filter(Boolean),
                            coords: firstMemberWithPos?.pos?.coords || null,
                        };
                    }).filter((g: any) => g.id);

                    const mappedSoloGroup = {
                        id: 'solo',
                        name: 'Solo',
                        voyage: 'Solo',
                        date: '',
                        color: '#9E9E9E',
                        pilgrimIds: soloIds,
                        coords: null,
                    };

                    const pilgrimIdToGroup = new Map<string, string>();
                    mappedGroups.forEach((g: any) => {
                        (g.pilgrimIds || []).forEach((pid: string) => pilgrimIdToGroup.set(String(pid), String(g.id)));
                    });
                    soloIds.forEach((pid) => pilgrimIdToGroup.set(String(pid), 'solo'));

                    const mappedPilgrims = acceptedPilgrimIds.map((pid) => {
                        const posRow = filteredRawPilgrims.find((p: any) => String(p?.id) === String(pid));
                        const profile = pilgrimProfileById.get(String(pid));
                        const apiFullName = `${posRow?.firstName || ''} ${posRow?.lastName || ''}`.trim();
                        const name = String(profile?.name || '').trim() || apiFullName || 'Pèlerin';
                        const group = pilgrimIdToGroup.get(String(pid)) || '';
                        const latest = getLatestPilgrimPosition(String(pid));
                        return {
                            id: String(pid),
                            name,
                            group,
                            status: latest?.coords ? 'Active' : 'Inactive',
                            photo:
                                String(profile?.photo || '').trim() ||
                                getUserAvatarUrl(posRow?.photo) ||
                                '',
                            coords: latest?.coords || null,
                            hasPosition: Boolean(latest?.coords),
                            uniqueIdentifier: posRow?.uniqueIdentifier || profile?.uniqueIdentifier || '',
                        };
                    });

                    if (!mounted) return;
                    setGroups([...mappedGroups, mappedSoloGroup]);
                    setPilgrims(mappedPilgrims);
                    inMemoryTrackingCache[cacheKey] = { groups: [...mappedGroups, mappedSoloGroup], pilgrims: mappedPilgrims, ts: Date.now() };
                    setForceUpdate((x) => x + 1);
                    setInitialLoading(false);
                    return;
                }

                let backendGroups: BackendGroup[] = [];
                try {
                    const groupsRes = await sabeelGuideGroupsApi.getMyGroups();
                    backendGroups = Array.isArray(groupsRes.data?.groups)
                        ? groupsRes.data.groups
                        : (Array.isArray(groupsRes.data) ? groupsRes.data : []);
                } catch (e) {
                    // Best-effort retry once (Network Error / transient)
                    try {
                        await new Promise((r) => setTimeout(r, 600));
                        const groupsRes2 = await sabeelGuideGroupsApi.getMyGroups();
                        backendGroups = Array.isArray(groupsRes2.data?.groups)
                            ? groupsRes2.data.groups
                            : (Array.isArray(groupsRes2.data) ? groupsRes2.data : []);
                    } catch (e2) {
                        backendGroups = [];
                    }
                }

                // Fallback: if groups endpoint fails, derive groups from pilgrims positions
                if (!backendGroups.length && rawPilgrims.length) {
                    const uniqueGroupIds = Array.from(
                        new Set(
                            rawPilgrims
                                .map((p) => (p?.groupId ? String(p.groupId) : ''))
                                .filter((gid) => gid),
                        ),
                    );
                    backendGroups = uniqueGroupIds.map((gid) => ({
                        id: gid,
                        name: `Groupe ${gid}`,
                        departureDate: null,
                        pack: null,
                        pilgrims: rawPilgrims
                            .filter((p) => String(p?.groupId || '') === String(gid))
                            .map((p) => ({
                                id: String(p.id),
                                firstName: p.firstName,
                                lastName: p.lastName,
                                photo: p.photo,
                            })),
                    }));
                }

                const nextGroups = backendGroups.map((g, idx) => ({
                    id: String(g.id),
                    name: g.name,
                    voyage: g?.pack?.title || g?.pack?.name || 'Mes groupes',
                    date: g?.departureDate ? String(g.departureDate).slice(0, 10) : '',
                    color: COLORS[idx % COLORS.length],
                    pilgrimIds: Array.isArray(g.pilgrims) ? g.pilgrims.map((p) => String(p.id)) : [],
                }));

                // If still empty, create a default bucket so UI does not stay empty.
                if (!nextGroups.length && rawPilgrims.length) {
                    nextGroups.push({
                        id: 'unknown',
                        name: 'Mes pèlerins',
                        voyage: 'Mes groupes',
                        date: '',
                        color: COLORS[0],
                        pilgrimIds: rawPilgrims.map((p) => String(p.id)),
                    });
                }

                const mappedPilgrims = rawPilgrims.map((p: any) => {
                    const lat = p?.latitude !== null && p?.latitude !== undefined ? Number(p.latitude) : NaN;
                    const lng = p?.longitude !== null && p?.longitude !== undefined ? Number(p.longitude) : NaN;
                    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
                    const shareLocation = p?.shareLocation === false ? false : true;
                    const hasPosition = shareLocation && hasCoords;
                    const groupId = String(p?.groupId || '');

                    const firstName =
                        (p?.firstName ?? p?.firstname ?? p?.first_name ?? p?.first_name_ar ?? '') as any;
                    const lastName =
                        (p?.lastName ?? p?.lastname ?? p?.last_name ?? p?.last_name_ar ?? '') as any;
                    const nameFromParts = `${String(firstName || '')} ${String(lastName || '')}`.trim();
                    const nameFromFull = String(p?.fullName ?? p?.full_name ?? p?.name ?? '').trim();
                    const name = nameFromParts || nameFromFull || 'Pèlerin';
                    return {
                        id: String(p.id),
                        name,
                        photo: getUserAvatarUrl(p.photo) || 'https://randomuser.me/api/portraits/men/1.jpg',
                        group: groupId,
                        coords: hasCoords ? ([lng, lat] as any) : null,
                        hasCoords,
                        hasPosition,
                        status: hasPosition ? 'Active' : 'Inactive',
                        updatedAt: p?.updatedAt ? String(p.updatedAt) : undefined,
                        uniqueIdentifier: p?.uniqueIdentifier ? String(p.uniqueIdentifier) : undefined,
                    };
                });

                // Compute group coordinates based on pilgrims real positions
                const groupsWithCoords = nextGroups.map((g: any) => {
                    const groupPilgrims = mappedPilgrims.filter((p: any) => {
                        if (!p?.hasCoords) return false;
                        const byGroupId = String(p.group) === String(g.id);
                        const byMembership = Array.isArray(g?.pilgrimIds)
                            ? g.pilgrimIds.map(String).includes(String(p.id))
                            : false;
                        return byGroupId || byMembership;
                    });
                    if (groupPilgrims.length > 0) {
                        const sumLng = groupPilgrims.reduce(
                            (acc: number, p: any) => acc + (p.coords ? p.coords[0] : 0),
                            0,
                        );
                        const sumLat = groupPilgrims.reduce(
                            (acc: number, p: any) => acc + (p.coords ? p.coords[1] : 0),
                            0,
                        );
                        return { ...g, coords: [sumLng / groupPilgrims.length, sumLat / groupPilgrims.length] };
                    }
                    return { ...g, coords: null };
                });

                if (!mounted) return;
                setGroups(groupsWithCoords);
                setPilgrims(mappedPilgrims);
                inMemoryTrackingCache[cacheKey] = { groups: groupsWithCoords, pilgrims: mappedPilgrims, ts: Date.now() };
                setInitialLoading(false);
            } catch (e) {
                console.log('[Tracking] load() failed', e);
                setInitialLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [userMode, (user as any)?.activeRole, getLatestPilgrimPosition, roleKey]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        try {
            loadTrackingData({ force: true, showLoader: false });
        } catch (e) {
            // ignore
        } finally {
            setTimeout(() => setRefreshing(false), 900);
        }
    }, [loadTrackingData]);

    // Refresh tracking lists (groups + solo + map) whenever the screen gains focus.
    useFocusEffect(
        useCallback(() => {
            // Allow initial camera fit/zoom to run again when opening the screen.
            didInitialFitRef.current = false;
            const cleanup = loadTrackingData();
            return () => {
                if (typeof cleanup === 'function') cleanup();
            };
        }, [loadTrackingData]),
    );

    useEffect(() => {
        if (refreshing) {
            bottomSheetRef.current?.snapToIndex(1);
        }
    }, [refreshing]);

    const toRad = useCallback((deg: number) => (deg * Math.PI) / 180, []);

    const distanceMeters = useCallback(
        (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
            const R = 6371000;
            const dLat = toRad(b.latitude - a.latitude);
            const dLon = toRad(b.longitude - a.longitude);
            const lat1 = toRad(a.latitude);
            const lat2 = toRad(b.latitude);
            const x =
                Math.sin(dLat / 2) ** 2 +
                Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
            return 2 * R * Math.asin(Math.sqrt(x));
        },
        [toRad],
    );

    useEffect(() => {
        let mounted = true;

        const connect = async () => {
            try {
                const socket = await createMessagingSocket();
                socketRef.current = socket;

                socket.on('pilgrim_position_updated', (payload: any) => {
                    if (!mounted) return;
                    const pilgrimUserId = payload?.pilgrimUserId ? String(payload.pilgrimUserId) : '';
                    const lat = payload?.latitude !== null && payload?.latitude !== undefined ? Number(payload.latitude) : NaN;
                    const lng = payload?.longitude !== null && payload?.longitude !== undefined ? Number(payload.longitude) : NaN;
                    const groupId = payload?.groupId ? String(payload.groupId) : '';
                    if (!pilgrimUserId) return;

                    // If the pilgrim disables sharing/offline and backend sends null/invalid coords,
                    // clear the live position so marker becomes gray and uses group fallback.
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                        delete positionsByPilgrimIdRef.current[pilgrimUserId];
                        setPilgrims((prev) =>
                            prev.map((p) =>
                                String(p.id) === pilgrimUserId
                                    ? { ...p, hasPosition: false, status: 'Inactive' }
                                    : p,
                            ),
                        );
                        return;
                    }

                    positionsByPilgrimIdRef.current[pilgrimUserId] = {
                        latitude: lat,
                        longitude: lng,
                        updatedAt: payload?.updatedAt ? String(payload.updatedAt) : undefined,
                    };

                    setPilgrims((prev) => {
                        const exists = prev.some((p) => String(p.id) === pilgrimUserId);
                        if (!exists) {
                            return [
                                {
                                    id: pilgrimUserId,
                                    name: payload?.pilgrimName ? String(payload.pilgrimName) : 'Pèlerin',
                                    photo: payload?.photo ? getUserAvatarUrl(String(payload.photo)) : DEFAULT_AVATAR,
                                    group: groupId,
                                    coords: [lng, lat],
                                    hasCoords: true,
                                    hasPosition: true,
                                    status: 'Active',
                                    updatedAt: payload?.updatedAt ? String(payload.updatedAt) : undefined,
                                    uniqueIdentifier: payload?.uniqueIdentifier ? String(payload.uniqueIdentifier) : undefined,
                                },
                                ...prev,
                            ];
                        }

                        return prev.map((p) => {
                            const isTarget = String(p.id) === pilgrimUserId;
                            if (!isTarget) return p;
                            const nextName = payload?.pilgrimName ? String(payload.pilgrimName) : p.name;
                            const nextPhoto = payload?.photo ? getUserAvatarUrl(String(payload.photo)) : p.photo;

                            const prevCoords =
                                Array.isArray(p.coords) &&
                                Number.isFinite(p.coords[0]) &&
                                Number.isFinite(p.coords[1])
                                    ? { latitude: Number(p.coords[1]), longitude: Number(p.coords[0]) }
                                    : null;
                            if (prevCoords) {
                                const d = distanceMeters(prevCoords, { latitude: lat, longitude: lng });
                                if (d < 6) {
                                    return {
                                        ...p,
                                        name: nextName,
                                        photo: nextPhoto,
                                        group: groupId || p.group,
                                        hasPosition: true,
                                        status: 'Active',
                                        updatedAt: payload?.updatedAt ? String(payload.updatedAt) : p.updatedAt,
                                    };
                                }
                            }

                            return {
                                ...p,
                                name: nextName,
                                photo: nextPhoto,
                                group: groupId || p.group,
                                coords: [lng, lat],
                                hasCoords: true,
                                hasPosition: true,
                                status: 'Active',
                                updatedAt: payload?.updatedAt ? String(payload.updatedAt) : p.updatedAt,
                            };
                        });
                    });
                });
            } catch (e) {
                // ignore
            }
        };

        connect();
        return () => {
            mounted = false;
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [distanceMeters]);

    const filteredData = useMemo(() => {
        if (userMode === 'agency') {
            // Agencies only care about structured groups
            let resultGroups = groups.filter(g => g.id !== 'G4');

            if (selectedGroup) {
                return resultGroups.filter(g => g.id === selectedGroup);
            }
            if (searchQuery) {
                resultGroups = resultGroups.filter(g =>
                    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    g.voyage.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }
            return resultGroups;
        } else {
            let result = groups.length
                ? pilgrims.filter(p => groups.some(g => String(g.id) === String(p.group)))
                : pilgrims;
            if (selectedGroup) {
                result = result.filter(p => String(p.group) === String(selectedGroup));
            }
            if (selectedPilgrim) {
                result = result.filter(p => p.id === selectedPilgrim);
            }
            if (searchQuery) {
                result = result.filter(p =>
                    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    groups.find(g => String(g.id) === String(p.group))?.name?.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }
            return result;
        }
    }, [groups, pilgrims, selectedGroup, selectedPilgrim, searchQuery, userMode]);

    const groupData = useMemo(() => {
        const voyages: { [key: string]: any[] } = {};
        const filteredGroupsList = Array.isArray(groups) ? groups : [];
        filteredGroupsList.forEach((group: any) => {
            const key = group.voyage || 'Mes groupes';
            if (!voyages[key]) voyages[key] = [];
            voyages[key].push(group);
        });
        return voyages;
    }, [groups]);

    const toggleVoyage = (voyage: string) => {
        setExpandedVoyages(prev => ({ ...prev, [voyage]: !prev[voyage] }));
    };

    const handlePilgrimSelect = (id: string | null) => {
        setSelectedPilgrim(id);
        if (id) {
            bottomSheetRef.current?.snapToIndex(0);
        }
    };

    // Voice navigation: announce remaining distance while navigating
    useEffect(() => {
        if (!navigationGoal?.id) return;
        if (!Array.isArray(userLocation)) return;

        const id = setInterval(() => {
            try {
                if (!navigationGoal?.id) return;
                if (!Array.isArray(userLocation)) return;

                const pid = String(navigationGoal.id);
                const live = getLatestPilgrimPosition(pid);
                const target = (live?.coords || navigationGoal?.coords) as any;
                if (!Array.isArray(target) || !Number.isFinite(target[0]) || !Number.isFinite(target[1])) return;

                const d = haversineMeters(userLocation as any, target as any);
                if (!Number.isFinite(d)) return;

                const bucket = computeNavAnnounceBucket(Number(d));
                const lastBucket = String(lastNavAnnounceBucketRef.current || '');
                const now = Date.now();

                // Avoid spamming: do not speak more often than every 10s
                if (now - (lastNavAnnounceAtRef.current || 0) < 10000) return;
                if (!bucket || bucket === 'far') return;
                if (bucket === lastBucket) return;

                const targetName = String(navigationGoal?.name || 'le pèlerin');
                if (bucket === 'arrive') {
                    speakNavigation(`Vous êtes arrivé chez ${targetName}.`);
                } else {
                    speakNavigation(`Il reste ${formatDistanceFr(Number(d))} pour arriver à ${targetName}.`);
                }

                lastNavAnnounceBucketRef.current = bucket;
                lastNavAnnounceAtRef.current = now;
            } catch (e) {
                // ignore
            }
        }, 3000);

        return () => clearInterval(id);
    }, [navigationGoal, userLocation, getLatestPilgrimPosition, haversineMeters, computeNavAnnounceBucket, speakNavigation, formatDistanceFr]);

    const handleGroupSelect = (id: string | null) => {
        setSelectedGroup(id);
        setSelectedPilgrim(null);
    };

    const selectedPilgrimData = useMemo(() => {
        return pilgrims.find(p => p.id === selectedPilgrim);
    }, [pilgrims, selectedPilgrim]);

    const startScanning = async () => {
        if (!permission) {
            await requestPermission();
        }
        if (permission?.granted || (await requestPermission()).granted) {
            setIsScanning(true);
            setScanned(false);
        }
    };

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        setScanned(true);
        setIsScanning(false);

        const scannedValue = String(data || '').trim();
        const matchedPilgrim = pilgrims.find((p: any) =>
            String(p.id) === scannedValue ||
            String(p.uniqueIdentifier || '').toLowerCase() === scannedValue.toLowerCase(),
        );
        if (matchedPilgrim) {
            setScannedPilgrims(prev => [...prev, matchedPilgrim.id]);
            setSelectedPilgrim(matchedPilgrim.id);
            alert(`Pilgrim ${matchedPilgrim.name} successfully located!`);
        } else {
            alert(`Scanned code: ${data}`);
        }
        setIsSearching(false);
    };

    const handleMessagePilgrim = (p: any) => {
        const run = async () => {
            try {
                const res = await messagingApi.getOrCreateGuidePilgrimConversation(String(p.id));
                const convId = res?.data?.conversation?.id ? String(res.data.conversation.id) : '';
                if (!convId) return;
                router.push({
                    pathname: '/discussion',
                    params: {
                        conversationId: convId,
                        name: String(p.name || 'Discussion'),
                        photo: String(p.photo || ''),
                    },
                } as any);
            } catch (e) {
                // ignore
            }
        };
        run();
    };

    const handleCallPilgrim = (p: any) => {
        const run = async () => {
            try {
                const res = await messagingApi.getOrCreateGuidePilgrimConversation(String(p.id));
                const convId = res?.data?.conversation?.id ? String(res.data.conversation.id) : '';
                router.push({
                    pathname: '/call',
                    params: {
                        name: String(p.name || ''),
                        photo: String(p.photo || ''),
                        group: groups.find((g: any) => String(g.id) === String(p.group))?.name || '',
                        type: 'sender',
                        pilgrimUserId: String(p.id),
                        conversationId: convId,
                    },
                } as any);
            } catch (e) {
                // ignore
            }
        };
        run();
    };

    const fetchRoute = useCallback(async (start: number[], end: number[]) => {
        const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
        if (!accessToken) {
            console.error('Cannot fetch route: Mapbox access token is missing.');
            return;
        }

        const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&overview=full&access_token=${accessToken}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                
                setRouteData({
                    type: 'Feature',
                    geometry: route.geometry,
                    properties: {}
                });

                // Calculate distance in km and duration in min
                const dist = (route.distance / 1000).toFixed(1);
                const dur = Math.round(route.duration / 60);
                setRouteInfo({ distance: `${dist} km`, duration: `${dur} min` });
            } else {
                setRouteData({
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: [start, end] },
                    properties: {}
                });
            }
            // Force a re-render of the map markers
            setForceUpdate(prev => prev + 1);
        } catch (error) {
            console.error('Error fetching route:', error);
            // Even on error, ensure we have something
            setForceUpdate(prev => prev + 1);
        } finally {
            // setIsLoading(false);
        }
    }, []);

    const handleStopNavigation = () => {
        setNavigationGoal(null);
        setRouteData(null);
        setRouteInfo(null);
        lastNavAnnounceBucketRef.current = '';
        lastNavAnnounceAtRef.current = 0;
        stopNavigationVoice();
        stopNavCueSound();
    };

    const handleNavigate = (p: any) => {
        if (navigationGoal?.id === p.id) {
            // Already navigating to this person, so stop.
            handleStopNavigation();
            return;
        }

        if (p.coords && userLocation) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setNavigationGoal(p);
            fetchRoute(userLocation, p.coords);
            bottomSheetRef.current?.snapToIndex(0);

            try {
                playNavCueSound();
                const targetName = String(p?.name || 'le pèlerin');
                const d = haversineMeters(userLocation as any, p.coords as any);
                const distText = Number.isFinite(d) ? formatDistanceFr(Number(d)) : '';
                speakNavigation(distText ? `Navigation vers ${targetName}. Il reste ${distText}.` : `Navigation vers ${targetName}.`);
                lastNavAnnounceBucketRef.current = computeNavAnnounceBucket(Number(d));
                lastNavAnnounceAtRef.current = Date.now();
            } catch (e) {
                // ignore
            }

            // If this pilgrim has an active SOS, set it to in_progress (orange) and stop vibration.
            try {
                const pid = String(p?.id || '').trim();
                if (pid && sosStatusByPilgrimId[pid] === 'active') {
                    const n = (sosAlerts || []).find((a: any) => {
                        const apid = String(a?.data?.pilgrim?.id || a?.data?.pilgrimUserId || '').trim();
                        return apid && apid === pid && !a?.readAt;
                    });
                    if (n?.id) {
                        updateSosStatusForNotification(String(n.id), pid, 'in_progress');
                        stopSosVibration();
                        stopAlarmSound();
                    }
                }
            } catch (e) {
                // ignore
            }
        }
    };

    // Cleanup route data when navigation goal is cleared
    useEffect(() => {
        if (!navigationGoal) {
            setRouteData(null);
            setRouteInfo(null);
        }
    }, [navigationGoal]);

    // Re-fetch route whenever user location updates significantly during navigation
    useEffect(() => {
        if (navigationGoal && userLocation) {
            fetchRoute(userLocation, navigationGoal.coords);
        }
    }, [userLocation, navigationGoal, fetchRoute]);

    // While navigating, publish guide position so pilgrim can track the guide in real time
    useEffect(() => {
        if (!navigationGoal || !Array.isArray(userLocation)) return;

        const id = setInterval(() => {
            try {
                if (!Array.isArray(userLocation)) return;
                const lng = Number(userLocation[0]);
                const lat = Number(userLocation[1]);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                trackingApi
                    // backend expects activeRole=guide|agency|freelance
                    .upsertMyGuidePosition({
                        latitude: lat,
                        longitude: lng,
                        deviceTimestamp: new Date().toISOString(),
                    } as any)
                    .catch(() => {});
            } catch (e) {
                // ignore
            }
        }, 5000);

        return () => clearInterval(id);
    }, [navigationGoal, userLocation]);

    const handleMessageGroup = (gId: string) => {
        const g = groups.find(item => item.id === gId);
        if (g) {
            router.push({
                pathname: '/discussion',
                params: {
                    id: g.id,
                    name: g.name,
                    photo: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=100', // Default group icon
                    type: 'Group',
                    online: 'true',
                    group: g.voyage
                }
            } as any);
        }
    };

    if (isScanning) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
                <CameraView
                    style={styles.camera}
                    facing="back"
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                >
                    <View style={styles.cameraOverlay}>
                        <TouchableOpacity style={styles.closeCameraBtn} onPress={() => setIsScanning(false)}>
                            <Ionicons name="close" size={30} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.scanFrame} />
                        <Text style={styles.scanText}>Position QR code within frame</Text>
                    </View>
                </CameraView>
            </SafeAreaView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

                {initialLoading && (!Array.isArray(pilgrims) || pilgrims.length === 0) ? (
                    <View
                        pointerEvents="none"
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 9999,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <ThreeDots color={colors.primary} />
                    </View>
                ) : null}

                {refreshing ? (
                    <View
                        pointerEvents="none"
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 9999,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <View
                            style={{
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                                borderRadius: 16,
                                backgroundColor: 'rgba(255,255,255,0.9)',
                                borderWidth: 1,
                                borderColor: 'rgba(0,0,0,0.06)',
                            }}
                        >
                            <ThreeDots color="#16A34A" />
                        </View>
                    </View>
                ) : null}

                {/* Navigation HUD */}
                {navigationGoal && routeInfo && (
                    <Animated.View entering={FadeInDown} style={styles.navHud}>
                        <BlurView intensity={80} tint="dark" style={styles.navHudBlur}>
                            <View style={styles.navHudHeader}>
                                <View style={styles.navHudIcon}>
                                    <MaterialCommunityIcons name="navigation" size={24} color="#fff" />
                                </View>
                                <View>
                                    <Text style={styles.navHudTitle}>Guide vers {navigationGoal.name}</Text>
                                    <Text style={styles.navHudSub}>{routeInfo.distance} • {routeInfo.duration} restant</Text>
                                </View>
                                <TouchableOpacity style={styles.stopNavBtn} onPress={handleStopNavigation}>
                                    <Ionicons name="close-circle" size={32} color="#FF5252" />
                                </TouchableOpacity>
                            </View>
                        </BlurView>
                    </Animated.View>
                )}

                {/* Map Section */}
                <View style={styles.mapContainer}>
                    <MapboxGL.MapView
                        style={styles.map}
                        styleURL={MapboxGL.StyleURL.Street}
                        logoEnabled={false}
                        attributionEnabled={false}
                    >
                        <MapboxGL.Camera
                            ref={cameraRef}
                            defaultSettings={{ zoomLevel: 12, centerCoordinate: (userLocation as any) || DEFAULT_CENTER }}
                            followUserLocation={false}
                        />

                        <MapboxGL.ShapeSource 
                            id="routeSource" 
                            key={`route-${navigationGoal?.id || 'none'}`}
                            shape={routeData || { type: "FeatureCollection", features: [] }}
                        >
                            <MapboxGL.LineLayer
                                id="routeLineGlow"
                                style={{
                                    lineColor: '#2196F3',
                                    lineWidth: 12,
                                    lineOpacity: navigationGoal ? 0.25 : 0,
                                    lineCap: 'round',
                                    lineJoin: 'round',
                                }}
                            />
                            <MapboxGL.LineLayer
                                id="routeLineMain"
                                style={{
                                    lineColor: '#2196F3',
                                    lineWidth: 7,
                                    lineOpacity: navigationGoal ? 1 : 0,
                                    lineCap: 'round',
                                    lineJoin: 'round',
                                }}
                            />
                        </MapboxGL.ShapeSource>

                        <MapboxGL.UserLocation 
                            visible={true} 
                            animated={true}
                            showsUserHeadingIndicator={true}
                            onUpdate={(loc) => {
                                const newLoc = [loc.coords.longitude, loc.coords.latitude];
                                setUserLocation(newLoc);
                            }} 
                        />

                        {/* Destination Marker when navigating */}
                        {navigationGoal && navigationGoal.coords && (
                             <MapboxGL.PointAnnotation
                                id="destinationMarker"
                                coordinate={navigationGoal.coords}
                            >
                                <View style={styles.destinationMarkerWrapper}>
                                    <View style={[styles.markerRing, { borderColor: groups.find((g: any) => String(g.id) === String(navigationGoal.group))?.color || theme.colors.primary }]}>
                                        <Image source={{ uri: navigationGoal.photo }} style={styles.markerImage} />
                                    </View>
                                    <View style={styles.markerBadge}>
                                        <Ionicons name="flag" size={12} color="#fff" />
                                    </View>
                                </View>
                            </MapboxGL.PointAnnotation>
                        )}

                        {userMode === 'agency' ? (
                            selectedGroup ? (
                                // When a group is selected in agency mode, show the individual pilgrims of that group
                                pilgrims
                                    .filter((p) => {
                                        const g = groups.find((gg: any) => String(gg.id) === String(selectedGroup));
                                        const byGroupId = String(p.group) === String(selectedGroup);
                                        const byMembership = Array.isArray(g?.pilgrimIds)
                                            ? g.pilgrimIds.map(String).includes(String(p.id))
                                            : false;
                                        return byGroupId || byMembership;
                                    })
                                    .map((pilgrim: any) => {
                                        if (navigationGoal?.id && String(navigationGoal.id) === String(pilgrim.id)) {
                                            return null;
                                        }
                                        const live = getLatestPilgrimPosition(pilgrim.id);
                                        const realCoord = live?.coords || pilgrim.coords;
                                        const realHasPosition = !!live || !!pilgrim.hasPosition;
                                        const fallback = computeGroupFallbackCoordinate(pilgrim.group);
                                        // FORCE COORDINATE: if no real or fallback coord, use a default one near user or center
                                        // to make sure the marker is visible somewhere
                                        let finalCoordinate = Array.isArray(realCoord) ? realCoord : fallback;
                                        if (!finalCoordinate && userLocation) {
                                            finalCoordinate = userLocation;
                                        }

                                        if (
                                            !Array.isArray(finalCoordinate) ||
                                            !Number.isFinite(finalCoordinate[0]) ||
                                            !Number.isFinite(finalCoordinate[1])
                                        )
                                            return null;

                                        return (
                                            <MapboxGL.MarkerView
                                                key={`marker-${pilgrim.id}-${forceUpdate}`}
                                                id={`marker-${pilgrim.id}`}
                                                coordinate={finalCoordinate}
                                            >
                                                <TouchableOpacity 
                                                    onPress={() => handlePilgrimSelect(pilgrim.id)}
                                                    activeOpacity={0.8}
                                                    style={styles.markerWrapper}
                                                >
                                                    {sosActivePilgrimIdsRef.current[String(pilgrim.id)] ? (
                                                        <RNAnimated.View
                                                            pointerEvents="none"
                                                            style={[
                                                                styles.sosPulseRing,
                                                                {
                                                                    opacity: sosPulseAnim.interpolate({
                                                                        inputRange: [0, 1],
                                                                        outputRange: [0.55, 0],
                                                                    }),
                                                                    transform: [
                                                                        {
                                                                            scale: sosPulseAnim.interpolate({
                                                                                inputRange: [0, 1],
                                                                                outputRange: [1, 1.75],
                                                                            }),
                                                                        },
                                                                    ],
                                                                },
                                                            ]}
                                                        />
                                                    ) : null}
                                                    <View style={[
                                                        styles.markerRing,
                                                        {
                                                            borderColor: (() => {
                                                                const v = getSosVisual(String(pilgrim.id));
                                                                if (v.isSos) return sosBlinkOn ? v.colorOn : v.colorOff;
                                                                return realHasPosition
                                                                    ? (groups.find((g: any) => String(g.id) === String(selectedGroup))?.color || theme.colors.primary)
                                                                    : '#BDBDBD';
                                                            })()
                                                        }
                                                    ]}>
                                                        {(() => {
                                                            const v = getSosVisual(String(pilgrim.id));
                                                            if (!v.isSos) return null;
                                                            return (
                                                                <View
                                                                    style={[
                                                                        styles.sosBlinkOverlay,
                                                                        {
                                                                            backgroundColor: v.colorOn,
                                                                            opacity: sosBlinkOn ? 0.22 : 0,
                                                                        },
                                                                    ]}
                                                                />
                                                            );
                                                        })()}
                                                        <Image 
                                                            source={{ uri: getUserAvatarUrl(pilgrim.photo) || DEFAULT_AVATAR }}
                                                            style={styles.markerImage}
                                                            resizeMode="cover"
                                                        />
                                                    </View>
                                                </TouchableOpacity>
                                            </MapboxGL.MarkerView>
                                        );
                                    })
                            ) : (
                                // Otherwise show all group icons
                                filteredData.map((group: any) => {
                                    const isSelected = selectedGroup === group.id;
                                    if (
                                        !Array.isArray(group.coords) ||
                                        !Number.isFinite(group.coords[0]) ||
                                        !Number.isFinite(group.coords[1])
                                    )
                                        return null;

                                    return (
                                        <MapboxGL.MarkerView
                                            key={`group-${group.id}-${forceUpdate}`}
                                            id={`marker-${group.id}`}
                                            coordinate={group.coords}
                                        >
                                            <TouchableOpacity 
                                                onPress={() => handleGroupSelect(group.id)}
                                                activeOpacity={0.8}
                                                style={styles.markerWrapper}
                                            >
                                                <View
                                                    style={[
                                                        styles.markerRing,
                                                        { borderColor: group.color, backgroundColor: group.color },
                                                    ]}
                                                >
                                                    <MaterialCommunityIcons name="account-group" size={24} color="#fff" />
                                                </View>
                                            </TouchableOpacity>
                                        </MapboxGL.MarkerView>
                                    );
                                })
                            )
                        ) : (
                            // Guide mode logic - show all filtered pilgrims
                            filteredData.map((pilgrim: any) => {
                                const group = groups.find((g: any) => String(g.id) === String(pilgrim.group));
                                const isSelected = selectedPilgrim === pilgrim.id;

                                if (navigationGoal?.id && String(navigationGoal.id) === String(pilgrim.id)) {
                                    return null;
                                }

                                const live = getLatestPilgrimPosition(pilgrim.id);
                                const realCoord = live?.coords || pilgrim.coords;
                                const realHasPosition = !!live || !!pilgrim.hasPosition;
                                const fallback = computeGroupFallbackCoordinate(pilgrim.group);
                                // FORCE COORDINATE
                                let finalCoordinate = Array.isArray(realCoord) ? realCoord : fallback;
                                if (!finalCoordinate && userLocation) {
                                    finalCoordinate = userLocation;
                                }

                                if (
                                    !Array.isArray(finalCoordinate) ||
                                    !Number.isFinite(finalCoordinate[0]) ||
                                    !Number.isFinite(finalCoordinate[1])
                                )
                                    return null;

                                return (
                                    <MapboxGL.MarkerView
                                        key={`marker-${pilgrim.id}-${forceUpdate}`}
                                        id={`marker-${pilgrim.id}`}
                                        coordinate={finalCoordinate}
                                    >
                                        <TouchableOpacity 
                                            onPress={() => handlePilgrimSelect(pilgrim.id)}
                                            activeOpacity={0.8}
                                            style={styles.markerWrapper}
                                        >
                                            {sosActivePilgrimIdsRef.current[String(pilgrim.id)] ? (
                                                <RNAnimated.View
                                                    pointerEvents="none"
                                                    style={[
                                                        styles.sosPulseRing,
                                                        {
                                                            opacity: sosPulseAnim.interpolate({
                                                                inputRange: [0, 1],
                                                                outputRange: [0.55, 0],
                                                            }),
                                                            transform: [
                                                                {
                                                                    scale: sosPulseAnim.interpolate({
                                                                        inputRange: [0, 1],
                                                                        outputRange: [1, 1.75],
                                                                    }),
                                                                },
                                                            ],
                                                        },
                                                    ]}
                                                />
                                            ) : null}
                                            <View style={[
                                                styles.markerRing,
                                                {
                                                    borderColor: (() => {
                                                        const v = getSosVisual(String(pilgrim.id));
                                                        if (v.isSos) return sosBlinkOn ? v.colorOn : v.colorOff;
                                                        return realHasPosition
                                                            ? (group?.color || theme.colors.primary)
                                                            : '#BDBDBD';
                                                    })()
                                                }
                                            ]}>
                                                {(() => {
                                                    const v = getSosVisual(String(pilgrim.id));
                                                    if (!v.isSos) return null;
                                                    return (
                                                        <View
                                                            style={[
                                                                styles.sosBlinkOverlay,
                                                                {
                                                                    backgroundColor: v.colorOn,
                                                                    opacity: sosBlinkOn ? 0.22 : 0,
                                                                },
                                                            ]}
                                                        />
                                                    );
                                                })()}
                                                <Image 
                                                    source={{ uri: getUserAvatarUrl(pilgrim.photo) || DEFAULT_AVATAR }}
                                                    style={styles.markerImage}
                                                    resizeMode="cover"
                                                />
                                            </View>
                                        </TouchableOpacity>
                                    </MapboxGL.MarkerView>
                                );
                            })
                        )}
                    </MapboxGL.MapView>

                    {/* Detail Popup - Swipeable Pilgrim Carousel */}
                    {selectedPilgrim && selectedPilgrimData && (
                        <RNAnimated.View style={[styles.detailPopup, { transform: [{ translateY: slideAnim }] }]}>
                            <View style={[styles.popupContainerNoPadding, { backgroundColor: colors.surface }]}>
                                <FlatList
                                    data={pilgrims.filter((p: any) => String(p.group) === String(selectedPilgrimData.group))}
                                    horizontal
                                    pagingEnabled
                                    showsHorizontalScrollIndicator={false}
                                    keyExtractor={(item) => item.id}
                                    initialScrollIndex={Math.max(
                                        0,
                                        pilgrims
                                            .filter((p: any) => String(p.group) === String(selectedPilgrimData.group))
                                            .findIndex((p: any) => String(p.id) === String(selectedPilgrim)),
                                    )}
                                    getItemLayout={(data, index) => ({
                                        length: width - 40,
                                        offset: (width - 40) * index,
                                        index,
                                    })}
                                    snapToInterval={width - 40}
                                    decelerationRate="fast"
                                    renderItem={({ item: p }) => {
                                        const group = groups.find((g: any) => String(g.id) === String(p.group));
                                        return (
                                            <View style={[styles.swipeablePilgrimCard, { backgroundColor: colors.surface }]}>
                                                <View style={styles.popupHeader}>
                                                    <View style={styles.popupUserRow}>
                                                        <View style={[
                                                            styles.popupImageBorder,
                                                            { borderColor: group?.color || colors.primary }
                                                        ]}>
                                                            <Image source={{ uri: p.photo }} style={styles.popupImage} />
                                                        </View>
                                                        <View style={styles.popupInfo}>
                                                            <Text style={[styles.popupName, { color: colors.text }]}>{p.name}</Text>
                                                            <Text style={[styles.popupGroup, { color: colors.textSecondary }]}>{group?.name}</Text>
                                                        </View>
                                                    </View>
                                                    <TouchableOpacity
                                                        style={styles.closePopup}
                                                        onPress={() => {
                                                            setSelectedPilgrim(null);
                                                            bottomSheetRef.current?.snapToIndex(1);
                                                        }}
                                                    >
                                                        <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
                                                    </TouchableOpacity>
                                                </View>

                                                <View style={[styles.popupStats, { borderTopColor: colors.border }]}>
                                                    <View style={styles.statItem}>
                                                        <Ionicons name="location-outline" size={18} color={colors.primary} />
                                                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{p.hasPosition ? 'Position disponible' : 'Position non partagée'}</Text>
                                                    </View>
                                                    <View style={styles.statItem}>
                                                        <Ionicons name="battery-charging-outline" size={18} color="#4CAF50" />
                                                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>82%</Text>
                                                    </View>
                                                </View>

                                                <View style={styles.popupActions}>
                                                    <TouchableOpacity
                                                        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                                                        onPress={() => handleMessagePilgrim(p)}
                                                    >
                                                        <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity 
                                                        style={[styles.actionBtn, { backgroundColor: '#4285F4' }]}
                                                        onPress={() => handleCallPilgrim(p)}
                                                    >
                                                        <Ionicons name="call" size={22} color="#fff" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity 
                                                        style={[
                                                            styles.actionBtn, 
                                                            { backgroundColor: navigationGoal?.id === p.id ? '#FF5252' : colors.text }
                                                        ]}
                                                        onPress={() => handleNavigate(p)}
                                                    >
                                                        <Ionicons 
                                                            name={navigationGoal?.id === p.id ? "stop-circle" : "navigate-circle"} 
                                                            size={22} 
                                                            color={navigationGoal?.id === p.id ? "#fff" : colors.background} 
                                                        />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        );
                                    }}
                                />
                            </View>
                        </RNAnimated.View>
                    )}

                    {/* Top Overlay - AppBar */}
                    <View style={styles.topBar}>
                        {isSearching ? (
                            <View style={[styles.searchBar, { backgroundColor: colors.surface, shadowColor: isDarkMode ? '#000' : 'rgba(0,0,0,0.1)' }]}>
                                <TouchableOpacity onPress={() => setIsSearching(false)}>
                                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                                </TouchableOpacity>
                                <TextInput
                                    style={[styles.searchInput, { color: colors.text }]}
                                    placeholder="Search pilgrims, groups..."
                                    placeholderTextColor={colors.textSecondary}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoFocus
                                />
                                {searchQuery !== '' && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            <View style={[styles.header, { backgroundColor: colors.surface, shadowColor: isDarkMode ? '#000' : 'rgba(0,0,0,0.1)' }]}>
                                <Text style={[styles.headerTitle, { color: colors.text }]}>Tracking</Text>
                                <View style={styles.headerActions}>
                                    <TouchableOpacity style={styles.headerIcon} onPress={() => setIsSearching(true)}>
                                        <Ionicons name="search-outline" size={24} color={colors.text} />
                                    </TouchableOpacity>
                                    {userMode === 'guide' && (
                                        <TouchableOpacity style={styles.headerIcon}>
                                            <Ionicons name="add-circle-outline" size={24} color={colors.text} />
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity style={styles.headerIcon} onPress={startScanning}>
                                        <MaterialCommunityIcons name="qrcode-scan" size={22} color={colors.text} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Bottom Sheet - Management */}
                    <BottomSheet
                        ref={bottomSheetRef}
                        index={1}
                        snapPoints={snapPoints}
                        enableContentPanningGesture={!selectedPilgrim && !navigationGoal}
                        enableHandlePanningGesture={!selectedPilgrim && !navigationGoal}
                        backgroundStyle={[styles.bottomSheetBackground, { backgroundColor: colors.surface }]}
                        handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: isDarkMode ? '#2E3B56' : '#E0E0E0' }]}
                    >
                        <BottomSheetView style={styles.bottomSheetHeader}>
                            <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>My Umrahs</Text>
                            <TouchableOpacity onPress={() => { setSelectedGroup(null); setSelectedPilgrim(null); setSearchQuery(''); }}>
                                <Text style={[styles.resetText, { color: colors.primary }]}>Show All</Text>
                            </TouchableOpacity>
                        </BottomSheetView>

                        <BottomSheetScrollView
                            contentContainerStyle={styles.scrollContent}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor="transparent"
                                    colors={['transparent']}
                                    progressBackgroundColor="transparent"
                                />
                            }
                        >
                            {Object.entries(groupData).map(([voyage, voyagesGroups]) => (
                                <View key={voyage} style={styles.voyageSection}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setSelectedGroup(null);
                                            setSelectedPilgrim(null);
                                            toggleVoyage(voyage);
                                        }}
                                        style={[styles.voyageHeader, { backgroundColor: isDarkMode ? '#121824' : '#F8F9FA' }]}
                                    >
                                        <View style={styles.voyageTitleRow}>
                                            <Text style={[styles.voyageTitle, { color: colors.text }]}>{voyage}</Text>
                                            <Text style={[styles.voyageDate, { color: colors.textSecondary }]}>{voyagesGroups[0].date}</Text>
                                        </View>
                                        <Ionicons
                                            name={expandedVoyages[voyage] ? 'chevron-up' : 'chevron-down'}
                                            size={20}
                                            color={colors.textSecondary}
                                        />
                                    </TouchableOpacity>

                                    {expandedVoyages[voyage] && voyagesGroups.map((group: any) => (
                                        <View key={group.id} style={styles.groupContainer}>
                                            <TouchableOpacity
                                                style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }, selectedGroup === group.id && [styles.activeGroupCard, { borderColor: colors.primary, backgroundColor: isDarkMode ? 'rgba(58, 125, 68, 0.12)' : '#F0F7F2' }]]}
                                                onPress={() => handleGroupSelect(group.id === selectedGroup ? null : group.id)}
                                            >
                                                <View style={[styles.groupColorBar, { backgroundColor: group.color }]} />
                                                <View style={styles.groupInfo}>
                                                    <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
                                                    <Text style={[styles.groupSub, { color: colors.textSecondary }]}>{group.pilgrimIds.length} Pilgrims</Text>
                                                </View>
                                                <Ionicons name="people-outline" size={20} color={group.color} />
                                            </TouchableOpacity>

                                            {selectedGroup === group.id && (group.pilgrimIds || []).map((pid: string) => {
                                                const pilgrim = pilgrims.find((p: any) => String(p.id) === String(pid));
                                                if (!pilgrim) return null;
                                                return (
                                                    <TouchableOpacity
                                                        key={pilgrim.id}
                                                        style={[styles.pilgrimRow, { backgroundColor: colors.surface }, selectedPilgrim === pilgrim.id && [styles.activePilgrimRow, { backgroundColor: isDarkMode ? '#121824' : '#F8F9FA' }]]}
                                                        onPress={() => handlePilgrimSelect(pilgrim.id === selectedPilgrim ? null : pilgrim.id)}
                                                    >
                                                        <Image source={{ uri: pilgrim.photo }} style={styles.pilgrimPhoto} />
                                                        <View style={styles.pilgrimInfo}>
                                                            <Text style={[styles.pilgrimName, { color: colors.text }]}>{pilgrim.name}</Text>
                                                            <Text style={[styles.pilgrimStatus, { color: colors.textSecondary }]}>{pilgrim.status}</Text>
                                                        </View>
                                                        <View
                                                            style={[
                                                                styles.statusDotSmall,
                                                                { backgroundColor: pilgrim.status === 'Active' ? '#4CAF50' : '#FFC107' },
                                                            ]}
                                                        />
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    ))}
                                </View>
                            ))}
                        </BottomSheetScrollView>
                    </BottomSheet>
                </View>
                </SafeAreaView>

                {/* SOS Modal */}
                <Modal
                    visible={sosModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => {
                        stopAlarmSound();
                        setSosModalVisible(false);
                    }}
                >
                    <View style={[styles.sosModalOverlay, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)' }]}>
                        <TouchableOpacity
                            style={{ flex: 1 }}
                            onPress={() => {
                                stopAlarmSound();
                                setSosModalVisible(false);
                            }}
                        />
                        <View style={[styles.sosSheet, { backgroundColor: colors.surface }]}>
                            <View style={[styles.sosSheetHandle, { backgroundColor: isDarkMode ? '#2E3B56' : '#E0E0E0' }]} />
                            <View style={styles.sosSheetHeader}>
                                <Text style={[styles.sosSheetTitle, { color: colors.text }]}>SOS Alerts</Text>
                                <TouchableOpacity onPress={() => {
                                    stopAlarmSound();
                                    setSosModalVisible(false);
                                }} style={styles.sosSheetClose}>
                                    <Ionicons name="close" size={22} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
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
                                            const pilgrimId = data?.pilgrim?.id
                                                ? String(data.pilgrim.id)
                                                : (data?.pilgrimUserId ? String(data.pilgrimUserId) : '');

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

                                            const status: 'active' | 'in_progress' | 'resolved' = (() => {
                                                const pid = String(pilgrimId || '').trim();
                                                if (pid && sosStatusByPilgrimId[pid]) return sosStatusByPilgrimId[pid];
                                                const raw = String(data?.sosStatus || '').trim().toLowerCase();
                                                if (raw === 'in_progress' || raw === 'inprogress' || raw === 'en_cours' || raw === 'encours') return 'in_progress';
                                                if (raw === 'resolved' || resolved) return 'resolved';
                                                return 'active';
                                            })();

                                            return (
                                                <TouchableOpacity
                                                    key={String(a?.id || Math.random())}
                                                    style={[styles.sosRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                                    activeOpacity={0.85}
                                                    onPress={() => {
                                                        if (!hasCoords) return;
                                                        setSosModalVisible(false);

                                                        if (pilgrimId) {
                                                            setSelectedPilgrim(pilgrimId);
                                                            bottomSheetRef.current?.snapToIndex(0);
                                                        }
                                                        try {
                                                            cameraRef.current?.setCamera({
                                                                centerCoordinate: [lng, lat],
                                                                zoomLevel: 16,
                                                                animationDuration: 900,
                                                            } as any);
                                                        } catch (e) {}
                                                    }}
                                                >
                                                    {photoUrl ? (
                                                        <View style={styles.sosRowAvatarWrap}>
                                                            <Image source={{ uri: photoUrl }} style={styles.sosRowAvatar} />
                                                        </View>
                                                    ) : null}

                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.sosRowTitle, { color: colors.text }]} numberOfLines={1}>
                                                            {pilgrimName}
                                                        </Text>
                                                        <Text style={[styles.sosRowSub, { color: colors.textSecondary }]} numberOfLines={2}>
                                                            {String(a?.title || 'Alerte SOS')}
                                                            {hasCoords ? ` • ${lat.toFixed(5)}, ${lng.toFixed(5)}` : ''}
                                                        </Text>
                                                    </View>

                                                    {!resolved ? (
                                                        <View style={styles.sosStatusPickerWrap}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                                <TouchableOpacity
                                                                    style={[styles.sosResolveBtn, { backgroundColor: '#FFF7ED' }]}
                                                                    onPress={() => {
                                                                        if (!a?.id || !pilgrimId) return;
                                                                        updateSosStatusForNotification(String(a.id), pilgrimId, 'in_progress');
                                                                    }}
                                                                >
                                                                    <Text style={[styles.sosResolveBtnText, { color: '#F97316' }]}>En cours</Text>
                                                                </TouchableOpacity>
                                                                <TouchableOpacity
                                                                    style={[styles.sosResolveBtn, { backgroundColor: '#E8F5E9' }]}
                                                                    onPress={() => {
                                                                        if (!a?.id || !pilgrimId) return;
                                                                        updateSosStatusForNotification(String(a.id), pilgrimId, 'resolved');
                                                                    }}
                                                                >
                                                                    <Text style={[styles.sosResolveBtnText, { color: '#16A34A' }]}>Résoudre</Text>
                                                                </TouchableOpacity>
                                                            </View>
                                                        </View>
                                                    ) : (
                                                        <View style={[styles.sosResolveBtn, { backgroundColor: '#E8F5E9' }]}>
                                                            <Text style={[styles.sosResolveBtnText, { color: '#16A34A' }]}>OK</Text>
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })
                                ) : (
                                    <View style={styles.sosEmptyWrap}>
                                        <Text style={[styles.sosEmptyTitle, { color: colors.text }]}>Aucune alerte SOS</Text>
                                        <Text style={[styles.sosEmptySub, { color: colors.textSecondary }]}>Les alertes SOS reçues s'afficheront ici.</Text>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </GestureHandlerRootView>
        );
    };

    export default TrackingScreen;

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#fff',
        },
        camera: {
            flex: 1,
        },
        cameraOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        closeCameraBtn: {
            position: 'absolute',
            top: 50,
            right: 20,
            padding: 10,
            zIndex: 10,
        },
        scanFrame: {
            width: 250,
            height: 250,
            borderWidth: 2,
            borderColor: '#fff',
            borderRadius: 20,
            backgroundColor: 'transparent',
        },
        scanText: {
            color: '#fff',
            marginTop: 20,
            fontSize: 16,
            fontWeight: '500',
        },
        mapContainer: {
            flex: 1,
        },
        map: {
            flex: 1,
        },
        topBar: {
            position: 'absolute',
            top: Platform.OS === 'ios' ? 60 : 45,
            left: 20,
            right: 20,
            zIndex: 10,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            height: 52,
            backgroundColor: '#fff',
            borderRadius: 26,
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
        },
        headerTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: theme.colors.secondary,
            flex: 1,
            marginLeft: 10,
        },
        headerCloseIcon: {
            padding: 4,
        },
        headerActions: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        headerIcon: {
            marginLeft: 15,
        },
        backButtonPopup: {
            marginRight: 10,
            padding: 4,
        },
        searchBar: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 15,
            height: 52,
            backgroundColor: '#fff',
            borderRadius: 26,
            elevation: 10,
        },
        searchInput: {
            flex: 1,
            marginLeft: 10,
            fontSize: 16,
            color: theme.colors.secondary,
        },
        markerWrapper: {
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99,
        },
        markerRing: {
            width: 52,
            height: 52,
            borderRadius: 26,
            borderWidth: 2,
            backgroundColor: '#fff',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            elevation: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
        },
        markerImage: {
            width: '100%',
            height: '100%',
        },
        markerPointer: {
            width: 0,
            height: 0,
            backgroundColor: 'transparent',
            borderStyle: 'solid',
            borderLeftWidth: 6,
            borderRightWidth: 6,
            borderBottomWidth: 0,
            borderTopWidth: 8,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            marginTop: -2,
        },
        selectedMarkerRing: {
            borderWidth: 3,
            width: 42,
            height: 42,
            borderRadius: 21,
        },
        calloutStatus: {
            fontSize: 11,
            fontWeight: '600',
            color: theme.colors.muted,
        },
        detailPopup: {
            position: 'absolute',
            bottom: 150, // Just above the bottom sheet height in index 0/1
            left: 20,
            right: 20,
            zIndex: 100,
        },
        popupContent: {
            backgroundColor: '#fff',
            borderRadius: 24,
            padding: 20,
            elevation: 15,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 15,
        },
        popupHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
        },
        popupUserRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 15,
        },
        popupImageBorder: {
            width: 60,
            height: 60,
            borderRadius: 30,
            borderWidth: 3,
            padding: 2,
        },
        popupImage: {
            width: '100%',
            height: '100%',
            borderRadius: 28,
        },
        popupInfo: {
            gap: 2,
        },
        popupName: {
            fontSize: 18,
            fontWeight: 'bold',
            color: theme.colors.secondary,
        },
        popupGroup: {
            fontSize: 14,
            color: theme.colors.muted,
        },
        closePopup: {
            padding: 2,
        },
        popupStats: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 20,
            paddingTop: 15,
            borderTopWidth: 1,
            borderTopColor: '#F1F3F5',
        },
        statItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
        },
        statLabel: {
            fontSize: 12,
            color: theme.colors.muted,
            fontWeight: '500',
        },
        popupActions: {
            flexDirection: 'row',
            gap: 10,
            marginTop: 20,
        },
        actionBtn: {
            width: 42,
            height: 42,
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 3,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
        },
        actionBtnText: {
            color: '#fff',
            fontSize: 12,
            fontWeight: 'bold',
        },
        bottomSheetBackground: {
            backgroundColor: '#fff',
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -10 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 20,
        },
        handleIndicator: {
            backgroundColor: '#E0E0E0',
            width: 40,
        },
        bottomSheetHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: 16,
        },
        bottomSheetTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.colors.secondary,
        },
        resetText: {
            fontSize: 14,
            color: theme.colors.primary,
            fontWeight: '600',
        },
        scrollContent: {
            paddingHorizontal: 20,
            paddingBottom: 40,
        },
        voyageSection: {
            marginBottom: 12,
        },
        voyageHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 12,
            backgroundColor: '#F8F9FA',
            borderRadius: 12,
            marginBottom: 4,
        },
        voyageTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            flex: 1,
            justifyContent: 'space-between',
            marginRight: 10,
        },
        voyageTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: theme.colors.secondary,
        },
        sosPulseRing: {
            position: 'absolute',
            width: 56,
            height: 56,
            borderRadius: 28,
            borderWidth: 3,
            borderColor: '#DC2626',
            backgroundColor: 'transparent',
        },
        sosBlinkOverlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#DC2626',
            pointerEvents: 'none',
        },
    voyageDate: {
        fontSize: 13,
        color: theme.colors.muted,
        fontWeight: '500',
    },
    groupContainer: {
        marginLeft: 4,
        marginBottom: 4,
    },
    groupCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F1F3F5',
        marginBottom: 4,
    },
    activeGroupCard: {
        borderColor: theme.colors.primary,
        backgroundColor: '#F0F7F2',
    },
    groupColorBar: {
        width: 4,
        height: 30,
        borderRadius: 2,
        marginRight: 12,
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme.colors.secondary,
    },
    groupSub: {
        fontSize: 12,
        color: theme.colors.muted,
    },
    pilgrimRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        marginLeft: 12,
        marginBottom: 2,
        borderRadius: 12,
    },
    activePilgrimRow: {
        backgroundColor: '#F8F9FA',
    },
    pilgrimPhoto: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F1F3F5',
    },
    pilgrimInfo: {
        flex: 1,
        marginLeft: 12,
    },
    pilgrimName: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.secondary,
    },
    pilgrimStatus: {
        fontSize: 10,
        color: theme.colors.muted,
    },
    statusDotSmall: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    membersListContainer: {
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#F1F3F5',
    },
    membersHeader: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.secondary,
        marginBottom: 10,
    },
    horizontalMembers: {
        gap: 12,
        paddingRight: 20,
    },
    memberAvatarWrapper: {
        alignItems: 'center',
        width: 50,
    },
    memberAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: '#F0F0F0',
    },
    memberNameSmall: {
        fontSize: 10,
        color: theme.colors.muted,
        marginTop: 4,
        textAlign: 'center',
    },
    popupContainerNoPadding: {
        backgroundColor: '#fff',
        borderRadius: 24,
        elevation: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        overflow: 'hidden',
    },
    swipeablePilgrimCard: {
        width: width - 40,
        padding: 12,
        backgroundColor: '#fff',
    },
    userpuck: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(33, 150, 243, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        zIndex: 100,
    },
    userpuckInner: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#2196F3',
        borderWidth: 2,
        borderColor: '#fff',
    },
    destinationMarkerWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 101,
    },
    markerBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#F44336',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    sosFab: {
        position: 'absolute',
        right: 18,
        bottom: 170,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF3B30',
        paddingHorizontal: 14,
        height: 44,
        borderRadius: 22,
        elevation: 8,
        shadowColor: '#000',
        shadowRadius: 8,
    },
    sosFabText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
        marginLeft: 8,
        letterSpacing: 0.5,
    },
    sosModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sosSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 8,
        paddingBottom: 18,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 12,
    },
    sosSheetHandle: {
        alignSelf: 'center',
        width: 44,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#E5E7EB',
        marginBottom: 10,
    },
    sosSheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F3F5',
        marginBottom: 10,
    },
    sosSheetTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: theme.colors.secondary,
    },
    sosSheetClose: {
        padding: 6,
        borderRadius: 16,
        backgroundColor: '#F8F9FA',
    },
    sosRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#F1F3F5',
        backgroundColor: '#fff',
        marginBottom: 8,
    },
    sosRowIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    sosRowAvatarWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        overflow: 'hidden',
        marginRight: 10,
        backgroundColor: '#F1F3F5',
    },
    sosRowAvatar: {
        width: '100%',
        height: '100%',
    },
    sosRowTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.secondary,
        marginBottom: 2,
    },
    sosRowSub: {
        fontSize: 12,
        color: theme.colors.muted,
    },
    sosResolveBtn: {
        marginLeft: 10,
        paddingHorizontal: 12,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sosResolveBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '800',
    },
    sosStatusPickerWrap: {
        minWidth: 140,
        borderRadius: 10,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        marginLeft: 10,
    },
    sosStatusPicker: {
        height: 36,
        width: 160,
    },
    sosEmptyWrap: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    sosEmptyTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: theme.colors.secondary,
        marginBottom: 6,
    },
    sosEmptySub: {
        fontSize: 12,
        color: theme.colors.muted,
        textAlign: 'center',
    },
    navHud: {
        position: 'absolute',
        top: 10,
        left: 16,
        right: 16,
        zIndex: 50,
        borderRadius: 16,
        overflow: 'hidden',
    },
    navHudBlur: {
        padding: 15,
    },
    navHudHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    navHudIcon: {
        width: 45,
        height: 45,
        borderRadius: 22,
        backgroundColor: '#2196F3',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    navHudTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    navHudSub: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
    },
    stopNavBtn: {
        marginLeft: 'auto',
    }
});
