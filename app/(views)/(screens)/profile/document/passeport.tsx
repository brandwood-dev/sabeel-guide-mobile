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

export default function PasseportScanPage() {
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

    const [scan, setScan] = useState<ScanResult | null>(null);

    const [alert, setAlert] = useState<{
        visible: boolean; title: string; message: string; type: 'success' | 'error' | 'warning';
    }>({ visible: false, title: '', message: '', type: 'success' });

    const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning') => {
        setAlert({ visible: true, title, message, type });
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            showAlert('Permission requise', 'Accès à la caméra nécessaire.', 'error');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            // Passport page is closer to 3:4 or 4:5
            aspect: [3, 4],
            quality: 0.8,
        });

        if (result.canceled) return;

        const asset = result.assets[0];

        setScan({ 
            uri: asset.uri, 
            status: 'success',
            kycMessage: 'Passeport prêt à être envoyé',
        });
    };

    const handleConfirm = async () => {
        if (!scan?.uri || scan.status !== 'success') return;

        setScan({ ...scan, status: 'loading' });
        try {
            const formData = new FormData();
            formData.append('documents', {
                uri: Platform.OS === 'ios' ? scan.uri.replace('file://', '') : scan.uri,
                name: 'passport.jpg',
                type: 'image/jpeg',
            } as any);

            await freelanceComplianceApi.uploadDocuments(formData);
            setScan({ ...scan, status: 'success', kycMessage: 'Passeport envoyé ✓' });
            showAlert('Succès', 'Passeport envoyé pour vérification.', 'success');
        } catch (e: any) {
            setScan({ ...scan, status: 'error', kycMessage: 'Échec envoi passeport' });
            showAlert('Erreur', String(e?.response?.data?.message || e?.message || 'Upload failed'), 'error');
        }
    };

    const borderColor = scan?.status === 'success' ? SUCCESS : scan?.status === 'error' ? ERROR : BORDER;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: PAGE_BG }]}>
            <View style={[styles.header, { borderBottomColor: BORDER }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={PRIMARY} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: TEXT }]}>Passeport</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.subtitle, { color: TEXT_SEC }]}>
                    Scannez la page photo de votre passeport.
                </Text>

                <TouchableOpacity
                    style={[styles.scanCard, { backgroundColor: CARD_BG, borderColor, height: 260 }]}
                    onPress={takePhoto}
                    activeOpacity={0.8}
                    disabled={scan?.status === 'loading'}
                >
                    {scan?.uri ? (
                        <Image source={{ uri: scan.uri }} style={styles.preview} />
                    ) : (
                        <View style={styles.placeholder}>
                            <Ionicons name="book-outline" size={40} color={PRIMARY} />
                            <Text style={[styles.placeholderText, { color: TEXT }]}>Scanner le Passeport</Text>
                        </View>
                    )}

                    {scan?.status === 'loading' && (
                        <View style={styles.overlay}>
                            <ActivityIndicator color="#fff" size="large" />
                            <Text style={styles.overlayText}>Analyse IA...</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {scan?.kycMessage && scan.status !== 'loading' && (
                    <View style={styles.kycFeedback}>
                        <Ionicons name="checkmark-circle" size={14} color={SUCCESS} />
                        <Text style={[styles.kycText, { color: SUCCESS }]}>{scan.kycMessage}</Text>
                    </View>
                )}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: BORDER }]}>
                <TouchableOpacity
                    style={[styles.confirmBtn, { backgroundColor: scan?.status === 'success' ? PRIMARY : BORDER }]}
                    onPress={handleConfirm}
                    disabled={scan?.status !== 'success'}
                >
                    <Text style={[styles.confirmText, { color: scan?.status === 'success' ? '#fff' : TEXT_SEC }]}>Confirmer</Text>
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
    subtitle: { fontSize: 13, textAlign: 'center', marginBottom: 24 },
    scanCard: { width: '100%', height: 220, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
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
