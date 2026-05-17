import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTrans } from '@/hooks/useTrans';

export default function CompanionsPage() {
    const { t } = useTrans();
    const router = useRouter();
    const colors = useThemeColors() as any;
    const isDarkMode = false;

    const PAGE_BG = isDarkMode ? '#111111' : '#F4F5F7';
    const CARD_BG = isDarkMode ? '#1C1C1E' : '#FFFFFF';
    const TEXT = isDarkMode ? '#FFFFFF' : '#111827';
    const TEXT_SEC = isDarkMode ? '#8A8A8E' : '#6B7280';
    const BORDER = isDarkMode ? '#3A3A3C' : '#E5E7EB';
    const PRIMARY = colors.primary;

    // TODO: load companions from Redux/API
    const companions: any[] = [];

    return (
        <SafeAreaView style={[cs.container, { backgroundColor: PAGE_BG }]}>
            {/* Header */}
            <View style={[cs.header, { backgroundColor: PAGE_BG, borderBottomColor: BORDER }]}>
                <TouchableOpacity onPress={() => router.back()} style={cs.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Ionicons name="close" size={26} color={PRIMARY} />
                </TouchableOpacity>
                <Text style={[cs.headerTitle, { color: TEXT }]}>{t('Mes compagnons')}</Text>
                <View style={{ width: 36 }} />
            </View>

            <View style={cs.content}>
                {companions.length === 0 ? (
                    /* Empty state */
                    <View style={[cs.emptyCard, { backgroundColor: CARD_BG }]}>
                        <View style={[cs.emptyIcon, { backgroundColor: isDarkMode ? '#1a2e1a' : '#F0FDF4' }]}>
                            <Ionicons name="people-outline" size={44} color={PRIMARY} />
                        </View>
                        <Text style={[cs.emptyTitle, { color: TEXT }]}>{t('Aucun compagnon')}</Text>
                        <Text style={[cs.emptyDesc, { color: TEXT_SEC }]}>
                            {t("Vous n'avez pas encore de compagnons de voyage.")}{'\n'}
                            {t("Connectez-vous avec d'autres pèlerins pour voyager ensemble.")}
                        </Text>
                        <TouchableOpacity style={[cs.addBtn, { backgroundColor: PRIMARY }]}>
                            <Ionicons name="person-add-outline" size={18} color="#fff" />
                            <Text style={cs.addBtnText}>{t('Trouver des compagnons')}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    companions.map((c, i) => (
                        <View key={i} style={[cs.companionCard, { backgroundColor: CARD_BG, borderColor: BORDER }]}>
                            <View style={[cs.avatar, { backgroundColor: PRIMARY + '22' }]}>
                                <Ionicons name="person" size={22} color={PRIMARY} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[cs.companionName, { color: TEXT }]}>{c.name}</Text>
                                <Text style={[cs.companionSub, { color: TEXT_SEC }]}>{c.country}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={TEXT_SEC} />
                        </View>
                    ))
                )}
            </View>
        </SafeAreaView>
    );
}

const cs = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
    },
    closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    content: { padding: 16 },
    emptyCard: { borderRadius: 20, padding: 36, alignItems: 'center', marginTop: 20 },
    emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
    emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 22 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
    addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    companionCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14,
        borderRadius: 16, marginBottom: 10, borderWidth: 1,
    },
    avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    companionName: { fontSize: 15, fontWeight: '600' },
    companionSub: { fontSize: 12, marginTop: 2 },
});
