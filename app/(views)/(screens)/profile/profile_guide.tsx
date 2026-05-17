import React, { useState } from 'react';
import {
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Alert,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { theme } from '@/theme';
import { Button } from '@/components/common/Button';

const { width } = Dimensions.get('window');

export default function GuideProfileScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const {
        guideId = '1',
        guideName = 'Guide Sabeel',
        guideRating = '4.9',
        guideReviews = '120',
        guideExperience = '5',
        guidePrice = '150',
        guideLanguages = 'Arabe,Français,Anglais',
        guideSpecialties = 'Accompagnement Spirituel,Histoire de Makkah',
        guideLocation = 'Makkah, Arabie Saoudite',
    } = params;

    const languages = typeof guideLanguages === 'string' ? guideLanguages.split(',') : [];
    const specialties = typeof guideSpecialties === 'string' ? guideSpecialties.split(',') : [];

    const handleChatPress = () => {
        Alert.alert('Message', `Démarrer une conversation avec ${guideName}`);
    };

    const handleBookingPress = () => {
        Alert.alert('Réservation', `Demande de réservation envoyée à ${guideName}`);
    };

    const mockReviews = [
        {
            id: '1',
            userName: 'Ahmed Ben Ali',
            rating: 5,
            comment: 'Excellent guide, très professionnel et à l\'écoute. Je recommande vivement !',
            date: 'Il y a 2 jours',
        },
        {
            id: '2',
            userName: 'Fatima Zahra',
            rating: 5,
            comment: 'Guide exceptionnel qui connaît parfaitement les lieux saints. Merci pour cette belle expérience.',
            date: 'Il y a 1 semaine',
        }
    ];

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profil du Guide</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.imageContainer}>
                        <View style={styles.profileImagePlaceholder}>
                            <Ionicons name="person" size={64} color={theme.colors.primary} />
                        </View>
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-sharp" size={36} color={theme.colors.primary} />
                        </View>
                    </View>

                    <Text style={styles.guideName}>{guideName}</Text>

                    <View style={styles.locationContainer}>
                        <Ionicons name="location-outline" size={16} color={theme.colors.muted} />
                        <Text style={styles.locationText}>{guideLocation}</Text>
                    </View>

                    <TouchableOpacity style={styles.ratingContainer}>
                        <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map((s) => (
                                <Ionicons key={s} name="star" size={16} color={theme.colors.accent} />
                            ))}
                        </View>
                        <Text style={styles.ratingText}>{guideRating}</Text>
                        <Text style={styles.reviewsText}>({guideReviews} avis)</Text>
                    </TouchableOpacity>

                    <View style={styles.badgeContainer}>
                        <View style={styles.experienceBadge}>
                            <Text style={styles.experienceText}>{guideExperience} ans d&apos;expérience</Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.chatButtonLarge} onPress={handleChatPress}>
                            <Ionicons name="chatbubble-ellipses-outline" size={22} color={theme.colors.primary} />
                            <Text style={styles.chatButtonText}>Message</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.bookButtonLarge}
                            onPress={handleBookingPress}
                        >
                            <Ionicons name="calendar-outline" size={22} color="#fff" />
                            <Text style={styles.bookButtonText}>Réserver</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Info Cards */}
                <View style={styles.infoSection}>
                    <View style={styles.infoCard}>
                        <View style={styles.infoCardHeader}>
                            <View style={styles.infoIconBox}>
                                <Ionicons name="cash-outline" size={20} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.infoCardTitle}>Tarif journalier</Text>
                        </View>
                        <Text style={styles.priceText}>{guidePrice} TND <Text style={{ fontSize: 16, color: theme.colors.muted }}>/ jour</Text></Text>
                    </View>

                    <View style={styles.infoCard}>
                        <View style={styles.infoCardHeader}>
                            <View style={styles.infoIconBox}>
                                <Ionicons name="globe-outline" size={20} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.infoCardTitle}>Langues parlées</Text>
                        </View>
                        <View style={styles.chipList}>
                            {languages.map((lang, index) => (
                                <View key={index} style={styles.languageChip}>
                                    <Text style={styles.languageChipText}>{lang.trim()}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.infoCard}>
                        <View style={styles.infoCardHeader}>
                            <View style={styles.infoIconBox}>
                                <Ionicons name="school-outline" size={20} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.infoCardTitle}>Spécialités</Text>
                        </View>
                        <View style={styles.chipList}>
                            {specialties.map((spec, index) => (
                                <View key={index} style={styles.specialtyChip}>
                                    <Text style={styles.specialtyChipText}>{spec.trim()}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Reviews Section */}
                <View style={styles.reviewsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Avis récents</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>Voir tous</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {mockReviews.map((review) => (
                        <View key={review.id} style={styles.reviewCard}>
                            <View style={styles.reviewInnerHeader}>
                                <View style={styles.reviewerInfo}>
                                    <View style={styles.reviewerAvatar}>
                                        <Text style={styles.avatarLetter}>{review.userName[0]}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.reviewerName}>{review.userName}</Text>
                                        <Text style={styles.reviewDate}>{review.date}</Text>
                                    </View>
                                </View>
                                <View style={styles.starsRowSmall}>
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Ionicons key={s} name="star" size={12} color={s <= review.rating ? theme.colors.accent : theme.colors.divider} />
                                    ))}
                                </View>
                            </View>
                            <Text style={styles.reviewComment}>{review.comment}</Text>
                        </View>
                    ))}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { paddingBottom: 24 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text, letterSpacing: -0.5 },
    profileSection: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, backgroundColor: '#fff', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
    imageContainer: { position: 'relative', marginBottom: 20 },
    profileImagePlaceholder: { width: 128, height: 128, borderRadius: 64, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F5F1', borderWidth: 4, borderColor: '#fff' },
    verifiedBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#fff', borderRadius: 20 },
    guideName: { fontSize: 24, fontWeight: '900', color: theme.colors.text, marginBottom: 8, letterSpacing: -0.5 },
    locationContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
    locationText: { fontSize: 15, color: theme.colors.textSecondary, fontWeight: '600' },
    ratingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: theme.colors.surface, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 10 },
    starsRow: { flexDirection: 'row', gap: 2 },
    ratingText: { fontSize: 18, fontWeight: '900', color: theme.colors.text, marginLeft: 4 },
    reviewsText: { fontSize: 14, color: theme.colors.muted, fontWeight: '700' },
    badgeContainer: { marginBottom: 28 },
    experienceBadge: { backgroundColor: '#E8F5F1', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
    experienceText: { fontSize: 14, fontWeight: '900', color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
    actionButtons: { flexDirection: 'row', gap: 16, width: '100%' },
    chatButtonLarge: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.colors.border, height: 56, borderRadius: 16, gap: 10, backgroundColor: theme.colors.surface },
    chatButtonText: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
    bookButtonLarge: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 16, gap: 10, backgroundColor: theme.colors.primary, elevation: 4, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
    bookButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    infoSection: { padding: 24, gap: 20 },
    infoCard: { borderRadius: 24, padding: 20, backgroundColor: theme.colors.surface, borderWidth: 1.5, borderColor: theme.colors.border },
    infoCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
    infoIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8F5F1', alignItems: 'center', justifyContent: 'center' },
    infoCardTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
    priceText: { fontSize: 28, fontWeight: '900', color: theme.colors.primary },
    chipList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    languageChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, backgroundColor: '#E8F5F1' },
    languageChipText: { fontSize: 14, fontWeight: '800', color: theme.colors.primary },
    specialtyChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
    specialtyChipText: { fontSize: 14, fontWeight: '700', color: theme.colors.textSecondary },
    reviewsSection: { padding: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text, letterSpacing: -0.5 },
    seeAllText: { fontSize: 15, fontWeight: '800', color: theme.colors.primary },
    reviewCard: { borderRadius: 24, padding: 20, marginBottom: 16, backgroundColor: theme.colors.surface, borderWidth: 1.5, borderColor: theme.colors.border },
    reviewInnerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    reviewerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    reviewerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8F5F1', justifyContent: 'center', alignItems: 'center' },
    avatarLetter: { color: theme.colors.primary, fontWeight: '900', fontSize: 18 },
    reviewerName: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
    reviewDate: { fontSize: 13, color: theme.colors.muted, marginTop: 2, fontWeight: '600' },
    starsRowSmall: { flexDirection: 'row', gap: 2 },
    reviewComment: { fontSize: 15, lineHeight: 24, color: theme.colors.textSecondary },
});
