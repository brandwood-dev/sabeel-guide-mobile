import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTrans } from '@/hooks/useTrans';
import { useThemeColors, useIsDarkMode } from '@/hooks/useThemeColors';

const { width } = Dimensions.get('window');

export default function FAQPage() {
    const router = useRouter();
    const { t, language } = useTrans();
    const colors = useThemeColors() as any;
    const isDarkMode = useIsDarkMode();
    const isRTL = language === 'ar';

    const [searchQuery, setSearchQuery] = useState('');

    const TEXT_COLOR = isDarkMode ? '#FFFFFF' : '#111827';
    const TEXT_SEC = isDarkMode ? '#8A8A8E' : '#6B7280';
    const CARD_BG = isDarkMode ? '#1C1C1E' : '#FFFFFF';
    const BACKGROUND = isDarkMode ? '#000000' : '#F4F5F7';
    const BORDER = isDarkMode ? '#2C2C2E' : '#E5E7EB';

    const faqData = [
        { 
            q: t('Comment changer ma destination ?'), 
            a: t('Vous pouvez ajuster votre itinéraire via l\'onglet Planning Umrah ou en contactant directement votre agence assignée.') 
        },
        { 
            q: t('Comment scanner un QR Code ?'), 
            a: t("Utilisez l'icône QR Code sur l'écran d'accueil ou dans votre profil. L'accompagnateur scannera votre code pour confirmer votre présence.") 
        },
        { 
            q: t("L'application fonctionne-t-elle hors ligne ?"), 
            a: t("Oui, les informations essentielles (planning, contacts d'urgence) sont accessibles sans connexion internet une fois téléchargées.") 
        },
        { 
            q: t("Comment contacter l'assistance SOS ?"), 
            a: t("Le bouton SOS est situé au centre de votre barre de navigation. Un clic déclenche une alerte immédiate vers votre agence et les secours locaux.") 
        },
        {
            q: t('Comment ajouter un compagnon ?'),
            a: t('Allez dans "Mes compagnons" et cliquez sur "Ajouter". Vous pouvez alors lier le compte de vos parents ou amis.')
        },
        {
            q: t("Qu'est-ce que le portefeuille Sabeel ?"),
            a: t("C'est votre espace sécurisé pour stocker vos documents de voyage (Passeport, Visa, Assurance) et accéder à vos réservations.")
        }
    ];

    const filteredFAQ = faqData.filter(item => 
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.a.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: BACKGROUND }]}>
            {/* Header */}
            <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={[styles.backBtn, { transform: [{ scaleX: isRTL ? -1 : 1 }] }]}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: TEXT_COLOR }]}>{t('FAQ')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: CARD_BG, borderColor: BORDER }]}>
                    <Ionicons name="search-outline" size={20} color={TEXT_SEC} style={{ marginHorizontal: 12 }} />
                    <TextInput
                        style={[styles.searchInput, { color: TEXT_COLOR, textAlign: isRTL ? 'right' : 'left' }]}
                        placeholder={t('Rechercher une question...')}
                        placeholderTextColor={TEXT_SEC}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {filteredFAQ.length > 0 ? (
                    filteredFAQ.map((item, index) => (
                        <View key={index} style={[styles.faqCard, { backgroundColor: CARD_BG }]}>
                            <View style={[styles.qHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <View style={[styles.qIcon, { backgroundColor: colors.primary + '10' }]}>
                                    <Ionicons name="help" size={18} color={colors.primary} />
                                </View>
                                <Text style={[styles.faqQ, { color: TEXT_COLOR, textAlign: isRTL ? 'right' : 'left' }]}>{item.q}</Text>
                            </View>
                            <Text style={[styles.faqA, { color: TEXT_SEC, textAlign: isRTL ? 'right' : 'left' }]}>{item.a}</Text>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="search" size={48} color={TEXT_SEC} />
                        <Text style={[styles.emptyText, { color: TEXT_SEC }]}>{t('Aucun résultat trouvé.')}</Text>
                    </View>
                )}
                
                <View style={[styles.footer, { backgroundColor: CARD_BG }]}>
                    <Text style={[styles.footerText, { color: TEXT_COLOR }]}>{t('Besoin de plus d\'aide ?')}</Text>
                    <TouchableOpacity 
                        style={[styles.supportBtn, { backgroundColor: colors.primary }]}
                        onPress={() => router.push('/profile/support' as any)}
                    >
                        <Text style={styles.supportBtnText}>{t('Contacter le Support')}</Text>
                        <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={16} color="#fff" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { height: 60, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    searchContainer: { paddingHorizontal: 20, paddingVertical: 10 },
    searchBar: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        height: 50, 
        borderRadius: 14, 
        borderWidth: 1 
    },
    searchInput: { flex: 1, fontSize: 15, height: '100%' },
    scrollContent: { padding: 20, paddingBottom: 40 },
    faqCard: { borderRadius: 20, padding: 18, marginBottom: 16 },
    qHeader: { alignItems: 'center', marginBottom: 12, gap: 12 },
    qIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    faqQ: { flex: 1, fontSize: 16, fontWeight: '800', lineHeight: 22 },
    faqA: { fontSize: 14, lineHeight: 22 },
    emptyState: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 16, fontSize: 16 },
    footer: { marginTop: 20, borderRadius: 20, padding: 25, alignItems: 'center' },
    footerText: { fontSize: 16, fontWeight: '700', marginBottom: 15 },
    supportBtn: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingVertical: 12, 
        borderRadius: 12 
    },
    supportBtnText: { color: '#fff', fontWeight: '700' }
});
