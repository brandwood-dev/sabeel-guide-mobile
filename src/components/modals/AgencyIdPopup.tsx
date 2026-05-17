import React, { useState, useRef, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Easing,
    Alert,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';

import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/common/Button';

const { width } = Dimensions.get('window');

export const AgencyIdPopup = () => {
    const { showAgencyIdPopup, setShowAgencyIdPopup, setAgencyId } = useUser();
    const [tempId, setTempId] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);

    // Scanner Animation
    const scanLineAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (showScanner) {
            startScanAnimation();
        } else {
            scanLineAnim.stopAnimation();
        }
    }, [showScanner]);

    const startScanAnimation = () => {
        scanLineAnim.setValue(0);
        Animated.loop(
            Animated.timing(scanLineAnim, {
                toValue: 1,
                duration: 2500,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    };

    const handlePressScan = async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
        if (status === 'granted') {
            setShowScanner(true);
        } else {
            Alert.alert(
                "Permission requise",
                "Nous avons besoin de votre permission pour utiliser la caméra et scanner le code QR.",
                [{ text: "D'accord" }]
            );
        }
    };

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        setShowScanner(false);
        setTempId(data);
    };

    const handleSubmit = () => {
        if (tempId.trim()) {
            setAgencyId(tempId.trim());
            setShowAgencyIdPopup(false);
        }
    };


    return (
        <Modal
            visible={showAgencyIdPopup}
            transparent
            animationType="slide"
            onRequestClose={() => setShowAgencyIdPopup(false)}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={styles.dismissArea}
                    activeOpacity={1}
                    onPress={() => setShowAgencyIdPopup(false)}
                />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.sheetContainer}
                >
                    <View style={styles.sheetContent}>
                        <View style={styles.handle} />

                        <View style={styles.header}>
                            <View>
                                <Text style={styles.title}>Identification Agence</Text>
                                <Text style={styles.subtitle}>Saisissez l&apos;ID fourni par l&apos;agence ou scannez le code QR</Text>

                            </View>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.label}>ID DE L&apos;AGENCE</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ex: AGENCE-2024"
                                    value={tempId}
                                    onChangeText={setTempId}
                                    autoCapitalize="characters"
                                    placeholderTextColor={theme.colors.muted}
                                />
                                <TouchableOpacity
                                    style={styles.scanBtn}
                                    onPress={handlePressScan}
                                >
                                    <Ionicons name="qr-code-outline" size={20} color={theme.colors.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>


                        <View style={styles.buttons}>
                            <Button
                                title="Plus tard"
                                variant="secondary"
                                size="medium"
                                onPress={() => setShowAgencyIdPopup(false)}
                                style={styles.actionBtn}
                            />
                            <Button
                                title="Se connecter"
                                size="medium"
                                onPress={handleSubmit}
                                style={styles.actionBtn}
                            />
                        </View>
                        <View style={{ height: Platform.OS === 'ios' ? 20 : 10 }} />
                    </View>
                </KeyboardAvoidingView>


                {/* QR Scanner Overlay - Full Screen */}
                {showScanner && (
                    <View style={styles.scannerOverlay}>
                        <CameraView
                            style={StyleSheet.absoluteFill}
                            facing="back"
                            onBarcodeScanned={handleBarCodeScanned}
                            barcodeScannerSettings={{
                                barcodeTypes: ["qr"],
                            }}
                        >
                            <View style={styles.scannerContainer}>
                                <TouchableOpacity
                                    style={styles.closeScanner}
                                    onPress={() => setShowScanner(false)}
                                >
                                    <Ionicons name="close" size={28} color="#fff" />
                                </TouchableOpacity>

                                <View style={styles.finder}>
                                    <Animated.View style={[
                                        styles.scanLine,
                                        {
                                            transform: [{
                                                translateY: scanLineAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [0, 200]
                                                })
                                            }]
                                        }
                                    ]} />
                                    <View style={[styles.corner, styles.topLeft]} />
                                    <View style={[styles.corner, styles.topRight]} />
                                    <View style={[styles.corner, styles.bottomLeft]} />
                                    <View style={[styles.corner, styles.bottomRight]} />
                                </View>

                                <Text style={styles.scannerHint}>Alignez le code QR dans le carré</Text>
                            </View>
                        </CameraView>
                    </View>
                )}
            </View>
        </Modal>

    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    dismissArea: {
        flex: 1,
    },
    sheetContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
    },
    sheetContent: {
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 28,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: '#F0F7F2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        color: theme.colors.secondary,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13,
        color: theme.colors.muted,
        marginTop: 2,
    },
    inputWrapper: {
        marginBottom: 28,
    },
    label: {
        fontSize: 11,
        fontWeight: '800',
        color: theme.colors.muted,
        marginBottom: 10,
        letterSpacing: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        paddingRight: 8,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    input: {
        flex: 1,
        height: 56,
        paddingHorizontal: 18,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.secondary,
    },
    scanBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    buttons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        marginTop: 10,
    },
    actionBtn: {
        flex: 1,
        minWidth: 0,
    },
    // Scanner Styles
    scannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        zIndex: 100,
    },
    scannerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    closeScanner: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 101,
    },

    finder: {
        width: 200,
        height: 200,
        borderWidth: 0,
        backgroundColor: 'transparent',
    },
    scanLine: {
        width: '100%',
        height: 2,
        backgroundColor: theme.colors.primary,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 10,
    },
    corner: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderColor: theme.colors.primary,
        borderWidth: 4,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    topRight: {
        top: 0,
        right: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderRightWidth: 0,
        borderTopWidth: 0,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    scannerHint: {
        color: '#fff',
        marginTop: 40,
        fontSize: 14,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 10,
    }
});




