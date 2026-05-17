import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View, Platform, Animated } from 'react-native';
import { useTrans } from '../../hooks/useTrans';
import { useThemeColors } from '../../hooks/useThemeColors';
import { theme } from '../../theme';

interface ProfileMenuItemProps {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress?: () => void;
    type?: 'button' | 'toggle';
    value?: boolean;
    onValueChange?: (value: boolean) => void;
    color?: string;
    showChevron?: boolean;
    isLast?: boolean;
    pulseAnim?: any;
}

export const ProfileMenuItem: React.FC<ProfileMenuItemProps> = ({
    icon,
    label,
    onPress,
    type = 'button',
    value,
    onValueChange,
    color,
    showChevron = true,
    isLast = false,
    pulseAnim,
}) => {
    const colors = useThemeColors() as any;
    const { language } = useTrans();
    const isRTL = language === 'ar';
    const activeColor = color || theme.colors.primary;

    const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

    return (
        <AnimatedTouchableOpacity
            style={[
                styles.container,
                {
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: theme.colors.divider,
                },
                pulseAnim && { transform: [{ scale: pulseAnim }], backgroundColor: activeColor + '05' }
            ]}
            onPress={type === 'button' ? onPress : undefined}
            activeOpacity={0.6}
            disabled={type === 'toggle'}
        >

            <View style={[
                styles.iconContainer,
                {
                    backgroundColor: activeColor + '10',
                    marginRight: isRTL ? 0 : 12,
                    marginLeft: isRTL ? 12 : 0
                }
            ]}>
                <Ionicons name={icon} size={17} color={activeColor} />
            </View>

            <Text style={[
                styles.label,
                {
                    color: theme.colors.text,
                    textAlign: isRTL ? 'right' : 'left'
                }
            ]}>{label}</Text>

            {type === 'toggle' ? (
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: theme.colors.divider, true: activeColor + '40' }}
                    thumbColor={value ? activeColor : '#f4f3f4'}
                    ios_backgroundColor={theme.colors.divider}
                />
            ) : showChevron && (
                <Ionicons
                    name={isRTL ? "chevron-back" : "chevron-forward"}
                    size={16}
                    color={theme.colors.muted}
                />
            )}

        </AnimatedTouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    iconContainer: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
});
