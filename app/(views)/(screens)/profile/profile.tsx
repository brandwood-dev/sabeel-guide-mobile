import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
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
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTrans } from '@/hooks/useTrans';
import { ProfileMenuItem } from '@/components/common/ProfileMenuItem';
import { useThemeContext } from '@/context/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function ProfilePage() {
    const { t, language } = useTrans();
    const colors = useThemeColors() as any;
    const insets = useSafeAreaInsets();
    const router = useRouter();

    // Mock data to replace missing Redux/VM
    const [user, setUser] = useState({
        firstName: 'Ahmed',
        lastName: 'Mohammed',
        email: 'ahmed.guide@sabeel.com',
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
        uniqueIdentifier: 'GUI-882-901',
    });

    const [activeTab, setActiveTab] = useState(0);
    const [showQRModal, setShowQRModal] = useState(false);
    const { isDarkMode: darkMode, setDarkMode } = useThemeContext();
    const [locationEnabled, setLocationEnabled] = useState(true);

    const HEADER_FIXED = 160 + insets.top;
    const PRIMARY = colors.primary;
    const PAGE_BG = colors.background;
    const CARD_BG = colors.surface;
    const TEXT = colors.secondary;
    const TEXT_SEC = colors.muted;
    const DIVIDER = colors.divider;

    const switchTab = (index: number) => {
        setActiveTab(index);
    };

    const handleLogout = () => {
        Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Déconnexion', onPress: () => router.replace('/signin' as any) }
        ]);
    };

    const renderMonCompte = () => (
        <ScrollView
            style={{ flex: 1, backgroundColor: PAGE_BG }}
            contentContainerStyle={{
                paddingTop: 20,
                paddingHorizontal: 16,
                paddingBottom: 100,
            }}
            showsVerticalScrollIndicator={false}
        >
            <Text style={[ss.sectionLabel, { color: TEXT_SEC }]}>{t('MON COMPTE')}</Text>
            <View style={[ss.card, { backgroundColor: CARD_BG }]}>
                <ProfileMenuItem
                    icon="person-circle-outline"
                    label={t('Informations personnelles')}
                    onPress={() => router.push('/profile/personal_info' as any)}
                />
                <View style={[ss.sep, { backgroundColor: DIVIDER }]} />
                <ProfileMenuItem
                    icon="document-text-outline"
                    label={t('Mes documents')}
                    onPress={() => router.push('/profile/documents' as any)}
                />
            </View>

            <Text style={[ss.sectionLabel, { color: TEXT_SEC }]}>{t('SERVICES')}</Text>
            <View style={[ss.card, { backgroundColor: CARD_BG }]}>
                <ProfileMenuItem
                    icon="people-outline"
                    label={t('Mes compagnons')}
                    onPress={() => router.push('/profile/companions' as any)}
                />
                <View style={[ss.sep, { backgroundColor: DIVIDER }]} />
                <ProfileMenuItem
                    icon="business-outline"
                    label={t('Mon agence')}
                    onPress={() => router.push('/profile/agency' as any)}
                />
            </View>

            <Text style={[ss.sectionLabel, { color: TEXT_SEC }]}>{t('PARAMÈTRES')}</Text>
            <View style={[ss.card, { backgroundColor: CARD_BG }]}>
                <ProfileMenuItem
                    icon="moon-outline"
                    label={t('Mode sombre')}
                    type="toggle"
                    value={darkMode}
                    onValueChange={setDarkMode}
                />
                <View style={[ss.sep, { backgroundColor: DIVIDER }]} />
                <ProfileMenuItem
                    icon="location-outline"
                    label={t('Partager ma position')}
                    type="toggle"
                    value={locationEnabled}
                    onValueChange={setLocationEnabled}
                />
            </View>

            <TouchableOpacity style={[ss.logoutBtn, { backgroundColor: darkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text style={ss.logoutText}>Se déconnecter</Text>
            </TouchableOpacity>
        </ScrollView>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: PAGE_BG }}>
            <View style={[ss.header, { backgroundColor: CARD_BG, borderBottomColor: DIVIDER }]}>
                <View style={ss.profileInfo}>
                    <Image source={{ uri: user.photo }} style={ss.avatar} />
                    <View>
                        <Text style={[ss.userName, { color: TEXT }]}>{user.firstName} {user.lastName}</Text>
                        <Text style={[ss.userEmail, { color: TEXT_SEC }]}>{user.email}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => setShowQRModal(true)} style={[ss.qrBtn, { backgroundColor: PRIMARY + '10' }]}>
                    <Ionicons name="qr-code-outline" size={24} color={PRIMARY} />
                </TouchableOpacity>
            </View>

            {renderMonCompte()}

            <Modal visible={showQRModal} transparent animationType="fade">
                <View style={ss.modalOverlay}>
                    <View style={[ss.qrModal, { backgroundColor: CARD_BG }]}>
                        <TouchableOpacity style={ss.closeBtn} onPress={() => setShowQRModal(false)}>
                            <Ionicons name="close" size={24} color={TEXT} />
                        </TouchableOpacity>
                        <Text style={[ss.modalTitle, { color: TEXT }]}>Mon Code QR</Text>
                        <View style={[ss.qrPlaceholder, { backgroundColor: darkMode ? '#121824' : '#f9f9f9' }]}>
                            <Ionicons name="qr-code" size={150} color={PRIMARY} />
                        </View>
                        <Text style={[ss.idText, { color: PRIMARY }]}>ID: {user.uniqueIdentifier}</Text>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const ss = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 20,
        borderBottomWidth: 1,
    },
    profileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    userEmail: {
        fontSize: 13,
    },
    qrBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 8,
        marginTop: 20,
        marginLeft: 4,
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    sep: {
        height: 1,
        marginLeft: 56,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        gap: 8,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#FEE2E2',
    },
    logoutText: {
        color: '#EF4444',
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    qrModal: {
        backgroundColor: '#fff',
        padding: 30,
        borderRadius: 24,
        alignItems: 'center',
        width: '80%',
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    qrPlaceholder: {
        padding: 20,
        backgroundColor: '#f9f9f9',
        borderRadius: 16,
        marginBottom: 20,
    },
    idText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});
