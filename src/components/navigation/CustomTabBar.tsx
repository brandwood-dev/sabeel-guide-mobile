import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../../context/UserContext';
import { useRouter } from 'expo-router';

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { isBottomNavVisible, userMode, unreadMessagesCount } = useUser();

    const activeColor = userMode === 'agency' ? theme.colors.secondary : theme.colors.primary;
    const secondaryActiveColor = userMode === 'agency' ? '#374151' : '#4A7C59';

    // Animation for visibility
    const visibleAnim = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        Animated.spring(visibleAnim, {
            toValue: isBottomNavVisible ? 1 : 0,
            useNativeDriver: true,
            tension: 40,
            friction: 8,
        }).start();
    }, [isBottomNavVisible]);
    // The center index for 'tracking' in Sabeel_Guide
    const centerIndex = 2;

    // Pulse animation for onboarding
    const pulseAnim = React.useRef(new Animated.Value(1)).current;
    const { onboardingStep } = useUser();
    console.log('[CustomTabBar] onboardingStep:', onboardingStep);

    React.useEffect(() => {

        if (onboardingStep === 'profile_tab') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [onboardingStep]);

    return (
        <>

            {isBottomNavVisible && (
                <View
                    style={[
                        styles.backgroundStrip,
                        { height: 85 + insets.bottom }
                    ]}
                />
            )}
            <Animated.View style={[
                styles.container,
                {
                    paddingBottom: Math.max(insets.bottom, 10),
                    transform: [{
                        translateY: visibleAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [150, 0],
                        })
                    }],
                    opacity: visibleAnim,
                }
            ]}>
                <View style={styles.tabBar}>
                    {state.routes.map((route, index) => {
                        const { options } = descriptors[route.key];
                        const label =
                            options.tabBarLabel !== undefined
                                ? options.tabBarLabel
                                : options.title !== undefined
                                    ? options.title
                                    : route.name;

                        const isFocused = state.index === index;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                router.push({
                                    pathname: `/(views)/(tabs)/${route.name}` as any,
                                    params: (route.params || {}) as any,
                                });
                            }
                        };

                        const onLongPress = () => {
                            navigation.emit({
                                type: 'tabLongPress',
                                target: route.key,
                            });
                        };

                        const getIcon = (name: string, focused: boolean, color: string) => {
                            switch (name) {
                                case 'home':
                                    return <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />;
                                case 'umrah':
                                    return <Ionicons name={focused ? "people" : "people-outline"} size={24} color={color} />;
                                case 'tracking':
                                    return <Ionicons name={focused ? "map" : "map-outline"} size={30} color="#FFFFFF" />;
                                case 'messages':
                                    return <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={24} color={color} />;
                                case 'profile':
                                    return <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={26} color={color} />;
                                default:
                                    return <Ionicons name="help-circle-outline" size={24} color={color} />;
                            }
                        };

                        if (index === centerIndex) {
                            return (
                                <TouchableOpacity
                                    key={route.key}
                                    accessibilityRole="button"
                                    accessibilityState={isFocused ? { selected: true } : {}}
                                    accessibilityLabel={options.tabBarAccessibilityLabel}
                                    onPress={onPress}
                                    onLongPress={onLongPress}
                                    style={styles.centerIconContainerWrapper}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={[activeColor, secondaryActiveColor]}
                                        style={[
                                            styles.gradientContainer,
                                            isFocused && styles.gradientContainerActive,
                                            { shadowColor: activeColor }
                                        ]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        {getIcon(route.name, isFocused, '#FFFFFF')}
                                    </LinearGradient>
                                    <Text style={[
                                        styles.centerTabLabel,
                                        { color: activeColor }
                                    ]}>
                                        {String(label)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }

                        return (
                            <TouchableOpacity
                                key={route.key}
                                accessibilityRole="button"
                                accessibilityState={isFocused ? { selected: true } : {}}
                                accessibilityLabel={options.tabBarAccessibilityLabel}
                                onPress={onPress}
                                onLongPress={onLongPress}
                                style={styles.tabItem}
                                activeOpacity={0.6}
                            >
                                <Animated.View style={[
                                    styles.iconContainer,
                                    isFocused && styles.iconContainerActive,
                                    isFocused && { backgroundColor: userMode === 'agency' ? '#F3F4F6' : '#F0F7F2' },
                                    route.name === 'profile' && onboardingStep === 'profile_tab' && { transform: [{ scale: pulseAnim }], borderColor: activeColor, borderWidth: 1 }
                                ]}>
                                    {getIcon(route.name, isFocused, isFocused ? activeColor : theme.colors.muted)}
                                    {route.name === 'messages' && unreadMessagesCount > 0 ? (
                                        <View style={styles.messagesBadge}>
                                            <Text style={styles.messagesBadgeText} numberOfLines={1}>
                                                {unreadMessagesCount > 99 ? '99+' : String(unreadMessagesCount)}
                                            </Text>
                                        </View>
                                    ) : null}
                                </Animated.View>

                                <Text style={[
                                    styles.tabLabel,
                                    { color: isFocused ? activeColor : theme.colors.muted }
                                ]}>
                                    {String(label)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </Animated.View>
        </>
    );
}


const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: 'transparent',
        pointerEvents: 'box-none',
        zIndex: 1000,
    },
    backgroundStrip: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        zIndex: 999,
    },
    tabBar: {
        flexDirection: 'row',
        height: 75,
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        justifyContent: 'space-around',
        alignItems: 'center',
        elevation: 15,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10
        },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        width: '100%',
        marginBottom: 10,
    },
    tabItem: {
        justifyContent: 'center',
        alignItems: 'center',
        height: 75,
        flex: 1,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
        position: 'relative',
    },

    messagesBadge: {
        position: 'absolute',
        top: -4,
        right: -6,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 4,
        backgroundColor: theme.colors.primary,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    messagesBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
    },

    iconContainerActive: {
        backgroundColor: Platform.OS === 'ios' ? '#F0F7F2' : 'transparent',
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 4,
        letterSpacing: 0.2,
        marginBottom: 4,
    },
    centerIconContainerWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 45,
        height: 95,
        width: 70,
        zIndex: 10,
    },
    gradientContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
        elevation: 12,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
    },
    gradientContainerActive: {
        transform: [{ scale: 1.1 }],
    },
    centerTabLabel: {
        fontSize: 10,
        fontWeight: '800',
        marginTop: 6,
        letterSpacing: 0.3,
        position: 'absolute',
        bottom: 0,
    },
});
