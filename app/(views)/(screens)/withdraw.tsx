import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { useThemeColors, useIsDarkMode } from '@/hooks/useThemeColors';
import { useRouter } from 'expo-router';
import { CustomAlert } from '@/components/common/CustomAlert';

const WithdrawScreen = () => {
    const colors = useThemeColors() as any;
    const isDarkMode = useIsDarkMode();
    const router = useRouter();
    const [amount, setAmount] = useState('');
    const [selectedMethod, setSelectedMethod] = useState('bank'); // bank or card
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'success' as 'success' | 'error' | 'warning',
    });

    const handleWithdrawRequest = () => {
        const val = parseFloat(amount);
        if (!amount || isNaN(val) || val <= 0) {
            setAlertConfig({
                visible: true,
                title: "Montant Invalide",
                message: "Veuillez entrer un montant valide.",
                type: 'warning'
            });
            return;
        }

        if (val < 100) {
            setAlertConfig({
                visible: true,
                title: "Minimum requis",
                message: "Le montant minimum de retrait est de 100 TND.",
                type: 'warning'
            });
            return;
        }

        // Success simulation
        setAlertConfig({
            visible: true,
            title: "Demande Envoyée",
            message: `Votre demande de retrait de ${val.toLocaleString()} TND a été transmise avec succès. Elle sera traitée sous 48h.`,
            type: 'success'
        });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: isDarkMode ? '#2E3B56' : '#f8f9fa' }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Retraire l&apos;argent</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={[styles.card, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Montant à retirer (TND)</Text>
                        <View style={[styles.amountInputWrap, { borderBottomColor: colors.primary }]}>
                            <Text style={[styles.currencyPrefix, { color: colors.text }]}>TND</Text>
                            <TextInput
                                style={[styles.amountInput, { color: colors.text }]}
                                placeholder="0.00"
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>
                        <Text style={[styles.availableInfo, { color: colors.primary }]}>Solde disponible: 1,240 TND</Text>
                    </View>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Méthode de réception</Text>

                    <TouchableOpacity
                        style={[styles.methodCard, { backgroundColor: colors.surface, borderColor: colors.border }, selectedMethod === 'bank' && [styles.selectedMethod, { borderColor: colors.primary, backgroundColor: isDarkMode ? 'rgba(58, 125, 68, 0.08)' : theme.colors.primary + '05' }]]}
                        onPress={() => setSelectedMethod('bank')}
                    >
                        <View style={[styles.methodIconBg, { backgroundColor: isDarkMode ? 'rgba(58, 125, 68, 0.15)' : theme.colors.primary + '10' }]}>
                            <MaterialCommunityIcons name="bank" size={24} color={colors.primary} />
                        </View>
                        <View style={styles.methodInfo}>
                            <Text style={[styles.methodTitle, { color: colors.text }]}>Virement Bancaire (Zitouna)</Text>
                            <Text style={[styles.methodSub, { color: colors.textSecondary }]}>FR76 1234 **** 1234</Text>
                        </View>
                        <Ionicons
                            name={selectedMethod === 'bank' ? "radio-button-on" : "radio-button-off"}
                            size={22}
                            color={selectedMethod === 'bank' ? colors.primary : (isDarkMode ? '#2E3B56' : '#D1D1D6')}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.methodCard, { backgroundColor: colors.surface, borderColor: colors.border }, selectedMethod === 'card' && [styles.selectedMethod, { borderColor: colors.primary, backgroundColor: isDarkMode ? 'rgba(58, 125, 68, 0.08)' : theme.colors.primary + '05' }]]}
                        onPress={() => setSelectedMethod('card')}
                    >
                        <View style={[styles.methodIconBg, { backgroundColor: isDarkMode ? '#2E3B56' : '#F8F9FA' }]}>
                            <MaterialCommunityIcons name="credit-card" size={24} color={isDarkMode ? '#FF9800' : theme.colors.secondary} />
                        </View>
                        <View style={styles.methodInfo}>
                            <Text style={[styles.methodTitle, { color: colors.text }]}>Carte Bancaire (VISA)</Text>
                            <Text style={[styles.methodSub, { color: colors.textSecondary }]}>**** **** **** 4582</Text>
                        </View>
                        <Ionicons
                            name={selectedMethod === 'card' ? "radio-button-on" : "radio-button-off"}
                            size={22}
                            color={selectedMethod === 'card' ? colors.primary : (isDarkMode ? '#2E3B56' : '#D1D1D6')}
                        />
                    </TouchableOpacity>

                    <View style={[styles.infoBox, { backgroundColor: isDarkMode ? '#1E2638' : '#F1F3F5' }]}>
                        <Ionicons name="information-circle" size={20} color={colors.textSecondary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                            Les retraits sont traités sous 48h ouvrables. Des frais de service mineurs peuvent s&apos;appliquer selon votre banque.
                        </Text>
                    </View>
                </ScrollView>

                <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                    <TouchableOpacity style={[styles.withdrawBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={handleWithdrawRequest}>
                        <Text style={styles.withdrawBtnText}>Confirmer le retrait</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onClose={() => {
                    setAlertConfig({ ...alertConfig, visible: false });
                    if (alertConfig.type === 'success') router.back();
                }}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F9FB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: theme.colors.secondary,
    },
    scrollContent: {
        padding: 24,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        marginBottom: 32,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.muted,
        marginBottom: 16,
    },
    amountInputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.primary,
        paddingBottom: 8,
    },
    currencyPrefix: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.secondary,
        marginRight: 12,
    },
    amountInput: {
        flex: 1,
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.secondary,
    },
    availableInfo: {
        fontSize: 12,
        color: theme.colors.primary,
        fontWeight: '700',
        marginTop: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: theme.colors.secondary,
        marginBottom: 16,
    },
    methodCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedMethod: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary + '05',
    },
    methodIconBg: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: theme.colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    methodInfo: {
        flex: 1,
    },
    methodTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.secondary,
    },
    methodSub: {
        fontSize: 12,
        color: theme.colors.muted,
        marginTop: 2,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#F1F3F5',
        borderRadius: 16,
        padding: 16,
        marginTop: 20,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18,
        color: '#666',
        fontWeight: '500',
    },
    footer: {
        padding: 24,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    withdrawBtn: {
        backgroundColor: theme.colors.primary,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    withdrawBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
});

export default WithdrawScreen;
