import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { setLanguage } from '@/store/uiSlice';
import type { SupportedLang } from '@/store/uiSlice';
import { theme } from '@/theme';
import { useTrans } from '@/hooks/useTrans';
import { Button } from '@/components/common/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DevSettings, I18nManager } from 'react-native';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        image: require('../../assets/images/onboarding_guide.png'),
        title: 'Accompagnement Spirituel',
        description: 'Guidez vos pèlerins avec sérénité tout au long de leur parcours sacré avec des outils dédiés.',
    },
    {
        id: '2',
        image: require('../../assets/images/onboarding_safety.png'),
        title: 'Sécurité & Tracking',
        description: 'Gardez un œil sur votre groupe en temps réel et assurez leur sécurité 24h/24 grâce au GPS intégré.',
    },
    {
        id: '3',
        image: require('../../assets/images/onboarding_support.png'),
        title: 'Assistance 24/7',
        description: 'Restez en contact permanent avec vos pèlerins et répondez à leurs besoins en un instant.',
    },
    {
        id: '4',
        image: require('../../assets/images/onboarding_earn.png'),
        title: 'Revenus Flexibles',
        description: 'Gérez votre propre planning, fixez vos disponibilités et générez des revenus en tant que guide freelance certifié Sabeel.',
    },
];

export default function OnboardingScreen() {
    const { t } = useTrans();
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showLangSheet, setShowLangSheet] = useState(false);
    const [selectedLang, setSelectedLang] = useState<SupportedLang>('fr');
    const dispatch = useDispatch();
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef<FlatList>(null);

    const viewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    React.useEffect(() => {
        const interval = setInterval(() => {
            let nextIndex = currentIndex + 1;
            if (nextIndex >= SLIDES.length) {
                nextIndex = 0;
            }
            setCurrentIndex(nextIndex);
            slidesRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        }, 4000);
        return () => clearInterval(interval);
    }, [currentIndex]);

    const scrollToNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        router.replace('/signin' as any);
    };

    const applyLanguage = async (next: SupportedLang) => {
        const prevIsRTL = I18nManager.isRTL;
        const nextIsRTL = next === 'ar';

        setSelectedLang(next);
        dispatch(setLanguage(next));

        try {
            await AsyncStorage.setItem('@sg_language', next);
        } catch {
            // ignore
        }

        if (prevIsRTL !== nextIsRTL) {
            try {
                I18nManager.allowRTL(true);
                I18nManager.forceRTL(nextIsRTL);
                DevSettings.reload();
            } catch {
                // ignore
            }
        }
    };

    const renderItem = ({ item }: { item: typeof SLIDES[0] }) => (
        <View style={styles.slide}>
            <View style={styles.imageContainer}>
                <Image source={item.image} style={styles.image} resizeMode="contain" />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{t(item.title)}</Text>
                <Text style={styles.description}>{t(item.description)}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.langBtn}
                    onPress={() => setShowLangSheet(true)}
                >
                    <Ionicons name="globe-outline" size={18} color={theme.colors.muted} />
                    <Text style={styles.langText}>{String(selectedLang || 'fr').toUpperCase()}</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={SLIDES}
                renderItem={renderItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                bounces={false}
                keyExtractor={(item) => item.id}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                    useNativeDriver: false,
                })}
                onViewableItemsChanged={viewableItemsChanged}
                viewabilityConfig={viewConfig}
                scrollEventThrottle={32}
                ref={slidesRef}
            />

            <View style={styles.footer}>
                <View style={styles.pagination}>
                    {SLIDES.map((_, i) => {
                        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [10, 20, 10],
                            extrapolate: 'clamp',
                        });
                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });
                        return (
                            <Animated.View
                                key={i}
                                style={[styles.dot, { width: dotWidth, opacity }]}
                            />
                        );
                    })}
                </View>

                <Button
                    title={t('Commencer')}
                    onPress={handleComplete}
                    style={styles.nextButton}
                />
            </View>

            {/* Language Selection Sheet */}
            <Modal
                transparent
                visible={showLangSheet}
                animationType="slide"
                onRequestClose={() => setShowLangSheet(false)}
            >
                <TouchableOpacity
                    style={styles.sheetOverlay}
                    activeOpacity={1}
                    onPress={() => setShowLangSheet(false)}
                >
                    <View style={styles.sheetContent}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle}>{t('Choisir la langue')}</Text>

                        {[
                            { code: 'ar', label: 'العربية' },
                            { code: 'fr', label: 'Français' },
                            { code: 'en', label: 'English' },
                        ].map((lang) => (
                            <TouchableOpacity
                                key={lang.code}
                                style={[
                                    styles.langItem,
                                    selectedLang === lang.code && styles.langItemActive
                                ]}
                                onPress={async () => {
                                    await applyLanguage(lang.code as SupportedLang);
                                    setShowLangSheet(false);
                                }}
                            >
                                <Text style={[
                                    styles.langItemText,
                                    selectedLang === lang.code && styles.langItemTextActive
                                ]}>
                                    {lang.label}
                                </Text>
                                {selectedLang === lang.code && (
                                    <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        height: 80,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingHorizontal: theme.spacing.xl,
        marginTop: 10,
    },
    langBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
    },
    langText: {
        fontSize: 13,
        color: theme.colors.muted,
        fontWeight: '700',
    },
    slide: {
        width,
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xl,
    },
    imageContainer: {
        flex: 0.6,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    image: {
        width: width * 0.85,
        height: height * 0.4,
    },
    textContainer: {
        flex: 0.3,
        alignItems: 'center',
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: theme.colors.primary,
        textAlign: 'center',
        marginBottom: theme.spacing.md,
    },
    description: {
        fontSize: 15,
        color: theme.colors.muted,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 10,
    },
    footer: {
        paddingHorizontal: theme.spacing.xl,
        paddingBottom: theme.spacing.xl,
    },
    pagination: {
        flexDirection: 'row',
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    dot: {
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.primary,
        marginHorizontal: 4,
    },
    nextButton: {
        width: '100%',
        height: 56,
        borderRadius: 28,
    },
    sheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheetContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        paddingBottom: 40,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.colors.secondary,
        textAlign: 'center',
        marginBottom: 20,
    },
    langItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginBottom: 8,
        backgroundColor: '#F8F9FA',
    },
    langItemActive: {
        backgroundColor: theme.colors.primary + '10',
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
    },
    langItemText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.muted,
    },
    langItemTextActive: {
        color: theme.colors.primary,
        fontWeight: '800',
    },
});
