import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ImageBackground,
} from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Link } from 'expo-router';
import { theme } from '@/theme';
import { Button } from '@/components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { CustomAlert } from '../../src/components/common/CustomAlert';
import { authService } from '@/services/authService';


const ChangePasswordScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const email = params.email as string;

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [alert, setAlert] = useState<{
        visible: boolean; title: string; message: string;
        type: 'success' | 'error' | 'warning'; action?: () => void; actionLabel?: string;
    }>({ visible: false, title: '', message: '', type: 'error' });

    const validatePassword = (password: string): { isValid: boolean; message?: string } => {
        if (password.length < 8) return { isValid: false, message: 'Le mot de passe doit comporter au moins 8 caractères.' };
        if (!/[A-Z]/.test(password)) return { isValid: false, message: 'Le mot de passe doit contenir au moins une majuscule.' };
        if (!/[0-9]/.test(password)) return { isValid: false, message: 'Le mot de passe doit contenir au moins un chiffre.' };
        return { isValid: true };
    };

    const resetTokenParam = params.resetToken as string;


    const handleChangePassword = async () => {
        if (!newPassword.trim() || !confirmPassword.trim()) {
            setAlert({ visible: true, title: 'Champs requis', message: 'Veuillez remplir tous les champs.', type: 'error' });
            return;
        }

        const validation = validatePassword(newPassword);
        if (!validation.isValid) {
            setAlert({ visible: true, title: 'Mot de passe invalide', message: validation.message!, type: 'error' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setAlert({ visible: true, title: 'Erreur', message: 'Les mots de passe ne correspondent pas.', type: 'error' });
            return;
        }

        setIsLoading(true);
        try {
            await authService.changePassword(resetTokenParam, {
                newPassword,
                confirmPassword
            });
            setIsLoading(false);
            setAlert({
                visible: true,
                title: 'Mot de passe modifié !',
                message: 'Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.',
                type: 'success',
                actionLabel: 'Se connecter',
                action: () => {
                    setAlert(a => ({ ...a, visible: false }));
                    router.replace('/(auth)/signin');
                },
            });
        } catch (error: any) {
            setIsLoading(false);
            setAlert({
                visible: true,
                title: 'Erreur',
                message: typeof error === 'string' ? error : 'Une erreur est survenue lors du changement de mot de passe.',
                type: 'error'
            });
        }
    };


    return (
        <View style={styles.container}>
            <ImageBackground
                source={require('../../assets/images/back.png')}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
            />
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.title}>Nouveau mot de passe</Text>
                                <Text style={styles.subtitle}>Créez un mot de passe sécurisé pour votre compte</Text>
                            </View>

                            <View style={styles.formContainer}>
                                <View style={styles.inputGroup}>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="lock-closed-outline" size={18} color={theme.colors.muted} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Nouveau mot de passe"
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                            secureTextEntry={!showNewPassword}
                                            placeholderTextColor={theme.colors.muted}
                                        />
                                        <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
                                            <Ionicons name={showNewPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color={theme.colors.muted} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.muted} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Confirmer le mot de passe"
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry={!showConfirmPassword}
                                            placeholderTextColor={theme.colors.muted}
                                        />
                                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                                            <Ionicons name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color={theme.colors.muted} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.requirementsBox}>
                                    <Text style={styles.requirementsTitle}>Le mot de passe doit contenir :</Text>
                                    <View style={styles.reqRow}>
                                        <Ionicons name={newPassword.length >= 8 ? "checkmark-circle" : "ellipse-outline"} size={14} color={newPassword.length >= 8 ? theme.colors.primary : theme.colors.muted} />
                                        <Text style={[styles.reqText, newPassword.length >= 8 && { color: theme.colors.primary }]}>Min. 8 caractères</Text>
                                    </View>
                                    <View style={styles.reqRow}>
                                        <Ionicons name={/[A-Z]/.test(newPassword) ? "checkmark-circle" : "ellipse-outline"} size={14} color={/[A-Z]/.test(newPassword) ? theme.colors.primary : theme.colors.muted} />
                                        <Text style={[styles.reqText, /[A-Z]/.test(newPassword) && { color: theme.colors.primary }]}>Une majuscule</Text>
                                    </View>
                                    <View style={styles.reqRow}>
                                        <Ionicons name={/[0-9]/.test(newPassword) ? "checkmark-circle" : "ellipse-outline"} size={14} color={/[0-9]/.test(newPassword) ? theme.colors.primary : theme.colors.muted} />
                                        <Text style={[styles.reqText, /[0-9]/.test(newPassword) && { color: theme.colors.primary }]}>Un chiffre</Text>
                                    </View>
                                </View>

                                <View style={styles.buttonWrapper}>
                                    <Button
                                        title={isLoading ? "Modification..." : "Changer"}
                                        onPress={handleChangePassword}
                                        style={styles.mainButton}
                                        disabled={isLoading}
                                    />
                                </View>

                                <View style={styles.footer}>
                                    <Link href="/(auth)/signin" asChild>
                                        <TouchableOpacity>
                                            <Text style={styles.linkText}>Annuler et retourner</Text>
                                        </TouchableOpacity>
                                    </Link>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>

            <CustomAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                actionLabel={alert.actionLabel}
                onClose={() => setAlert(a => ({ ...a, visible: false }))}
                onAction={alert.action}
            />
        </View>
    );
};

export default ChangePasswordScreen;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    scrollContent: { flexGrow: 1, paddingTop: 40, paddingHorizontal: 24, paddingBottom: 80, justifyContent: 'center' },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 24,
        shadowColor: '#1a472a',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#2C5F2D',
    },
    cardHeader: { marginBottom: 20, alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '800', color: '#1a472a', letterSpacing: -0.5, marginBottom: 4 },
    subtitle: { fontSize: 12, color: '#6B8E23', fontWeight: '600', textAlign: 'center', lineHeight: 18, marginBottom: 10 },
    formContainer: { gap: 4 },
    inputGroup: { marginBottom: 16 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 16,
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, height: 44, fontSize: 14, color: theme.colors.text },
    eyeIcon: { padding: 6 },
    requirementsBox: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: theme.colors.border },
    requirementsTitle: { fontSize: 12, fontWeight: '900', color: theme.colors.text, marginBottom: 8 },
    reqRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
    reqText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600' },
    buttonWrapper: { height: 48, marginBottom: 16, overflow: 'hidden', borderRadius: theme.borderRadius.lg },
    mainButton: { height: '100%' },
    footer: { alignItems: 'center' },
    linkText: { color: '#2C5F2D', fontWeight: 'bold', fontSize: 12, textDecorationLine: 'underline' },
});
