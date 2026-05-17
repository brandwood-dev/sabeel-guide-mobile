import React, { useState, useRef } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    Modal,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTrans } from '@/hooks/useTrans';
import { useThemeColors } from '@/hooks/useThemeColors';

const { width, height } = Dimensions.get('window');

export default function SupportPage() {
    const router = useRouter();
    const { t, language } = useTrans();
    const colors = useThemeColors() as any;
    const isDarkMode = false;
    const isRTL = language === 'ar';

    const [faqVisible, setFaqVisible] = useState(false);
    const [faqSearch, setFaqSearch] = useState('');
    const [userQuestion, setUserQuestion] = useState('');

    const TEXT_COLOR = isDarkMode ? '#FFFFFF' : '#111827';
    const TEXT_SEC = isDarkMode ? '#8A8A8E' : '#6B7280';
    const CARD_BG = isDarkMode ? '#1C1C1E' : '#FFFFFF';
    const BACKGROUND = isDarkMode ? '#000000' : '#F4F5F7';
    const BORDER = isDarkMode ? '#2C2C2E' : '#E5E7EB';

    const faqData = [
        { q: t('Comment changer ma destination ?'), a: t('Vous pouvez ajuster votre itinéraire via l\'onglet Planning Umrah ou en contactant directement votre agence assignée.') },
        { q: t('Comment scanner un QR Code ?'), a: t('Utilisez l\'icône QR Code sur l\'écran d\'accueil ou dans votre profil. L\'accompagnateur scannera votre code pour confirmer votre présence.') },
        { q: t('L\'application fonctionne-t-elle hors ligne ?'), a: t('Oui, les informations essentielles (planning, contacts d\'urgence) sont accessibles sans connexion internet une fois téléchargées.') },
        { q: t('Comment contacter l\'assistance SOS ?'), a: t('Le bouton SOS est situé au centre de votre barre de navigation. Un clic déclenche une alerte immédiate vers votre agence et les secours locaux.') },
    ];

    const supportItems = [
        { 
            title: t('Assistance Technique'), 
            icon: 'construct-outline', 
            desc: t('Résolvez vos problèmes de connexion, de synchronisation ou tout autre bug technique.') 
        },
        { 
            title: t('Espace Documentation'), 
            icon: 'library-outline', 
            desc: t('Consultez nos guides détaillés pour maîtriser toutes les fonctionnalités de Sabeel.') 
        },
        { 
            title: t('Sécurité & Protection'), 
            icon: 'shield-lock-outline', 
            desc: t('Apprenez comment nous protégeons vos données et assurez votre sécurité numérique.') 
        },
        { 
            title: t('Suggestions & Retours'), 
            icon: 'bulb-outline', 
            desc: t('Aidez-nous à améliorer Sabeel en partageant vos idées et votre expérience.') 
        },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: BACKGROUND }]}>
            {/* Header */}
            <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { transform: [{ scaleX: isRTL ? -1 : 1 }] }]}>
                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: TEXT_COLOR }]}>{t('Centre d\'assistance')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Visual Header */}
                <View style={styles.supportHeader}>
                    <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="headset" size={40} color={colors.primary} />
                    </View>
                    <Text style={[styles.supportTitle, { color: TEXT_COLOR }]}>{t('Nous sommes à votre écoute')}</Text>
                    <Text style={[styles.supportSubtitle, { color: TEXT_SEC }]}>
                        {t('Le support Sabeel vous accompagne tout au long de votre parcours. Choisissez une catégorie pour obtenir l\'aide dont vous avez besoin.')}
                    </Text>
                </View>

                {/* Support Sections */}
                {supportItems.map((item, idx) => (
                    <TouchableOpacity 
                        key={idx} 
                        style={[styles.itemCard, { backgroundColor: CARD_BG, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.itemIcon, { backgroundColor: colors.primary + '08' }]}>
                            <Ionicons name={item.icon as any} size={24} color={colors.primary} />
                        </View>
                        <View style={[styles.itemText, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                            <Text style={[styles.itemTitle, { color: TEXT_COLOR }]}>{item.title}</Text>
                            <Text style={[styles.itemDesc, { color: TEXT_SEC, textAlign: isRTL ? 'right' : 'left' }]}>{item.desc}</Text>
                        </View>
                        <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={18} color={BORDER} />
                    </TouchableOpacity>
                ))}
                
                {/* Minimal Footer Info */}
                <View style={{ marginTop: 30, alignItems: 'center', opacity: 0.6 }}>
                    <Text style={{ fontSize: 12, color: TEXT_SEC, textAlign: 'center' }}>
                        {t('Pour toute demande urgente liée à votre voyage, veuillez contacter directement votre agence via l\'onglet Messagerie.')}
                    </Text>
                </View>
            </ScrollView>

            {/* FAQ Modal (Bottom Sheet - Requested Feature) */}
            <Modal
                visible={faqVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setFaqVisible(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setFaqVisible(false)} />
                    <View style={[styles.faqSheet, { backgroundColor: CARD_BG }]}>
                        <View style={[styles.sheetHandle, { backgroundColor: BORDER }]} />
                        
                        <View style={styles.faqSheetHeader}>
                            <Text style={[styles.sheetTitle, { color: TEXT_COLOR }]}>{t('Questions Fréquentes')}</Text>
                            <TouchableOpacity onPress={() => setFaqVisible(false)}>
                                <Ionicons name="close" size={24} color={TEXT_SEC} />
                            </TouchableOpacity>
                        </View>

                        <TextInput 
                            style={[styles.faqSearch, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F2F2F2', color: TEXT_COLOR }]}
                            placeholder={t('Rechercher une question...')}
                            placeholderTextColor={TEXT_SEC}
                            value={faqSearch}
                            onChangeText={setFaqSearch}
                        />

                        <ScrollView style={{ maxHeight: height * 0.5 }} showsVerticalScrollIndicator={false}>
                            {faqData.map((item, i) => (
                                <View key={i} style={[styles.faqItem, { borderBottomColor: BORDER }]}>
                                    <Text style={[styles.faqQ, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>{item.q}</Text>
                                    <Text style={[styles.faqA, { color: TEXT_SEC, textAlign: isRTL ? 'right' : 'left' }]}>{item.a}</Text>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.faqContactBox}>
                            <Text style={[styles.faqContactTitle, { color: TEXT_COLOR }]}>{t('Vous ne trouvez pas de réponse ?')}</Text>
                            <View style={styles.faqInputRow}>
                                <TextInput 
                                    style={[styles.faqInput, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F2F2F2', color: TEXT_COLOR }]}
                                    placeholder={t('Posez votre question...')}
                                    placeholderTextColor={TEXT_SEC}
                                    value={userQuestion}
                                    onChangeText={setUserQuestion}
                                />
                                <TouchableOpacity style={[styles.faqSendBtn, { backgroundColor: colors.primary }]}>
                                    <Ionicons name="send" size={18} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { height: 60, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    scrollContent: { padding: 20, paddingBottom: 40 },
    supportHeader: { alignItems: 'center', marginBottom: 25 },
    iconBox: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
    supportTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
    supportSubtitle: { fontSize: 14, textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },
    faqBanner: { 
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
        paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, marginBottom: 20,
        elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 5
    },
    faqBannerText: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 12 },
    itemCard: { borderRadius: 20, padding: 16, marginBottom: 12, alignItems: 'center' },
    itemIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginHorizontal: 12 },
    itemText: { flex: 1 },
    itemTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    itemDesc: { fontSize: 13, lineHeight: 18 },
    contactCard: { marginTop: 20, borderRadius: 24, padding: 20, elevation: 2 },
    contactTitle: { fontSize: 18, fontWeight: '800', marginBottom: 15 },
    input: { borderRadius: 12, padding: 12, fontSize: 14, minHeight: 100, marginBottom: 15 },
    sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
    sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    faqSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20, paddingBottom: 40 },
    sheetHandle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 15 },
    faqSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sheetTitle: { fontSize: 20, fontWeight: '800' },
    faqSearch: { height: 46, borderRadius: 14, paddingHorizontal: 16, marginBottom: 20 },
    faqItem: { paddingVertical: 15, borderBottomWidth: 1 },
    faqQ: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
    faqA: { fontSize: 14, lineHeight: 20 },
    faqContactBox: { marginTop: 20, paddingTop: 10 },
    faqContactTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
    faqInputRow: { flexDirection: 'row', gap: 10 },
    faqInput: { flex: 1, height: 46, borderRadius: 14, paddingHorizontal: 16 },
    faqSendBtn: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }
});
