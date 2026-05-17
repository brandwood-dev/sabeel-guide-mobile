import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { InAppNotification } from '../../services/notificationService';
import { theme } from '../../theme';

interface Props {
    notification: InAppNotification | null;
    onDismiss: () => void;
}

export const InAppNotificationBanner: React.FC<Props> = ({ notification, onDismiss }) => {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const slideAnim = useRef(new Animated.Value(-120)).current;
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (notification) {
            setVisible(true);
            // Slide down
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 80,
                friction: 10,
                useNativeDriver: true,
            }).start();

            // Auto-dismiss after 6 seconds
            const timer = setTimeout(() => {
                dismiss();
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const dismiss = () => {
        Animated.timing(slideAnim, {
            toValue: -120,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setVisible(false);
            onDismiss();
        });
    };

    const handleAction = () => {
        if (notification?.action === 'navigate:profile/personal_info') {
            dismiss();
            router.push('/(complet_profile)/personal-info' as any);
        }
    };


    if (!visible || !notification) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    top: insets.top + (Platform.OS === 'android' ? 10 : 0),
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <View style={styles.card}>
                {/* Icon */}
                <View style={styles.iconWrap}>
                    <Ionicons name="person-circle" size={28} color={theme.colors.primary} />
                </View>

                {/* Text */}
                <View style={styles.textBlock}>
                    <Text style={styles.title} numberOfLines={1}>{notification.title}</Text>
                    <Text style={styles.message} numberOfLines={2}>{notification.message}</Text>
                </View>

                {/* Action */}
                <View style={styles.actions}>
                    {notification.actionLabel && (
                        <TouchableOpacity style={styles.actionBtn} onPress={handleAction}>
                            <Text style={styles.actionText}>{notification.actionLabel}</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={dismiss} style={styles.closeBtn}>
                        <Ionicons name="close" size={18} color="#8E8E93" />
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 9999,
        elevation: 20,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 12,
        borderWidth: 1,
        borderColor: theme.colors.primary + '20',
    },
    iconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textBlock: {
        flex: 1,
    },
    title: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1C1C1E',
        letterSpacing: -0.2,
    },
    message: {
        fontSize: 11,
        color: '#8E8E93',
        marginTop: 2,
        lineHeight: 15,
    },
    actions: {
        alignItems: 'center',
        gap: 6,
    },
    actionBtn: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    actionText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
    },
    closeBtn: {
        padding: 2,
    },
});
