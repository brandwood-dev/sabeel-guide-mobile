import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
    StatusBar,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setLanguage, SupportedLang } from '@/store/uiSlice';
import { useTrans } from '@/hooks/useTrans';
import { theme } from '@/theme';
import { Button } from '@/components/common/Button';

type Lang = SupportedLang;

const LANGUAGES: { code: Lang; label: string; native: string; flag: string }[] = [
    { code: 'ar', label: 'Arabe', native: 'العربية', flag: '🇸🇦' },
    { code: 'fr', label: 'Français', native: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'Anglais', native: 'English', flag: '🇬🇧' },
];

export default function LanguagePage() {
    const router = useRouter();
    const dispatch = useDispatch();
    const currentLanguage = useSelector((state: RootState) => state.ui.language);
    const { t, language: hookLanguage } = useTrans();
    const isRTL = hookLanguage === 'ar';

    const [selected, setSelected] = useState<Lang>(currentLanguage || 'fr');
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSave = () => {
        dispatch(setLanguage(selected));
        setShowSuccess(true);
    };

    return (
        <SafeAreaView style={lg.container}>
            <StatusBar barStyle="dark-content" />
            <View style={[lg.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity onPress={() => router.back()} style={lg.closeBtn}>
                    <Ionicons name={isRTL ? 'arrow-forward' : 'chevron-back'} size={28} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={lg.headerTitle}>{t("Langue de l'application")}</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={lg.content}>
                <Text style={lg.subtitle}>
                    {t("Sélectionnez votre langue de préférence pour l'ensemble de l'application.")}
                </Text>

                <View style={lg.card}>
                    {LANGUAGES.map((lang, idx) => (
                        <React.Fragment key={lang.code}>
                            <TouchableOpacity
                                style={[
                                    lg.langRow,
                                    selected === lang.code && { backgroundColor: theme.colors.primary + '0A' },
                                    { flexDirection: isRTL ? 'row-reverse' : 'row' }
                                ]}
                                onPress={() => setSelected(lang.code)}
                                activeOpacity={0.7}
                            >
                                <View style={lg.flagWrap}>
                                    <Text style={lg.flag}>{lang.flag}</Text>
                                </View>
                                <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                                    <Text style={[lg.langLabel, { color: selected === lang.code ? theme.colors.primary : theme.colors.text }]}>
                                        {lang.native}
                                    </Text>
                                    <Text style={lg.langSub}>{lang.label}</Text>
                                </View>
                                {selected === lang.code && (
                                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                                )}
                            </TouchableOpacity>
                            {idx < LANGUAGES.length - 1 && <View style={lg.sep} />}
                        </React.Fragment>
                    ))}
                </View>

                <Button
                    title={t('Appliquer le changement')}
                    onPress={handleSave}
                    style={{ width: '100%', marginTop: 8 }}
                />
            </View>

            {/* Success Bottom Sheet */}
            <Modal visible={showSuccess} transparent animationType="slide" onRequestClose={() => setShowSuccess(false)}>
                <TouchableOpacity
                    style={lg.sheetOverlay}
                    activeOpacity={1}
                    onPress={() => { setShowSuccess(false); router.back(); }}
                >
                    <View style={lg.actionSheet}>
                        <View style={lg.sheetHandle} />
                        <View style={[lg.sheetIconWrap, { backgroundColor: theme.colors.primary + '15' }]}>
                            <Ionicons name="language-outline" size={32} color={theme.colors.primary} />
                        </View>
                        <Text style={lg.sheetTitle}>{t('Langue modifiée')}</Text>
                        <Text style={lg.sheetDesc}>
                            {t('Les menus et les données seront désormais affichés dans la langue choisie.')}
                        </Text>
                        <TouchableOpacity
                            style={[lg.sheetBtn, { backgroundColor: theme.colors.primary }]}
                            onPress={() => { setShowSuccess(false); router.back(); }}
                        >
                            <Text style={lg.sheetBtnText}>{t('Continuer')}</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const lg = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F5F7' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E7EB', backgroundColor: '#fff',
    },
    closeBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.text, letterSpacing: -0.3 },
    content: { padding: 20 },
    subtitle: { textAlign: 'center', fontSize: 13, color: theme.colors.muted, marginBottom: 20, fontWeight: '600', lineHeight: 20 },
    card: { borderRadius: 20, overflow: 'hidden', marginBottom: 24, backgroundColor: '#fff', borderWidth: 1.2, borderColor: '#E5E7EB' },
    langRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
    flagWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F4F5F7', alignItems: 'center', justifyContent: 'center' },
    flag: { fontSize: 22 },
    langLabel: { fontSize: 15, fontWeight: '800' },
    langSub: { fontSize: 12, color: theme.colors.muted, fontWeight: '600', marginTop: 1 },
    sep: { height: 1.2, backgroundColor: '#E5E7EB', marginLeft: 72 },
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    actionSheet: {
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, alignItems: 'center', backgroundColor: '#fff', paddingBottom: 40,
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 20 },
    sheetIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    sheetTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.text, marginBottom: 8 },
    sheetDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, color: theme.colors.muted, marginBottom: 24, paddingHorizontal: 20 },
    sheetBtn: { width: '100%', paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
    sheetBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
