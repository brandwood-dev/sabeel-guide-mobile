import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { theme } from '@/theme';
import { StatusBar } from 'expo-status-bar';

import { useUser } from '@/context/UserContext';

const { width } = Dimensions.get('window');

export default function AgencySplash() {
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
            // After splash, go to the actual agency space
            router.replace('/(views)/(tabs)/home' as any);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.secondary }]}>

            <StatusBar style="light" />
            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                <Text style={styles.title}>SABEEL</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>MISSION AGENCE</Text>
                </View>

                <View style={styles.loaderContainer}>
                    <View style={styles.loaderBg}>
                        <Animated.View style={[styles.loaderFill, {
                            backgroundColor: '#FFFFFF',
                            width: progressAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%']
                            })
                        }]} />
                    </View>
                    <Text style={styles.loadingText}>Synchronisation avec votre agence...</Text>
                </View>
            </Animated.View>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        alignItems: 'center',
        width: '100%',
    },
    title: {
        fontSize: 38,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 10,
        marginBottom: 8,
    },
    badge: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 14,
        marginTop: 10,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 3,
    },
    loaderContainer: {
        marginTop: 80,
        width: width * 0.65,
        alignItems: 'center',
    },
    loaderBg: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    loaderFill: {
        height: '100%',
    },
    loadingText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 13,
        marginTop: 16,
        fontWeight: '700',
    }
});
