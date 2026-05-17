import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning';
    onClose: () => void;
    onAction?: () => void;
    actionLabel?: string;
}

export const CustomAlert = ({ visible, title, message, type, onClose, onAction, actionLabel }: CustomAlertProps) => {
    const insets = useSafeAreaInsets();

    const getIcon = () => {
        switch (type) {
            case 'success': return { name: 'checkmark-circle-outline' as any, color: '#2C5F2D' };
            case 'error': return { name: 'alert-circle-outline' as any, color: '#d9ab83' };
            case 'warning': return { name: 'warning-outline' as any, color: '#F59E0B' };
            default: return { name: 'information-circle-outline' as any, color: '#2C5F2D' };
        }
    };

    const icon = getIcon();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity
                    activeOpacity={1}
                    style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}
                >
                    <View style={styles.handle} />
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={22} color="#6B7280" />
                    </TouchableOpacity>

                    <View style={[
                        styles.iconWrap,
                        {
                            backgroundColor: type === 'success'
                                ? 'rgba(44,95,45,0.1)'
                                : type === 'error'
                                    ? 'rgba(217,171,131,0.1)'
                                    : 'rgba(245,158,11,0.1)'
                        }
                    ]}>
                        <Ionicons name={icon.name} size={40} color={icon.color} />
                    </View>

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: icon.color }]}
                        onPress={onAction || onClose}
                    >
                        <Text style={styles.actionBtnText}>{actionLabel || "D'accord"}</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 12,
        alignItems: 'center',
        width: '100%',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E5E7EB',
        marginBottom: 20,
    },
    closeBtn: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 1,
    },
    iconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1a472a',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    actionBtn: {
        width: '100%',
        height: 54,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
            android: { elevation: 4 },
        }),
    },
    actionBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
