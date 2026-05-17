import React, { useState } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity,
    Image, ActivityIndicator, ScrollView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors } from '@/hooks/useThemeColors';
import { CustomAlert } from '@/components/ui/CustomAlert';
import { freelanceComplianceApi } from '@/services/api';

type ScanStatus = 'idle' | 'loading' | 'success' | 'error';

interface ScanResult {
    uri: string;
    status: ScanStatus;
    kycMessage?: string;
    brightnessScore?: number;
    sharpnessScore?: number;
}

export default function CINScanPage() {
    const router = useRouter();
    const colors = useThemeColors() as any;
    const isDarkMode = false; // Mock

    const PAGE_BG = isDarkMode ? '#111111' : '#F4F5F7';
    const CARD_BG = isDarkMode ? '#1C1C1E' : '#FFFFFF';
    const TEXT = isDarkMode ? '#FFFFFF' : '#111827';
    const TEXT_SEC = isDarkMode ? '#8A8A8E' : '#6B7280';
    const BORDER = isDarkMode ? '#3A3A3C' : '#E5E7EB';
    const PRIMARY = colors.primary;
    const SUCCESS = '#2C5F2D';
    const ERROR = '#EF4444';

    const [recto, setRecto] = useState<ScanResult | null>(null);
    const [verso, setVerso] = useState<ScanResult | null>(null);

    const [alert, setAlert] = useState<{
        visible: boolean; title: string; message: string; type: 'success' | 'error' | 'warning';
    }>({ visible: false, title: '', message: '', type: 'success' });

    const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning') => {
        setAlert({ visible: true, title, message, type });
    };

    const takePhoto = async (side: 'recto' | 'verso') => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            showAlert('Permission requise', 'Accès à la caméra nécessaire.', 'error');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [3, 2],
            quality: 0.8,
        });

        if (result.canceled) return;

        const asset = result.assets[0];

        const scanResult: ScanResult = {
            uri: asset.uri,
            status: 'success',
            kycMessage: 'Face capturée ✓',
        };
        if (side === 'recto') setRecto(scanResult);
        else setVerso(scanResult);
    };

    const handleConfirm = async () => {
        if (!recto?.uri || !verso?.uri) return;

        setRecto({ ...recto, status: 'loading' });
        setVerso({ ...verso, status: 'loading' });

        try {
            const formData = new FormData();
            formData.append('documents', {
                uri: Platform.OS === 'ios' ? recto.uri.replace('file://', '') : recto.uri,
                name: 'cin_recto.jpg',
                type: 'image/jpeg',
            } as any);
            formData.append('documents', {
                uri: Platform.OS === 'ios' ? verso.uri.replace('file://', '') : verso.uri,
                name: 'cin_verso.jpg',
                type: 'image/jpeg',
            } as any);

            await freelanceComplianceApi.uploadDocuments(formData);
            
            setRecto({ ...recto, status: 'success', kycMessage: 'Recto envoyé ✓' });
            setVerso({ ...verso, status: 'success', kycMessage: 'Verso envoyé ✓' });
            
            showAlert('Succès', 'Carte d\'identité envoyée avec succès !', 'success');
        } catch (e: any) {
            setRecto({ ...recto, status: 'error' });
            setVerso({ ...verso, status: 'error' });
            showAlert('Erreur', String(e?.response?.data?.message || e?.message || 'Upload failed'), 'error');
        }
    };

    const renderCard = (label: string, side: 'recto' | 'verso', data: ScanResult | null) => {
        const borderColor = data?.status === 'success' ? SUCCESS : data?.status === 'error' ? ERROR : BORDER;

        return (
            <View>
                <TouchableOpacity
                    style={[styles.scanCard, { backgroundColor: CARD_BG, borderColor }]}
                    onPress={() => takePhoto(side)}
                    activeOpacity={0.8}
                    disabled={data?.status === 'loading'}
                >
                    {data?.uri ? (
                        <Image source={{ uri: data.uri }} style={styles.preview} />
                    ) : (
                        <View style={styles.placeholder}>
                            <Ionicons name="camera-outline" size={32} color={PRIMARY} />
                            <Text style={[styles.placeholderText, { color: TEXT }]}>{label}</Text>
                        </View>
                    )}

                    {data?.status === 'loading' && (
                        <View style={styles.overlay}>
                            <ActivityIndicator color="#fff" size="large" />
                            <Text style={styles.overlayText}>Analyse IA...</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {data?.kycMessage && data.status !== 'loading' && (
                    <View style={styles.kycFeedback}>
                        <Ionicons name="checkmark-circle" size={14} color={SUCCESS} />
                        <Text style={[styles.kycText, { color: SUCCESS }]}>{data.kycMessage}</Text>
                    </View>
                )}
            </View>
        );
    };

    const bothValid = recto?.status === 'success' && verso?.status === 'success';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: PAGE_BG }]}>
            <View style={[styles.header, { borderBottomColor: BORDER }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={PRIMARY} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: TEXT }]}>Carte d&apos;identité (CIN)</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.subtitle, { color: TEXT_SEC }]}>
                    Scannez les deux faces de votre carte d&apos;identité.
                </Text>

                <Text style={[styles.sectionLabel, { color: TEXT }]}>Face Recto</Text>
                {renderCard('Scanner le Recto', 'recto', recto)}
                
                <View style={{ height: 20 }} />

                <Text style={[styles.sectionLabel, { color: TEXT }]}>Face Verso</Text>
                {renderCard('Scanner le Verso', 'verso', verso)}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: BORDER }]}>
                <TouchableOpacity
                    style={[styles.confirmBtn, { backgroundColor: bothValid ? PRIMARY : BORDER }]}
                    onPress={handleConfirm}
                    disabled={!bothValid}
                >
                    <Text style={[styles.confirmText, { color: bothValid ? '#fff' : TEXT_SEC }]}>Confirmer</Text>
                </TouchableOpacity>
            </View>

            <CustomAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onClose={() => {
                    setAlert({ ...alert, visible: false });
                    if (alert.type === 'success') router.back();
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
    backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 16, fontWeight: '700' },
    content: { padding: 20 },
    subtitle: { fontSize: 13, textAlign: 'center', marginBottom: 20 },
    sectionLabel: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
    scanCard: { width: '100%', height: 180, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    placeholder: { alignItems: 'center' },
    placeholderText: { fontSize: 14, fontWeight: 'bold' },
    preview: { width: '100%', height: '100%' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
    overlayText: { color: '#fff', fontWeight: 'bold', marginTop: 10 },
    kycFeedback: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
    kycText: { fontSize: 12, fontWeight: '600' },
    footer: { padding: 20, borderTopWidth: 1 },
    confirmBtn: { height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    confirmText: { fontSize: 15, fontWeight: 'bold' },
});
