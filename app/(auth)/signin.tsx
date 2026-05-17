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
    Image,
} from 'react-native';
import React, { useState, useRef } from 'react';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { Button } from '@/components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { CustomAlert } from '../../src/components/common/CustomAlert';
import { useTrans } from '@/hooks/useTrans';
import { authService } from '@/services/authService';
import { useUser } from '@/context/UserContext';



const SignInScreen = () => {
    const router = useRouter();
    const { t, language } = useTrans();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const passwordInputRef = useRef<TextInput>(null);
    const [alert, setAlert] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'warning' }>({
        visible: false, title: '', message: '', type: 'error'
    });

    const isRTL = language === 'ar';

    const { setUser, setOnboardingStep } = useUser();

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setAlert({ visible: true, title: t('Champs requis'), message: t('Veuillez remplir votre email et mot de passe.'), type: 'error' });
            return;
        }

        setIsLoading(true);
        console.log('[SignIn] Attempting login for:', email);
        try {
            const result = await authService.login(email, password);
            console.log('[SignIn] Login Successful for:', result.guide.email);

            // Update global user state
            setUser(result.guide);

            // If profile is incomplete, start onboarding flow
            if (result.guide.isProfileComplete === false) {
                console.log('[SignIn] Profile incomplete, setting onboardingStep to profile_tab');
                setOnboardingStep('profile_tab');
            } else {
                console.log('[SignIn] Profile complete, skipping onboarding');
                setOnboardingStep('none');
            }


            setIsLoading(false);
            router.replace('/home' as any);
        }
        catch (error: any) {
            console.error('[SignIn] Login Failed:', error);
            setIsLoading(true); // Small delay before showing alert
            setTimeout(() => {
                setIsLoading(false);
                setAlert({
                    visible: true,
                    title: t('Échec de connexion'),
                    message: typeof error === 'string' ? error : t('Combinaison email/mot de passe incorrecte.'),
                    type: 'error'
                });
            }, 100);
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
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../../assets/images/splash.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>

                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.title}>{t('Bienvenue')}</Text>
                                <Text style={styles.subtitle}>{t('Connectez-vous pour continuer')}</Text>
                            </View>

                            <View style={styles.formContainer}>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('Adresse e-mail')}</Text>
                                    <View style={[styles.inputWrapper, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                        <Ionicons name="mail-outline" size={18} color={theme.colors.muted} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                                            placeholder="nom@exemple.com"
                                            value={email}
                                            onChangeText={setEmail}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                            placeholderTextColor={theme.colors.muted}
                                            returnKeyType="next"
                                            onSubmitEditing={() => passwordInputRef.current?.focus()}
                                            blurOnSubmit={false}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('Mot de passe')}</Text>
                                    <View style={[styles.inputWrapper, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                        <Ionicons name="lock-closed-outline" size={18} color={theme.colors.muted} style={styles.inputIcon} />
                                        <TextInput
                                            ref={passwordInputRef}
                                            style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                                            placeholder="••••••••"
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry={!showPassword}
                                            placeholderTextColor={theme.colors.muted}
                                            returnKeyType="done"
                                            onSubmitEditing={handleLogin}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowPassword(!showPassword)}
                                            style={styles.eyeIcon}
                                        >
                                            <Ionicons
                                                name={showPassword ? "eye-outline" : "eye-off-outline"}
                                                size={18}
                                                color={theme.colors.muted}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={[styles.optionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                    <View style={{ flex: 1 }} />
                                    <TouchableOpacity
                                        onPress={() => router.push('/(auth)/forgot_password' as any)}
                                    >
                                        <Text style={styles.forgotPasswordText}>{t('Mot de passe oublié ?')}</Text>
                                    </TouchableOpacity>
                                </View>

                                <Button
                                    title={t("Se connecter")}
                                    onPress={handleLogin}
                                    style={styles.signInButton}
                                    loading={isLoading}
                                />


                                <View style={[styles.signupContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                    <Text style={styles.footerText}>{t("Vous n'avez pas de compte ? ")}</Text>
                                    <Link href="/signup" asChild>
                                        <TouchableOpacity>
                                            <Text style={styles.linkText}>{t("S'inscrire")}</Text>
                                        </TouchableOpacity>
                                    </Link>
                                </View>
                            </View>
                        </View>

                        <View style={styles.quoteContainer}>
                            <Text style={styles.quoteText}>
                                ﴿وَقُلِ اعْمَلُوا فَسَيَرَى اللَّهُ عَمَلَكُمْ وَرَسُولُهُ وَالْمُؤْمِنُونَ﴾
                            </Text>
                            <Text style={styles.quoteReference}>— سورة التوبة ١٠٥</Text>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>

            <CustomAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onClose={() => setAlert({ ...alert, visible: false })}
            />
        </View>
    );
};

export default SignInScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: 0,
        marginBottom: -18,
    },
    logo: {
        width: 160,
        height: 160,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 20,
        shadowColor: '#1a472a',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#2C5F2D',
        marginTop: 0,
    },
    cardHeader: {
        marginBottom: 13,
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1a472a',
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        color: '#6B8E23',
        fontWeight: '600',
        letterSpacing: 0.2,
        opacity: 0.8,
    },
    formContainer: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: 12,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 6,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginHorizontal: 4,
    },
    input: {
        flex: 1,
        height: 48,
        fontSize: 14,
        color: theme.colors.text,
    },
    eyeIcon: {
        padding: 6,
    },
    optionsRow: {
        marginBottom: 20,
        marginTop: 4,
    },
    forgotPasswordText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    signInButton: {
        height: 48,
        borderRadius: theme.borderRadius.lg,
    },
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    footerText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    linkText: {
        fontSize: 12,
        color: theme.colors.primary,
        fontWeight: '800',
        textDecorationLine: 'underline',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 40,
        flexGrow: 1,
    },
    quoteContainer: {
        marginTop: 20,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    quoteText: {
        fontSize: 15,
        color: '#4A7C59',
        textAlign: 'center',
        fontStyle: 'italic',
        marginBottom: 4,
        lineHeight: 20,
    },
    quoteReference: {
        fontSize: 12,
        color: '#6B8E23',
        fontWeight: '600',
    },
});