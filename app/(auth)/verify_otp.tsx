import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Dimensions,
    ImageBackground,
} from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '@/theme';
import { Button } from '@/components/common/Button';
import { CustomAlert } from '../../src/components/common/CustomAlert';
import { authService } from '@/services/authService';


const VerifyOTPScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const email = params.email as string;

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const [alert, setAlert] = useState<{
        visible: boolean; title: string; message: string;
        type: 'success' | 'error' | 'warning'; action?: () => void; actionLabel?: string;
    }>({ visible: false, title: '', message: '', type: 'error' });

    const inputRefs = useRef<Array<TextInput | null>>([]);

    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [resendTimer]);

    const handleOtpChange = (value: string, index: number) => {
        if (value.length > 1) value = value.charAt(value.length - 1);
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) inputRefs.current[index + 1]?.focus();
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const resetTokenParam = params.resetToken as string;


    const handleVerifyOTP = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            setAlert({ visible: true, title: 'Code incomplet', message: 'Veuillez saisir le code complet à 6 chiffres.', type: 'error' });
            return;
        }

        setIsLoading(true);
        try {
            const response = await authService.verifyOtp(resetTokenParam, otpCode);
            setIsLoading(false);
            setAlert({
                visible: true,
                title: 'Code vérifié !',
                message: 'Votre code est valide. Vous pouvez maintenant créer un nouveau mot de passe.',
                type: 'success',
                actionLabel: 'Continuer',
                action: () => {
                    setAlert(a => ({ ...a, visible: false }));
                    // Use the potentially new resetToken from verification or keep the old one
                    const finalToken = response.resetToken || resetTokenParam;
                    router.push({ 
                        pathname: '/(auth)/change_password' as any, 
                        params: { email, resetToken: finalToken } 
                    });
                },
            });
        } catch (error: any) {
            setIsLoading(false);
            setAlert({
                visible: true,
                title: 'Erreur',
                message: typeof error === 'string' ? error : 'Code invalide ou expiré.',
                type: 'error'
            });
        }
    };

    const handleResendOTP = async () => {
        if (!canResend) return;
        setCanResend(false);
        setResendTimer(60);
        try {
            await authService.forgotPassword(email);
            setAlert({ visible: true, title: 'Code renvoyé', message: 'Un nouveau code a été envoyé à votre adresse e-mail.', type: 'success' });
        } catch (error: any) {
            setAlert({ visible: true, title: 'Erreur', message: 'Impossible de renvoyer le code.', type: 'error' });
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
                                <Text style={styles.title}>Vérification</Text>
                                <Text style={styles.subtitle}>Un code a été envoyé à {email}</Text>
                            </View>

                            <View style={styles.inputContainer}>
                                {otp.map((digit, index) => (
                                    <TextInput
                                        key={index}
                                        ref={(ref) => { inputRefs.current[index] = ref; }}
                                        style={[styles.input, digit ? styles.inputFilled : null]}
                                        value={digit}
                                        onChangeText={(value) => handleOtpChange(value, index)}
                                        onKeyPress={(e) => handleKeyPress(e, index)}
                                        keyboardType="number-pad"
                                        maxLength={1}
                                        editable={!isLoading}
                                        selectTextOnFocus
                                        selectionColor="#2C5F2D"
                                    />
                                ))}
                            </View>

                            <View style={styles.buttonWrapper}>
                                <Button
                                    title={isLoading ? "Vérification..." : "Vérifier"}
                                    onPress={handleVerifyOTP}
                                    style={styles.mainButton}
                                    disabled={isLoading}
                                />
                            </View>

                            <View style={styles.footer}>
                                <View style={styles.resendContainer}>
                                    <Text style={styles.resendText}>Vous n&apos;avez pas reçu le code ? </Text>
                                    <TouchableOpacity onPress={handleResendOTP} disabled={!canResend}>
                                        <Text style={[styles.resendLink, !canResend && styles.resendLinkDisabled]}>
                                            {canResend ? 'Renvoyer' : `Renvoyer (${resendTimer}s)`}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity onPress={() => router.back()}>
                                    <Text style={styles.modifierEmailText}>Modifier l&apos;email</Text>
                                </TouchableOpacity>
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

export default VerifyOTPScreen;

const { width } = Dimensions.get('window');

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
        alignItems: 'center',
    },
    cardHeader: { marginBottom: 24, alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '800', color: '#1a472a', letterSpacing: -0.5, marginBottom: 4 },
    subtitle: { fontSize: 12, color: '#6B8E23', fontWeight: '600', textAlign: 'center', lineHeight: 18 },
    inputContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 24 },
    input: {
        width: width / 9.5,
        height: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        backgroundColor: '#F9F9F9',
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2C5F2D',
    },
    inputFilled: { backgroundColor: '#FFFFFF', borderColor: '#2C5F2D' },
    buttonWrapper: { width: '100%', height: 48, marginBottom: 16, overflow: 'hidden', borderRadius: theme.borderRadius.lg },
    mainButton: { height: '100%' },
    footer: { alignItems: 'center', width: '100%' },
    resendContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
    resendText: { fontSize: 12, color: theme.colors.textSecondary },
    resendLink: { fontSize: 12, color: theme.colors.primary, fontWeight: '800', textDecorationLine: 'underline' },
    resendLinkDisabled: { color: theme.colors.muted, textDecorationLine: 'none' },
    modifierEmailText: { color: '#2C5F2D', fontWeight: 'bold', fontSize: 12, textDecorationLine: 'underline' },
});
