import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { freelanceComplianceApi } from '@/services/api';

export default function DocumentStatusPage() {
    const router = useRouter();
    const colors = useThemeColors() as any;
    const isDarkMode = false;

    const [loading, setLoading] = useState(false);
    const [compliance, setCompliance] = useState<any>(null);

    const PAGE_BG = isDarkMode ? '#111111' : '#F4F5F7';
    const CARD_BG = isDarkMode ? '#1C1C1E' : '#FFFFFF';
    const TEXT = isDarkMode ? '#FFFFFF' : '#111827';
    const TEXT_SEC = isDarkMode ? '#8A8A8E' : '#6B7280';
    const BORDER = isDarkMode ? '#3A3A3C' : '#E5E7EB';
    const PRIMARY = colors.primary;

    const load = async () => {
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

    useEffect(() => {
        load();
    }, []);

    const documentsList: any[] = Array.isArray(compliance?.steps?.documents?.documents)
        ? compliance.steps.documents.documents
        : [];

    const uploadedCount = documentsList.length;
    const totalDocs = 1;
    const remainingCount = Math.max(0, totalDocs - uploadedCount);

    const verificationStatus = String(compliance?.steps?.documents?.verificationStatus || 'pending');
    const canUpload = compliance?.steps?.documents?.canUpload !== false;

    const getStatusLabel = () => {
        if (!uploadedCount) return 'Non fourni';
        if (verificationStatus === 'approved') return 'Vérifié';
        if (verificationStatus === 'rejected') return 'Refusé';
        return 'En attente de vérification';
    };

    const getStatusColor = () => {
        if (!uploadedCount) return '#EF4444';
        if (verificationStatus === 'approved') return '#10B981';
        if (verificationStatus === 'rejected') return '#EF4444';
        return '#F59E0B';
    };

    const showAddButton = !uploadedCount || (verificationStatus === 'rejected' && canUpload);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: PAGE_BG }]}>
            <View style={[styles.header, { borderBottomColor: BORDER }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={PRIMARY} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: TEXT }]}>État des documents</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.summaryCard, { backgroundColor: CARD_BG, borderColor: BORDER }]}>
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryVal, { color: PRIMARY }]}>{uploadedCount}</Text>
                        <Text style={[styles.summaryLabel, { color: TEXT_SEC }]}>Uploadés</Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: BORDER }]} />
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryVal, { color: '#F59E0B' }]}>{remainingCount}</Text>
                        <Text style={[styles.summaryLabel, { color: TEXT_SEC }]}>Restants</Text>
                    </View>
                </View>

                {loading ? (
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <ActivityIndicator color={PRIMARY} />
                    </View>
                ) : null}

                <View style={[styles.docItem, { backgroundColor: CARD_BG, borderColor: BORDER }]}> 
                    <View style={[styles.docIcon, { backgroundColor: isDarkMode ? '#242424' : '#F9FAFB' }]}> 
                        <Ionicons name={'document-text-outline' as any} size={20} color={uploadedCount ? PRIMARY : TEXT_SEC} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.docName, { color: TEXT }]}>Documents freelance</Text>
                        <Text style={[styles.docStatusLabel, { color: getStatusColor() }]}> 
                            {getStatusLabel()}
                        </Text>
                    </View>
                    {showAddButton ? (
                        <TouchableOpacity onPress={() => router.push('/(views)/(screens)/profile/document' as any)} style={[styles.addBtn, { borderColor: PRIMARY }]}> 
                            <Text style={[styles.addBtnText, { color: PRIMARY }]}>Ajouter</Text>
                        </TouchableOpacity>
                    ) : verificationStatus === 'pending' ? (
                        <Ionicons name="time-outline" size={20} color="#F59E0B" />
                    ) : (
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    )}
                </View>

                <View style={[styles.infoBox, { backgroundColor: isDarkMode ? '#1a221a' : '#F0FDF4' }]}>
                    <Ionicons name="information-circle-outline" size={18} color={PRIMARY} />
                    <Text style={[styles.infoText, { color: TEXT_SEC }]}>
                        Nous analysons vos documents. Si un document est rejeté, vous recevrez une notification.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 16, fontWeight: '700' },
    content: { padding: 16 },
    
    summaryCard: { 
        flexDirection: 'row', padding: 20, borderRadius: 16, borderWidth: 1, 
        marginBottom: 24, justifyContent: 'space-around', alignItems: 'center' 
    },
    summaryItem: { alignItems: 'center' },
    summaryVal: { fontSize: 24, fontWeight: '800' },
    summaryLabel: { fontSize: 11, fontWeight: '600', marginTop: 4 },
    divider: { width: 1, height: 40 },

    docItem: {
        flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
        borderRadius: 14, borderWidth: 1, marginBottom: 12,
    },
    docIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    docName: { fontSize: 14, fontWeight: '700' },
    docStatusLabel: { fontSize: 12, fontWeight: '500', marginTop: 2 },
    addBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
    addBtnText: { fontSize: 12, fontWeight: '600' },

    infoBox: { flexDirection: 'row', gap: 10, padding: 16, borderRadius: 12, marginTop: 12 },
    infoText: { flex: 1, fontSize: 11, lineHeight: 18 },
});
