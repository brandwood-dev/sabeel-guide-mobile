import React, { useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Animated,
    Dimensions,
    StatusBar,
    Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '@/theme';
import { useUser } from '@/context/UserContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const SplashAgency = () => {
    const router = useRouter();
    const { targetMode } = useLocalSearchParams();
    const { setUserMode } = useUser();

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const textFadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Start animations
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 20,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 3000,
                    useNativeDriver: true,
                })
            ),
        ]).start();

        // Delayed text animation
        Animated.timing(textFadeAnim, {
            toValue: 1,
            duration: 1000,
            delay: 400,
            useNativeDriver: false,
        }).start();

        // Handle the switch after a delay
        const timer = setTimeout(() => {
            if (targetMode) {
                setUserMode(targetMode as 'guide' | 'agency');
            }
            // Navigate back to home or profile
            router.replace('/home');
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const isTargetAgency = targetMode === 'agency';

    return (
        <View style={[styles.container, { backgroundColor: isTargetAgency ? '#1A1C1E' : '#8CAB8F' }]}>
            <StatusBar barStyle="light-content" />
            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }]
                    }
                ]}
            >
                <View style={styles.iconContainer}>
                    <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                        <View style={styles.outerCircle} />
                    </Animated.View>

                    <View style={styles.innerIcon}>
                        {isTargetAgency ? (
                            <MaterialCommunityIcons name="office-building" size={60} color="#fff" />
                        ) : (
                            <MaterialCommunityIcons name="account-tie" size={60} color="#fff" />
                        )}
                    </View>
                </View>

                <Animated.View style={[styles.textContainer, { opacity: textFadeAnim }]}>
                    <Text style={styles.title}>
                        {isTargetAgency ? "Transition vers l'Espace Agence" : "Transition vers l'Espace Guide"}
                    </Text>
                    <Text style={styles.subtitle}>
                        Configuration de votre environnement en cours...
                    </Text>
                </Animated.View>

                <View style={styles.loaderContainer}>
                    <Animated.View
                        style={[
                            styles.loadingBar,
                            {
                                width: textFadeAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%'],
                                })
                            }
                        ]}
                    />
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 180,
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    outerCircle: {
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
        borderStyle: 'dashed',
    },
    innerIcon: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    textContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
    },
    loaderContainer: {
        width: width * 0.6,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        marginTop: 50,
        overflow: 'hidden',
    },
    loadingBar: {
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: 2,
    },
});

export default SplashAgency;
