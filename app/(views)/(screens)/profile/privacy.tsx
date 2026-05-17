import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTrans } from '@/hooks/useTrans';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function PrivacyPage() {
    const router = useRouter();
    const { t, language } = useTrans();
    const colors = useThemeColors() as any;
    const isDarkMode = false;
    const isRTL = language === 'ar';

    const TEXT_COLOR = isDarkMode ? '#FFFFFF' : '#111827';
    const TEXT_SEC = isDarkMode ? '#8A8A8E' : '#6B7280';
    const CARD_BG = isDarkMode ? '#1C1C1E' : '#FFFFFF';
    const BACKGROUND = isDarkMode ? '#000000' : '#F4F5F7';

    const sections = [
        {
            title: t('Engagement de Confidentialité'),
            content: t('Sabeel s\'engage à préserver l\'intégrité et la confidentialité de vos informations. Nous appliquons des principes de minimisation des données, ne collectant que les éléments strictement nécessaires au bon déroulement de votre pèlerinage et à votre sécurité.'),
            icon: 'shield-outline'
        },
        {
            title: t('Souveraineté des Données'),
            content: t('Vous demeurez l\'unique propriétaire de vos informations. À tout moment, vous disposez d\'un droit d\'accès, de rectification et de suppression totale de vos données personnelles, documents de voyage et historique de localisation via les paramètres de votre compte.'),
            icon: 'finger-print-outline'
        },
        {
            title: t('Sécurité Avancée'),
            content: t('Vos documents sensibles (passeports, visas) bénéficient d\'un chiffrement de bout en bout et sont hébergés sur des infrastructures hautement sécurisées. L\'accès à ces informations est strictement restreint et surveillé pour prévenir toute utilisation non autorisée.'),
            icon: 'lock-sealed-outline'
        }
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: BACKGROUND }]}>
            <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={[styles.backBtn, { transform: [{ scaleX: isRTL ? -1 : 1 }] }]}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: TEXT_COLOR }]}>{t('Confidentialité')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.iconHeader}>
                    <View style={[styles.mainIconContainer, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="shield-checkmark" size={60} color={colors.primary} />
                    </View>
                    <Text style={[styles.mainTitle, { color: TEXT_COLOR }]}>{t('Votre vie privée est notre priorité')}</Text>
                    <Text style={[styles.mainSubtitle, { color: TEXT_SEC }]}>
                        {t('Sabeel s\'engage à protéger vos données tout au long de votre voyage spirituel.')}
                    </Text>
                </View>

                {sections.map((section, index) => (
                    <View key={index} style={[styles.sectionCard, { backgroundColor: CARD_BG, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '10' }]}>
                            <Ionicons name={section.icon as any} size={24} color={colors.primary} />
                        </View>
                        <View style={[styles.sectionText, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                            <Text style={[styles.sectionTitle, { color: TEXT_COLOR }]}>{section.title}</Text>
                            <Text style={[styles.sectionDesc, { color: TEXT_SEC, textAlign: isRTL ? 'right' : 'left' }]}>
                                {section.content}
                            </Text>
                        </View>
                    </View>
                ))}

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: TEXT_SEC }]}>
                        {t('Dernière mise à jour : Mars 2024')}
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: 60,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    iconHeader: {
        alignItems: 'center',
        marginBottom: 30,
    },
    mainIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    mainTitle: {
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    mainSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 20,
    },
    sectionCard: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        alignItems: 'flex-start',
    },
    sectionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 12,
    },
    sectionText: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
    },
    sectionDesc: {
        fontSize: 14,
        lineHeight: 20,
    },
    footer: {
        marginTop: 20,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        fontStyle: 'italic',
    },
});
