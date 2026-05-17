import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { theme } from '@/theme';
import { StatusBar } from 'expo-status-bar';

import { useUser } from '@/context/UserContext';

const { width } = Dimensions.get('window');

export default function GuideSplash() {
    const router = useRouter();
    const { setBottomNavVisibility } = useUser();
    const fadeAnim = new Animated.Value(0);
    const scaleAnim = new Animated.Value(0.8);
    const progressAnim = new Animated.Value(0);

    useEffect(() => {
        // Reset bottom nav visibility when switching modes
        setBottomNavVisibility(true);

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 4,
                useNativeDriver: true,
            }),
            Animated.timing(progressAnim, {
                toValue: 1,
                duration: 2500,
                useNativeDriver: false, // width does not support native driver
            })
        ]).start();

        const timer = setTimeout(() => {
            // After splash, go to the actual guide space (tabs)
            router.replace('/(views)/(tabs)/home' as any);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                <Image
                    source={require('../../assets/images/icon.png')}
                    style={styles.logo}
                    contentFit="contain"
                />
                <Text style={styles.title}>SABEEL</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>MISSION INDÉPENDANTE</Text>
                </View>

                <View style={styles.loaderContainer}>
                    <View style={styles.loaderBg}>
                        <Animated.View style={[styles.loaderFill, {
                            width: progressAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%']
                            })
                        }]} />
                    </View>
                    <Text style={styles.loadingText}>Préparation de votre session...</Text>
                </View>

            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        alignItems: 'center',
        width: '100%',
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 20,
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 8,
    },
    badge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 12,
        marginTop: 10,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 2,
    },
    loaderContainer: {
        marginTop: 60,
        width: width * 0.6,
        alignItems: 'center',
    },
    loaderBg: {
        width: '100%',
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    loaderFill: {
        height: '100%',
        backgroundColor: theme.colors.accent || '#D4AF37',
    },
    loadingText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
        marginTop: 12,
        fontWeight: '600',
    }
});
