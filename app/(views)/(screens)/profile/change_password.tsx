import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTrans } from '@/hooks/useTrans';

function PasswordField({
    label, value, onChangeText, show, onToggle, placeholder, isDarkMode, TEXT, TEXT_SEC, BORDER
}: { label: string; value: string; onChangeText: (t: string) => void; show: boolean; onToggle: () => void; placeholder: string; isDarkMode: boolean; TEXT: string; TEXT_SEC: string; BORDER: string }) {
    return (
        <View style={cpw.fieldWrap}>
            <Text style={[cpw.label, { color: TEXT_SEC }]}>{label}</Text>
            <View style={[cpw.inputWrap, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F9FAFB', borderColor: BORDER }]}>
                <TextInput
                    style={[cpw.input, { color: TEXT }]}
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={!show}
                    placeholder={placeholder}
                    placeholderTextColor={TEXT_SEC}
                    autoCapitalize="none"
                />
                <TouchableOpacity onPress={onToggle} style={cpw.eyeBtn}>
                    <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={TEXT_SEC} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default function ChangePasswordPage() {
    const router = useRouter();
    const colors = useThemeColors() as any;
    const isDarkMode = false;
    const { t } = useTrans();

    const PAGE_BG = isDarkMode ? '#111111' : '#F4F5F7';
    const CARD_BG = isDarkMode ? '#1C1C1E' : '#FFFFFF';
    const TEXT = isDarkMode ? '#FFFFFF' : '#111827';
    const TEXT_SEC = isDarkMode ? '#8A8A8E' : '#6B7280';
    const BORDER = isDarkMode ? '#3A3A3C' : '#E5E7EB';
    const PRIMARY = colors.primary;

    const [current, setCurrent] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const strength = newPwd.length === 0 ? 0 : newPwd.length < 6 ? 1 : newPwd.length < 10 ? 2 : 3;
    const strengthColor = ['#ccc', '#EF4444', '#F59E0B', '#22C55E'][strength];
    const strengthLabel = ['', t('Faible'), t('Moyen'), t('Fort')][strength];

    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!current || !newPwd || !confirm) {
            Alert.alert(t('Erreur'), t('Veuillez remplir tous les champs.'));
            return;
        }
        if (newPwd !== confirm) {
            Alert.alert(t('Erreur'), t('Les mots de passe ne correspondent pas.'));
            return;
        }
        if (newPwd.length < 8) {
            Alert.alert(t('Erreur'), t('Le mot de passe doit contenir au moins 8 caractères.'));
            return;
        }

        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            Alert.alert(t('Succès'), t('Mot de passe modifié avec succès.'), [
                { text: 'OK', onPress: () => router.back() }
            ]);
        }, 1500);
    };

    return (
        <SafeAreaView style={[cpw.container, { backgroundColor: PAGE_BG }]}>
            <View style={[cpw.header, { backgroundColor: PAGE_BG, borderBottomColor: BORDER }]}>
                <TouchableOpacity onPress={() => router.back()} style={cpw.closeBtn}>
                    <Ionicons name="chevron-back" size={26} color={PRIMARY} />
                </TouchableOpacity>
                <Text style={[cpw.headerTitle, { color: TEXT }]}>{t('Changer le mot de passe')}</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView style={cpw.content}>
                <View style={[cpw.iconWrap, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="lock-closed" size={32} color={PRIMARY} />
                </View>
                <Text style={[cpw.subtitle, { color: TEXT_SEC }]}>
                    {t("Choisissez un mot de passe fort d'au moins 8 caractères.")}
                </Text>

                <View style={[cpw.card, { backgroundColor: CARD_BG }]}>
                    <PasswordField
                        label={t("Mot de passe actuel")}
                        value={current}
                        onChangeText={setCurrent}
                        show={showCurrent}
                        onToggle={() => setShowCurrent(!showCurrent)}
                        placeholder="••••••••"
                        isDarkMode={isDarkMode}
                        TEXT={TEXT}
                        TEXT_SEC={TEXT_SEC}
                        BORDER={BORDER}
                    />
                    <View style={cpw.divider} />
                    <PasswordField
                        label={t("Nouveau mot de passe")}
                        value={newPwd}
                        onChangeText={setNewPwd}
                        show={showNew}
                        onToggle={() => setShowNew(!showNew)}
                        placeholder="••••••••"
                        isDarkMode={isDarkMode}
                        TEXT={TEXT}
                        TEXT_SEC={TEXT_SEC}
                        BORDER={BORDER}
                    />
                    {newPwd.length > 0 && (
                        <View style={cpw.strengthWrap}>
                            <View style={cpw.strengthBars}>
                                {[1, 2, 3].map(i => (
                                    <View key={i} style={[cpw.strengthBar, { backgroundColor: strength >= i ? strengthColor : BORDER }]} />
                                ))}
                            </View>
                            <Text style={[cpw.strengthLabel, { color: strengthColor }]}>{strengthLabel}</Text>
                        </View>
                    )}
                    <View style={cpw.divider} />
                    <PasswordField
                        label={t("Confirmer le mot de passe")}
                        value={confirm}
                        onChangeText={setConfirm}
                        show={showConfirm}
                        onToggle={() => setShowConfirm(!showConfirm)}
                        placeholder="••••••••"
                        isDarkMode={isDarkMode}
                        TEXT={TEXT}
                        TEXT_SEC={TEXT_SEC}
                        BORDER={BORDER}
                    />
                </View>

                <TouchableOpacity 
                    style={[cpw.saveBtn, { backgroundColor: PRIMARY }]} 
                    onPress={handleSave}
                    disabled={loading}
                >
                    <Text style={cpw.saveBtnText}>{loading ? t('Modification...') : t('Enregistrer')}</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const cpw = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
    closeBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 15, fontWeight: '900', letterSpacing: -0.2 },
    content: { padding: 18 },
    iconWrap: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 12, marginBottom: 10 },
    subtitle: { textAlign: 'center', fontSize: 12, marginBottom: 18, fontWeight: '600', paddingHorizontal: 20, lineHeight: 18 },
    card: { borderRadius: 20, overflow: 'hidden', marginBottom: 20, elevation: 2, borderWidth: 1, borderColor: '#eee' },
    fieldWrap: { paddingHorizontal: 16, paddingVertical: 12 },
    label: { fontSize: 11, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12 },
    input: { flex: 1, fontSize: 13, paddingVertical: 10 },
    eyeBtn: { padding: 4 },
    divider: { height: 1.2, backgroundColor: '#f0f0f0', marginHorizontal: 16 },
    strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 10 },
    strengthBars: { flexDirection: 'row', gap: 3, flex: 1 },
    strengthBar: { flex: 1, height: 3.5, borderRadius: 2 },
    strengthLabel: { fontSize: 11, fontWeight: '800' },
    saveBtn: { paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
