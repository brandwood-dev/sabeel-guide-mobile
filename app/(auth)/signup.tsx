import {
    StyleSheet,
    Text,
    View,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Dimensions,
    ScrollView,
    Modal,
} from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { theme } from '@/theme';
import { Button } from '@/components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import PhoneInput from 'react-native-phone-number-input';
import { useTrans } from '@/hooks/useTrans';
import { authService } from '@/services/authService';
import { CustomAlert } from '@/components/common/CustomAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setMemoryToken } from '@/services/api';


const { width } = Dimensions.get('window');

const SignUpScreen = () => {
    const router = useRouter();
    const { t, language } = useTrans();
    const [step, setStep] = useState(1);
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const phoneInput = useRef<PhoneInput>(null);
    const isRTL = language === 'ar';

    // Form Data
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Animations
    const fadeAnim = useRef(new Animated.Value(step === 1 ? 1 : 0)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            })
        ]).start();
    }, [step]);

    const nextStep = () => {
        if (step < 4) {
            fadeAnim.setValue(0);
            slideAnim.setValue(0);
            setStep(step + 1);
        } else {
            handleSignUp();
        }
    };

    const prevStep = () => {
        if (step > 1) {
            fadeAnim.setValue(0);
            slideAnim.setValue(0);
            setStep(step - 1);
        } else {
            router.back();
        }
    };

    const [signupToken, setSignupToken] = useState<string | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'warning' }>({
        visible: false, title: '', message: '', type: 'error'
    });

    const handleSignUp = async () => {
        setIsLoading(true);
        console.log('[SignUp] Starting registration process...');
        try {
            // Step 1: Account credentials
            console.log('[SignUp] Step 1: Sending account credentials:', { email, phone });
            const res1 = await authService.signupStep1({
                email,
                phoneNumber: phone,
                password,
                confirmPassword: password
            });
            console.log('[SignUp] Step 1 Success, received token:', res1.signupToken);

            const token = res1.signupToken;
            setSignupToken(token);

            // Step 2: Profile details
            console.log('[SignUp] Step 2: Sending profile details:', { firstName, lastName });
            const res2 = await authService.signupStep2(token, {
                firstName,
                lastName,
                dateOfBirth: '1990-01-01',
                gender: 'male',
                nationality: 'Tunisian',
                countryOfResidence: 'Tunisia',
                fullAddress: 'Sousse, Tunisia'
            });
            console.log('[SignUp] Step 2 Success, received new token:', res2.signupToken);

            // Step 3: Terms & Finalization
            console.log('[SignUp] Step 3: Finalizing registration...');
            const res3 = await authService.signupStep3(res2.signupToken, {
                documentType: 'ID',
                documentNumber: '12345678',
                issuingCountry: 'Tunisia',
                documentExpiryDate: '2030-01-01',
                acceptTerms: true,
                acceptPrivacyPolicy: true
            });
            console.log('[SignUp] Step 3 Success. Registration complete.');

            // Auto-login logic
            if (res3.accessToken && res3.guide) {
                // Set memory token for immediate use
                setMemoryToken(res3.accessToken);

                try {
                    await AsyncStorage.setItem('auth_token', res3.accessToken);
                    await AsyncStorage.setItem('user_data', JSON.stringify(res3.guide));
                } catch (e) {
                    console.warn('[SignUp] Could not persist session to AsyncStorage:', e);
                }
            }

            setIsLoading(false);
            setSuccessModalVisible(true);
        } catch (error: any) {
            console.error('[SignUp] Registration Failed:', error);
            setIsLoading(false);
            setAlert({
                visible: true,
                title: t('Erreur'),
                message: typeof error === 'string' ? error : t('Une erreur est survenue lors de l\'inscription.'),
                type: 'error'
            });
        }
    };


    const handleSuccessContinue = () => {
        setSuccessModalVisible(false);
        router.replace('/(views)/(tabs)/home');
    };



    const renderStepContent = () => {
        const animatedStyle = {
            opacity: fadeAnim,
            transform: [{
                translateX: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [isRTL ? -20 : 20, 0]
                })
            }]
        };

        const textAlign = isRTL ? 'right' : 'left';

        switch (step) {
            case 1:
                return (
                    <Animated.View style={[styles.stepContainer, animatedStyle]}>
                        <Text style={[styles.stepTitle, { textAlign }]}>{t('Quel est votre numéro ?')}</Text>
                        <Text style={[styles.stepSubtitle, { textAlign }]}>{t('Nous vous enverrons un code pour vérifier votre téléphone.')}</Text>
                        <View style={[styles.inputWrapper, { transform: [{ scaleX: isRTL ? -1 : 1 }] }]}>
                            <PhoneInput
                                ref={phoneInput}
                                defaultValue={phone}
                                defaultCode="TN"
                                layout="first"
                                onChangeFormattedText={(text) => setPhone(text)}
                                containerStyle={styles.phoneContainer}
                                textContainerStyle={styles.phoneTextContainer}
                                textInputStyle={[styles.phoneTextInput, { textAlign: 'left' }]}
                                placeholder={t("Numéro de téléphone")}
                                autoFocus
                            />
                        </View>

                        <View style={styles.socialContainer}>
                            <View style={[styles.dividerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <View style={styles.divider} />
                                <Text style={styles.dividerText}>{t("ou s'inscrire avec")}</Text>
                                <View style={styles.divider} />
                            </View>
                            <TouchableOpacity style={[styles.socialButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} activeOpacity={0.8}>
                                <Ionicons name="logo-google" size={20} color="#DB4437" />
                                <Text style={styles.socialButtonText}>{t('Continuer avec Google')}</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                );
            case 2:
                return (
                    <Animated.View style={[styles.stepContainer, animatedStyle]}>
                        <Text style={[styles.stepTitle, { textAlign }]}>{t('Et votre email ?')}</Text>
                        <Text style={[styles.stepSubtitle, { textAlign }]}>{t('Pour recevoir vos confirmations de mission.')}</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={[styles.input, { textAlign }]}
                                placeholder={t("Adresse email")}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoFocus
                            />
                        </View>
                    </Animated.View>
                );
            case 3:
                return (
                    <Animated.View style={[styles.stepContainer, animatedStyle]}>
                        <Text style={[styles.stepTitle, { textAlign }]}>{t('Créez un mot de passe')}</Text>
                        <Text style={[styles.stepSubtitle, { textAlign }]}>{t('Au moins 8 caractères.')}</Text>
                        <View style={styles.inputWrapper}>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={[styles.input, { flex: 1, borderWidth: 0, textAlign }]}
                                    placeholder={t("Mot de passe")}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoFocus
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                    <Ionicons
                                        name={showPassword ? "eye-off" : "eye"}
                                        size={20}
                                        color={theme.colors.primary}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                );
            case 4:
                return (
                    <Animated.View style={[styles.stepContainer, animatedStyle]}>
                        <Text style={[styles.stepTitle, { textAlign }]}>{t('Comment vous appelez-vous ?')}</Text>
                        <Text style={[styles.stepSubtitle, { textAlign }]}>{t("C'est ainsi que les autres utilisateurs vous verront.")}</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={[styles.input, { marginBottom: 16, textAlign }]}
                                placeholder={t("Prénom")}
                                value={firstName}
                                onChangeText={setFirstName}
                                autoFocus
                            />
                            <TextInput
                                style={[styles.input, { textAlign }]}
                                placeholder={t("Nom")}
                                value={lastName}
                                onChangeText={setLastName}
                            />
                        </View>
                    </Animated.View>
                );
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity onPress={prevStep} style={[styles.backButton, { transform: [{ scaleX: isRTL ? -1 : 1 }] }]}>
                    <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {renderStepContent()}
                </ScrollView>

                <View style={styles.footer}>
                    <Button
                        title={step === 4 ? t("Rejoindre Sabeel Guide") : t("Continuer")}
                        onPress={nextStep}
                        style={styles.mainButton}
                        loading={isLoading}
                    />
                </View>
            </KeyboardAvoidingView>

            <Modal
                transparent={true}
                visible={successModalVisible}
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.successIconCircle}>
                            <Ionicons name="sparkles" size={36} color="#fff" />
                        </View>
                        <Text style={[styles.modalTitle, { textAlign: 'center' }]}>{t('Bienvenue sur Sabeel Guide !')}</Text>
                        <Text style={[styles.modalSubtitle, { textAlign: 'center' }]}>
                            {t('Votre compte a été créé avec succès. Préparez-vous à guider vos pèlerins.')}
                        </Text>
                        <Button
                            title={t("C'est parti")}
                            onPress={handleSuccessContinue}
                            style={styles.modalButton}
                        />
                    </View>
                </View>
            </Modal>
            <CustomAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onClose={() => setAlert({ ...alert, visible: false })}
                actionLabel={t("D'accord")}
            />
        </SafeAreaView>

    );
};

export default SignUpScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 10,
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 4,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    stepContainer: {
        width: '100%',
    },
    stepTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: theme.colors.text,
        marginBottom: 6,
        letterSpacing: -0.5,
    },
    stepSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: 20,
        lineHeight: 18,
    },
    inputWrapper: {
        width: '100%',
    },
    input: {
        backgroundColor: '#F7F9FC',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        fontSize: 13,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: '#E8EEF5',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7F9FC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E8EEF5',
    },
    eyeIcon: {
        paddingHorizontal: 10,
    },
    phoneContainer: {
        width: '100%',
        backgroundColor: '#F7F9FC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E8EEF5',
        height: 48,
        overflow: 'hidden',
    },
    phoneTextContainer: {
        backgroundColor: 'transparent',
        paddingVertical: 0,
    },
    phoneTextInput: {
        fontSize: 13,
        color: theme.colors.text,
        height: 48,
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: '#F0F3F7',
    },
    mainButton: {
        height: 46,
        borderRadius: 12,
    },
    socialContainer: {
        marginTop: 32,
        alignItems: 'center',
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        width: '100%',
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#F0F3F7',
    },
    dividerText: {
        paddingHorizontal: 16,
        color: theme.colors.muted,
        fontSize: 13,
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E8EEF5',
        paddingVertical: 8,
        borderRadius: 12,
        width: '100%',
        gap: 10,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            }
        }),
    },
    socialButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        alignItems: 'center',
    },
    successIconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 10,
    },
    modalSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    modalButton: {
        width: '100%',
        height: 50,
        borderRadius: 16,
    },
});


