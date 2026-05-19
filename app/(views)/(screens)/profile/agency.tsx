import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeColors, useIsDarkMode } from '@/hooks/useThemeColors';
import api from '@/services/api';
import { useUser } from '@/context/UserContext';

export default function AgencyPage() {
    const router = useRouter();
    const colors = useThemeColors() as any;
    const isDarkMode = useIsDarkMode();
    const { user, agencyId } = useUser();

    const PAGE_BG = isDarkMode ? '#111111' : '#F4F5F7';
    const CARD_BG = isDarkMode ? '#1C1C1E' : '#FFFFFF';
    const TEXT = isDarkMode ? '#FFFFFF' : '#111827';
    const TEXT_SEC = isDarkMode ? '#8A8A8E' : '#6B7280';
    const BORDER = isDarkMode ? '#3A3A3C' : '#E5E7EB';
    const PRIMARY = colors.primary;

    const resolvedAgencyId = agencyId ? String(agencyId) : (user?.agencyId ? String(user.agencyId) : '');
    const [loading, setLoading] = useState(false);
    const [agency, setAgency] = useState<any | null>(null);

    const agencyName = useMemo(() => {
        return String(agency?.agencyName || agency?.fullName || agency?.name || '').trim();
    }, [agency]);

    const directorName = useMemo(() => {
        return String(agency?.responsibleName || '').trim();
    }, [agency]);

    const email = useMemo(() => {
        return String(agency?.email || '').trim();
    }, [agency]);

    const phone = useMemo(() => {
        return String(agency?.phoneNumber || '').trim();
    }, [agency]);

    const agencyCode = useMemo(() => {
        return String(agency?.agencyCode || '').trim();
    }, [agency]);

    useEffect(() => {
        let mounted = true;

        const fetchAgency = async () => {
            if (!resolvedAgencyId) {
                setAgency(null);
                return;
            }

            try {
                setLoading(true);
                const res = await api.get(`/admin-agence/auth/public/agencies/${resolvedAgencyId}`);
                const nextAgency = res.data?.agency || res.data || null;
                if (!mounted) return;
                setAgency(nextAgency);
            } catch {
                if (!mounted) return;
                setAgency(null);
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        };

        fetchAgency();
        return () => {
            mounted = false;
        };
    }, [resolvedAgencyId]);

    return (
        <SafeAreaView style={[ags.container, { backgroundColor: PAGE_BG }]}>
            {/* Header */}
            <View style={[ags.header, { backgroundColor: PAGE_BG, borderBottomColor: BORDER }]}>
                <TouchableOpacity onPress={() => router.back()} style={ags.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Ionicons name="chevron-back" size={26} color={PRIMARY} />
                </TouchableOpacity>
                <Text style={[ags.headerTitle, { color: TEXT }]}>Mon agence</Text>

                <View style={{ width: 36 }} />
            </View>

            <View style={ags.content}>
                {loading ? (
                    <View style={[ags.emptyCard, { backgroundColor: CARD_BG, paddingVertical: 28 }]}>
                        <ActivityIndicator color={PRIMARY} />
                        <Text style={[ags.emptyDesc, { color: TEXT_SEC, marginTop: 12, marginBottom: 0 }]}>Chargement...</Text>
                    </View>
                ) : !resolvedAgencyId || !agency ? (
                    <View style={[ags.emptyCard, { backgroundColor: CARD_BG }]}>
                        <View style={[ags.emptyIcon, { backgroundColor: isDarkMode ? '#1a2e1a' : '#F0FDF4' }]}>
                            <Ionicons name="business-outline" size={44} color={PRIMARY} />
                        </View>
                        <Text style={[ags.emptyTitle, { color: TEXT }]}>Aucune agence associée</Text>
                        <Text style={[ags.emptyDesc, { color: TEXT_SEC }]}>
                            Vous n&apos;êtes pas encore associé(e) à une agence de voyage Umrah.{"\n"}
                            Explorez les agences disponibles ou entrez un code d&apos;invitation.
                        </Text>
                    </View>
                ) : (
                    <View style={[ags.agencyCard, { backgroundColor: CARD_BG }]}>
                        <View style={[ags.agencyIcon, { backgroundColor: PRIMARY + '22' }]}>
                            <Ionicons name="business" size={32} color={PRIMARY} />
                        </View>
                        <Text style={[ags.agencyName, { color: TEXT }]}>{agencyName || 'Agence'}</Text>

                        {agencyCode ? (
                            <View style={ags.infoRow}>
                                <Ionicons name="pricetag-outline" size={16} color={PRIMARY} />
                                <Text style={[ags.infoText, { color: TEXT_SEC }]}>{agencyCode}</Text>
                            </View>
                        ) : null}

                        {phone ? (
                            <View style={ags.infoRow}>
                                <Ionicons name="call-outline" size={16} color={PRIMARY} />
                                <Text style={[ags.infoText, { color: TEXT_SEC }]}>{phone}</Text>
                            </View>
                        ) : null}

                        {directorName ? (
                            <View style={ags.infoRow}>
                                <Ionicons name="person-outline" size={16} color={PRIMARY} />
                                <Text style={[ags.infoText, { color: TEXT_SEC }]}>{directorName}</Text>
                            </View>
                        ) : null}

                        {email ? (
                            <View style={ags.infoRow}>
                                <Ionicons name="mail-outline" size={16} color={PRIMARY} />
                                <Text style={[ags.infoText, { color: TEXT_SEC }]}>{email}</Text>
                            </View>
                        ) : null}
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const ags = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
    },
    closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 15, fontWeight: '900', letterSpacing: -0.2 },
    content: { padding: 18 },
    emptyCard: { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 32, alignItems: 'center', marginTop: 10 },
    emptyIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    emptyTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
    emptyDesc: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 20, fontWeight: '500' },
    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginBottom: 10, width: '100%', justifyContent: 'center',
    },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    outlineBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
        borderWidth: 1.5, width: '100%', justifyContent: 'center',
    },
    outlineBtnText: { fontWeight: '700', fontSize: 13 },
    agencyCard: { borderRadius: 20, padding: 24, alignItems: 'center', marginTop: 10 },
    agencyIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    agencyName: { fontSize: 16, fontWeight: '800' },
    agencySub: { fontSize: 12, marginTop: 4, fontWeight: '500' },
    infoRow: {
        marginTop: 10,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 10,
    },
    infoText: {
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
});
