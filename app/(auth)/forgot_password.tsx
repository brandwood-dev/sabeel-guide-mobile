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
import { useRouter, Link } from 'expo-router';
import { theme } from '@/theme';
import { Button } from '@/components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { CustomAlert } from '../../src/components/common/CustomAlert';
import { authService } from '@/services/authService';


const ForgotPasswordScreen = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [alert, setAlert] = useState<{
        visible: boolean; title: string; message: string;
        type: 'success' | 'error' | 'warning'; action?: () => void; actionLabel?: string;
    }>({ visible: false, title: '', message: '', type: 'error' });

    const handleSendOTP = async () => {
        if (!email.trim()) {
            setAlert({ visible: true, title: 'Champ requis', message: 'Veuillez saisir votre adresse e-mail.', type: 'error' });
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setAlert({ visible: true, title: 'Email invalide', message: 'Veuillez saisir une adresse e-mail valide.', type: 'error' });
            return;
        }

        setIsLoading(true);
        try {
            const response = await authService.forgotPassword(email);
            setIsLoading(false);
            setAlert({
                visible: true,
                title: 'Code envoyé !',
                message: `Un code de vérification a été envoyé à ${email}.`,
                type: 'success',
                actionLabel: 'Continuer',
                action: () => {
                    setAlert(a => ({ ...a, visible: false }));
                    // Pass email and resetToken to verify_otp
                    router.push({ 
                        pathname: '/(auth)/verify_otp' as any, 
                        params: { email, resetToken: response.resetToken } 
                    });
                },
            });
        } catch (error: any) {
            setIsLoading(false);
            setAlert({
                visible: true,
                title: 'Erreur',
                message: typeof error === 'string' ? error : 'Impossible d\'envoyer le code. Veuillez réessayer.',
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
                                <Text style={styles.title}>Réinitialiser</Text>
                                <Text style={styles.subtitle}>Saisissez votre e-mail pour recevoir un code</Text>
                            </View>

                            <View style={styles.formContainer}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Adresse e-mail</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="mail-outline" size={18} color={theme.colors.muted} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="votre@email.com"
                                            value={email}
                                            onChangeText={setEmail}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                            editable={!isLoading}
                                            placeholderTextColor={theme.colors.muted}
                                        />
                                    </View>
                                </View>

                                <View style={styles.buttonWrapper}>
                                    <Button
                                        title={isLoading ? "Envoi en cours..." : "Envoyer le code"}
                                        onPress={handleSendOTP}
                                        style={styles.mainButton}
                                        disabled={isLoading}
                                    />
                                </View>

                                <View style={styles.footer}>
                                    <Link href="/(auth)/signin" asChild>
                                        <TouchableOpacity>
                                            <Text style={styles.linkText}>Retour à la connexion</Text>
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

export default ForgotPasswordScreen;

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
    subtitle: { fontSize: 12, color: '#6B8E23', fontWeight: '600', textAlign: 'center', lineHeight: 18 },
    formContainer: { gap: 4 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 12, fontWeight: '700', color: theme.colors.text, marginBottom: 6, marginLeft: 4 },
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
    buttonWrapper: { height: 48, marginTop: 10, marginBottom: 16, overflow: 'hidden', borderRadius: theme.borderRadius.lg },
    mainButton: { height: '100%' },
    footer: { alignItems: 'center' },
    linkText: { color: '#2C5F2D', fontWeight: 'bold', fontSize: 12, textDecorationLine: 'underline' },
});
