import React, { useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Button } from '@/components/common/Button';

const { width } = Dimensions.get('window');

// Local component for review item
const LocalReviewItem = ({ review }: any) => {
    return (
        <View style={styles.reviewItem}>
            <View style={styles.reviewHeader}>
                <View style={styles.reviewUser}>
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{review.userName?.[0] || 'U'}</Text>
                    </View>
                    <View>
                        <Text style={styles.reviewUserName}>{review.userName || 'Utilisateur Sabeel'}</Text>
                        <Text style={styles.reviewDate}>{review.date || 'Il y a 2 jours'}</Text>
                    </View>
                </View>
                <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons
                            key={s}
                            name="star"
                            size={12}
                            color={s <= review.rating ? theme.colors.accent : theme.colors.divider}
                        />
                    ))}
                </View>
            </View>
            <Text style={styles.reviewComment}>{review.comment}</Text>
        </View>
    );
};

export default function ProfileAgenceScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const agencyName = params.agencyName as string || 'Sabeel Travel';
    
    const [reviewsModalVisible, setReviewsModalVisible] = useState(false);

    // Mock reviews
    const agencyReviews = [
        { id: 1, userName: 'Ahmed K.', rating: 5, comment: 'Excellente organisation, l\'agence a été très professionnelle du début à la fin.', date: '12 Mars 2024' },
        { id: 2, userName: 'Sami B.', rating: 4, comment: 'Bon accompagnement spirituel, merci à toute l\'équipe.', date: '05 Mars 2024' }
    ];

    const agencyData = {
        name: agencyName,
        logo: require('../../../../assets/images/icon.png'), // Corrected path (4 levels up)
        coverImage: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1000&auto=format&fit=crop',
        rating: 4.8,
        reviews: agencyReviews.length,
        slogan: 'Votre compagnon spirituel pour un voyage sacré inoubliable.',
        stats: [
            { label: 'Pèlerins', value: '5000+' },
            { label: 'Expérience', value: '14 ans' },
            { label: 'Certifié', value: 'Oui' },
        ],
        description: 'Agence spécialisée dans l\'organisation de voyages Omra et Hajj depuis 2010. Nous offrons des services de qualité avec des guides expérimentés et un accompagnement spirituel personnalisé tout au long de votre séjour sacré.',
        phone: '+216 71 123 456',
        whatsapp: '+216 99 000 000',
        email: 'contact@sabeeltravel.tn',
        address: params.address as string || 'Avenue Habib Bourguiba, Tunis 1000',
        services: [
            'Visa Omra & Hajj',
            'Réservation Hôtels 5*',
            'Vols Directs',
            'Guides Spirituels Certifiés',
            'Transport VIP',
            'Ziyarat Médine & Mecque'
        ],
    };

    const callAgency = () => Linking.openURL(`tel:${agencyData.phone}`);
    const whatsappAgency = () => {
        const message = `Salem! Je vous contacte via Sabeel à propos de vos services d'agence ${agencyData.name}.`;
        Linking.openURL(`whatsapp://send?phone=${agencyData.whatsapp}&text=${encodeURIComponent(message)}`);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <Modal visible={reviewsModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setReviewsModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Avis & Témoignages</Text>
                        <TouchableOpacity onPress={() => setReviewsModalVisible(false)} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={agencyReviews}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => <LocalReviewItem review={item} />}
                        contentContainerStyle={{ padding: 24 }}
                    />
                </View>
            </Modal>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.heroSection}>
                    <Image source={{ uri: agencyData.coverImage }} style={styles.coverImage} />
                    <View style={styles.overlay} />
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton}>
                            <Ionicons name="share-social" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Profile Card Overlay */}
                <View style={ss.profileCard}>
                    <View style={ss.logoContainer}>
                        <Image source={agencyData.logo} style={ss.agencyLogo} resizeMode="contain" />
                    </View>

                    <Text style={ss.agencyNameTitle}>{agencyData.name}</Text>
                    <Text style={ss.agencySlogan}>{agencyData.slogan}</Text>

                    <TouchableOpacity 
                        style={ss.ratingBadge}
                        onPress={() => setReviewsModalVisible(true)}
                    >
                        <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map((s) => (
                                <Ionicons key={s} name="star" size={14} color={theme.colors.accent} />
                            ))}
                        </View>
                        <Text style={ss.ratingTextSmall}>
                            4.8 ({agencyData.reviews} avis)
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
                    </TouchableOpacity>

                    {/* Stats Section */}
                    <View style={ss.statsBar}>
                        {agencyData.stats.map((stat, idx) => (
                            <View key={idx} style={[ss.statItem, idx !== 0 && { borderLeftWidth: 1, borderLeftColor: theme.colors.divider }]}>
                                <Text style={ss.statValue}>{stat.value}</Text>
                                <Text style={ss.statLabel}>{stat.label}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* About Section */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitleMain}>À propos</Text>
                    <Text style={styles.descriptionText}>{agencyData.description}</Text>
                </View>

                {/* Actions Section */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitleMain}>Contact & Réservation</Text>
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.actionBtn} onPress={callAgency}>
                            <Ionicons name="call-outline" size={20} color={theme.colors.primary} />
                            <Text style={styles.actionBtnText}>Appeler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={whatsappAgency}>
                            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                            <Text style={styles.actionBtnText}>WhatsApp</Text>
                        </TouchableOpacity>
                    </View>
                    <Button 
                        title="Demander un devis" 
                        onPress={() => Alert.alert('Réservation', 'Demande envoyée à l\'agence.')} 
                        style={styles.mainActionBtn}
                    />
                </View>

                {/* Services Section */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitleMain}>Nos Services</Text>
                    <View style={styles.servicesGrid}>
                        {agencyData.services.map((service, index) => (
                            <View key={index} style={styles.serviceItem}>
                                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                                <Text style={styles.serviceItemText}>{service}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const ss = StyleSheet.create({
    profileCard: { 
        marginHorizontal: 20, 
        borderRadius: 32, 
        padding: 24, 
        marginTop: -60, 
        backgroundColor: '#FFFFFF',
        elevation: 10, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 10 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 20, 
        alignItems: 'center' 
    },
    logoContainer: { 
        width: 88, 
        height: 88, 
        borderRadius: 24, 
        padding: 16, 
        marginTop: -68, 
        backgroundColor: '#FFFFFF',
        elevation: 6, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.12, 
        shadowRadius: 8 
    },
    agencyLogo: { width: '100%', height: '100%' },
    agencyNameTitle: { fontSize: 24, fontWeight: '900', color: theme.colors.text, marginTop: 16, textAlign: 'center', letterSpacing: -0.5 },
    agencySlogan: { fontSize: 14, textAlign: 'center', color: theme.colors.textSecondary, marginTop: 6, opacity: 0.8 },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 16, gap: 8 },
    ratingTextSmall: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
    statsBar: { flexDirection: 'row', width: '100%', marginTop: 28, borderRadius: 20, backgroundColor: theme.colors.surface, paddingVertical: 20 },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: '900', color: theme.colors.primary },
    statLabel: { fontSize: 12, marginTop: 4, fontWeight: '700', color: theme.colors.muted },
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { paddingBottom: 40 },
    heroSection: { height: 240, position: 'relative' },
    coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
    header: { position: 'absolute', top: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 10 },
    iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    sectionContainer: { paddingHorizontal: 24, marginTop: 32 },
    sectionTitleMain: { fontSize: 20, fontWeight: '900', color: theme.colors.text, marginBottom: 16, letterSpacing: -0.5 },
    descriptionText: { fontSize: 15, lineHeight: 24, color: theme.colors.textSecondary },
    actionRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: 16, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
    actionBtnText: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
    mainActionBtn: { height: 56, borderRadius: 16 },
    servicesGrid: { gap: 14 },
    serviceItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    serviceItemText: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
    modalContainer: { flex: 1, backgroundColor: theme.colors.background },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
    modalTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text },
    closeButton: { padding: 4 },
    reviewItem: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    reviewUser: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F5F1', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: theme.colors.primary, fontWeight: '900', fontSize: 16 },
    reviewUserName: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
    reviewDate: { fontSize: 13, color: theme.colors.muted, marginTop: 2 },
    starsRow: { flexDirection: 'row', gap: 2 },
    reviewComment: { fontSize: 15, lineHeight: 22, color: theme.colors.textSecondary, marginTop: 8 },
});
