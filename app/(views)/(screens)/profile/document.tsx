import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, useIsDarkMode } from '@/hooks/useThemeColors';
import { useTrans } from '@/hooks/useTrans';
import { freelanceComplianceApi } from '@/services/api';

export default function DocumentsPage() {
    const router = useRouter();
    const colors = useThemeColors() as any;
    const isDarkMode = useIsDarkMode();
    const { t } = useTrans();

    const PAGE_BG = isDarkMode ? '#111111' : '#F4F5F7';
    const CARD_BG = isDarkMode ? '#1C1C1E' : '#FFFFFF';
    const TEXT = isDarkMode ? '#FFFFFF' : '#111827';
    const TEXT_SEC = isDarkMode ? '#8A8A8E' : '#6B7280';
    const BORDER = isDarkMode ? '#3A3A3C' : '#E5E7EB';
    const PRIMARY = colors.primary;

    const [loading, setLoading] = React.useState(false);
    const [compliance, setCompliance] = React.useState<any>(null);

    const loadCompliance = async () => {
        setLoading(true);
        try {
            const res = await freelanceComplianceApi.getMe();
            setCompliance(res.data);
        } catch {
            setCompliance(null);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        loadCompliance();
    }, []);

    const documentsList: any[] = Array.isArray(compliance?.steps?.documents?.documents)
        ? compliance.steps.documents.documents
        : [];
    
    const isPassportUploaded = documentsList.some(d => d.key.toLowerCase().includes('passport'));
    const isCinUploaded = documentsList.some(d => d.key.toLowerCase().includes('cin_recto')) && 
                          documentsList.some(d => d.key.toLowerCase().includes('cin_verso'));
    
    const uploadedCount = (isPassportUploaded ? 1 : 0) + (isCinUploaded ? 1 : 0);
    const totalDocs = 2; // Passport + CIN

    const canUpload = compliance?.steps?.documents?.canUpload !== false;
    const verificationStatus = compliance?.steps?.documents?.verificationStatus || 'pending';
    const rejectReason = compliance?.steps?.documents?.rejectReason;

    const getStatusColor = () => {
        if (verificationStatus === 'approved') return '#10B981';
        if (verificationStatus === 'rejected') return '#EF4444';
        return '#F59E0B';
    };

    return (
        <SafeAreaView style={[ds.container, { backgroundColor: PAGE_BG }]}>
            <View style={[ds.header, { backgroundColor: PAGE_BG, borderBottomColor: BORDER }]}>
                <TouchableOpacity onPress={() => router.back()} style={ds.closeBtn}>
                    <Ionicons name="chevron-back" size={24} color={PRIMARY} />
                </TouchableOpacity>
                <Text style={[ds.headerTitle, { color: TEXT }]}>Mes documents</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={ds.content} showsVerticalScrollIndicator={false}>
                {/* Status Summary Card */}
                <TouchableOpacity
                    style={[ds.statusCard, { backgroundColor: CARD_BG, borderColor: BORDER }]}
                    onPress={() => router.push('/(views)/(screens)/profile/document/status' as any)}
                    activeOpacity={0.8}
                >
                    <View style={ds.statusLabel}>
                        <View style={[ds.statusDot, { backgroundColor: getStatusColor() }]} />
                        <Text style={[ds.statusTitle, { color: TEXT }]}>État de vérification</Text>
                    </View>
                    <View style={ds.statusRight}>
                        <Text style={[ds.statusText, { color: PRIMARY }]}>
                            {uploadedCount}/{totalDocs} Complétés
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={TEXT_SEC} />
                    </View>
                </TouchableOpacity>

                {verificationStatus === 'rejected' && rejectReason && (
                    <View style={ds.rejectBox}>
                        <Ionicons name="alert-circle" size={18} color="#EF4444" />
                        <Text style={ds.rejectText}>Refusé: {rejectReason}</Text>
                    </View>
                )}

                <Text style={[ds.subtitle, { color: TEXT_SEC }]}>
                    Vérifiez votre identité pour accéder à tous les services de la plateforme Sabeel.
                </Text>

                {/* Passport Card */}
                <TouchableOpacity
                    style={[
                        ds.docCard, 
                        { backgroundColor: CARD_BG, borderColor: BORDER },
                        isPassportUploaded && !canUpload && ds.docCardDisabled
                    ]}
                    onPress={() => router.push('/(views)/(screens)/profile/document/passeport' as any)}
                    activeOpacity={0.85}
                    disabled={isPassportUploaded && !canUpload}
                >
                    <View style={[ds.docIcon, { backgroundColor: isDarkMode ? '#242424' : '#F0FDF4' }]}>
                        <Ionicons name="book-outline" size={22} color={PRIMARY} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[ds.docTitle, { color: TEXT }]}>Passeport</Text>
                            {isPassportUploaded && <Ionicons name="checkmark-circle" size={16} color="#10B981" />}
                        </View>
                        <Text style={[ds.docDesc, { color: TEXT_SEC }]}>
                            {isPassportUploaded ? 'Document téléchargé' : 'Scannez la page photo'}
                        </Text>
                    </View>
                    {!isPassportUploaded || canUpload ? (
                        <Ionicons name="add-circle-outline" size={24} color={PRIMARY} />
                    ) : (
                        <Ionicons name="chevron-forward" size={18} color={TEXT_SEC} />
                    )}
                </TouchableOpacity>

                {/* CIN Card */}
                <TouchableOpacity
                    style={[
                        ds.docCard, 
                        { backgroundColor: CARD_BG, borderColor: BORDER },
                        isCinUploaded && !canUpload && ds.docCardDisabled
                    ]}
                    onPress={() => router.push('/(views)/(screens)/profile/document/cin' as any)}
                    activeOpacity={0.85}
                    disabled={isCinUploaded && !canUpload}
                >
                    <View style={[ds.docIcon, { backgroundColor: isDarkMode ? '#242424' : '#F0FDF4' }]}>
                        <Ionicons name="card-outline" size={22} color={PRIMARY} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[ds.docTitle, { color: TEXT }]}>Carte d&apos;identité (CIN)</Text>
                            {isCinUploaded && <Ionicons name="checkmark-circle" size={16} color="#10B981" />}
                        </View>
                        <Text style={[ds.docDesc, { color: TEXT_SEC }]}>
                            {isCinUploaded ? 'Recto et Verso téléchargés' : 'Recto et Verso requis'}
                        </Text>
                    </View>
                    {!isCinUploaded || canUpload ? (
                        <Ionicons name="add-circle-outline" size={24} color={PRIMARY} />
                    ) : (
                        <Ionicons name="chevron-forward" size={18} color={TEXT_SEC} />
                    )}
                </TouchableOpacity>

                {/* Information Box */}
                <View
                    style={[
                        ds.infoBox,
                        { backgroundColor: isDarkMode ? '#1a2e1a' : '#FFFBEB', borderColor: '#F59E0B' + '40' },
                    ]}
                >
                    <Ionicons name="time-outline" size={18} color="#F59E0B" />
                    <View style={{ flex: 1 }}>
                        <Text style={[ds.infoText, { color: '#B45309', fontWeight: '700' }]}>
                            Vérification en cours
                        </Text>
                        <Text style={[ds.infoSubText, { color: '#B45309' }]}>
                            La validation de vos documents peut prendre jusqu'à 48 heures. Vous ne pourrez pas modifier vos documents pendant cette période.
                        </Text>
                    </View>
                </View>

                {loading && (
                    <View style={ds.loadingOverlay}>
                        <ActivityIndicator size="large" color={PRIMARY} />
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const ds = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: { fontSize: 16, fontWeight: '700' },
    content: { padding: 16 },

    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statusLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    statusTitle: { fontSize: 14, fontWeight: '700' },
    statusRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusText: { fontSize: 12, fontWeight: '700' },

    subtitle: { fontSize: 13, lineHeight: 20, marginBottom: 24, textAlign: 'center', paddingHorizontal: 20 },

    docCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 20,
        marginBottom: 14,
        borderWidth: 1,
        backgroundColor: '#FFFFFF',
    },
    docCardDisabled: {
        opacity: 0.7,
        backgroundColor: '#F9FAFB',
    },
    docIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    docTitle: { fontSize: 15, fontWeight: '700' },
    docDesc: { fontSize: 12, marginTop: 2 },

    rejectBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FEF2F2',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },
    rejectText: { color: '#B91C1C', fontSize: 13, fontWeight: '600', flex: 1 },

    infoBox: {
        flexDirection: 'row',
        gap: 12,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 20,
    },
    infoText: { fontSize: 14, marginBottom: 4 },
    infoSubText: { fontSize: 12, lineHeight: 18 },
    loadingOverlay: {
        marginTop: 20,
        alignItems: 'center',
    }
});
