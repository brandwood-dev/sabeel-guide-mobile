import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    SafeAreaView,
    Image,
    Dimensions,
    StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTrans } from '@/hooks/useTrans';
import { useThemeColors } from '@/hooks/useThemeColors';
import { theme } from '@/theme';

const { width } = Dimensions.get('window');

export default function AboutPage() {
    const router = useRouter();
    const { t, language } = useTrans();
    const colors = useThemeColors() as any;
    const isRTL = language === 'ar';

    const objectives = [
        { title: t('Sérénité'), icon: 'leaf-outline' },
        { title: t('Innovation'), icon: 'flash-outline' },
        { title: t('Accompagnement'), icon: 'heart-outline' },
        { title: t('Excellence'), icon: 'ribbon-outline' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={[styles.backBtn, { transform: [{ scaleX: isRTL ? -1 : 1 }] }]}
                >
                    <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('À propos de Sabeel')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.imageHeader}>
                    <View style={styles.logoRing}>
                        <Image 
                            source={require('../../../../assets/images/icon.png')} 
                            style={styles.logo} 
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={styles.appName}>SABEEL</Text>
                    <Text style={styles.appTagline}>{t('L\'excellence au service du sacré')}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('Notre Identité')}</Text>
                    <Text style={[styles.cardDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {t('Sabeel est bien plus qu\'une application ; c\'est un écosystème numérique dédié à l\'accompagnement spirituel. Nous fusionnons tradition et innovation pour offrir aux pèlerins une expérience de voyage fluide, sécurisée et profondément inspirante.')}
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('Notre Mission')}</Text>
                    <Text style={[styles.cardDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {t('Nous œuvrons pour éliminer les barrières logistiques et techniques du pèlerinage. Notre mission est de permettre à chaque pèlerin de se concentrer pleinement sur l\'essentiel : sa dévotion et son élévation spirituelle.')}
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('Valeurs Fondamentales')}</Text>
                    <View style={styles.objectivesGrid}>
                        {objectives.map((obj, i) => (
                            <View key={i} style={styles.objectiveItem}>
                                <View style={styles.objIconBox}>
                                    <Ionicons name={obj.icon as any} size={22} color={theme.colors.primary} />
                                </View>
                                <Text style={styles.objectiveText}>{obj.title}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('Vision Future')}</Text>
                    <Text style={[styles.cardDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {t('Nous aspirons à devenir le standard mondial du pèlerinage connecté, en bâtissant un pont technologique entre les agences de voyages et les pèlerins pour une organisation d\'une qualité sans précédent.')}
                    </Text>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerHeart}>
                        {t('Fait avec ❤️ pour les pèlerins')}
                    </Text>
                    <Text style={styles.footerCopyright}>
                        © 2024 Sabeel Platform. {t('Tous droits réservés.')}
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { height: 64, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
    backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text, letterSpacing: -0.5 },
    scrollContent: { paddingBottom: 48 },
    imageHeader: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#F8FBFA' },
    logoRing: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 16 },
    logo: { width: 80, height: 80 },
    appName: { fontSize: 32, fontWeight: '900', color: theme.colors.primary, letterSpacing: 4 },
    appTagline: { fontSize: 13, marginTop: 4, fontWeight: '800', color: theme.colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
    card: { marginHorizontal: 24, marginTop: 24, borderRadius: 24, padding: 24, backgroundColor: '#fff', borderWidth: 1.5, borderColor: theme.colors.border },
    cardTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.primary, marginBottom: 12, letterSpacing: -0.3 },
    cardDesc: { fontSize: 15, lineHeight: 24, color: theme.colors.textSecondary, fontWeight: '600' },
    objectivesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 16 },
    objectiveItem: { width: '47%', paddingVertical: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16, backgroundColor: theme.colors.surface, borderWidth: 1.5, borderColor: theme.colors.border },
    objIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E8F5F1', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    objectiveText: { fontSize: 13, fontWeight: '800', color: theme.colors.text, textAlign: 'center' },
    footer: { marginTop: 48, alignItems: 'center', paddingBottom: 24 },
    footerHeart: { fontSize: 15, fontWeight: '800', color: theme.colors.textSecondary },
    footerCopyright: { fontSize: 12, marginTop: 6, color: theme.colors.muted, fontWeight: '600' },
});
