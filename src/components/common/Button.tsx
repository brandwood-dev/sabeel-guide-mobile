import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
    StyleProp,
    Platform
} from 'react-native';
import { theme } from '@/theme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'accent';
    loading?: boolean;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    size?: 'small' | 'medium' | 'large';
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    style,
    textStyle,
    size = 'large',
}) => {
    const getVariantStyle = () => {
        switch (variant) {
            case 'secondary':
                return styles.secondary;
            case 'outline':
                return styles.outline;
            case 'accent':
                return styles.accent;
            default:
                return styles.primary;
        }
    };

    const getTextStyle = () => {
        switch (variant) {
            case 'outline':
                return styles.outlineText;
            case 'secondary':
                return styles.secondaryText;
            default:
                return styles.text;
        }
    };

    const getSizeStyle = () => {
        switch (size) {
            case 'small':
                return { height: 40, paddingHorizontal: 16 };
            case 'medium':
                return { height: 48, paddingHorizontal: 24 };
            default:
                return { height: 56, paddingHorizontal: 32 };
        }
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            style={[
                styles.base,
                getSizeStyle(),
                getVariantStyle(),
                style,
                (disabled || loading) && styles.disabled
            ]}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'outline' ? theme.colors.primary : '#fff'} />
            ) : (
                <Text style={[getTextStyle(), textStyle]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    base: {
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 120,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    primary: {
        backgroundColor: theme.colors.primary,
    },
    secondary: {
        backgroundColor: '#F3F4F6',
        elevation: 0,
        shadowOpacity: 0,
    },
    accent: {
        backgroundColor: theme.colors.secondary, // The sandy gold
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        elevation: 0,
        shadowOpacity: 0,
    },
    text: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    secondaryText: {
        color: '#4B5563',
        fontSize: 16,
        fontWeight: '700',
    },
    outlineText: {
        color: theme.colors.primary,
        fontSize: 16,
        fontWeight: '800',
    },
    disabled: {
        opacity: 0.5,
    },
});
