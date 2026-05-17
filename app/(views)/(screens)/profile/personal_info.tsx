import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useProfileVM } from '@/hooks/profile/useProfileVM';
import { Image } from 'expo-image';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { useTrans } from '@/hooks/useTrans';
import { Button } from '@/components/common/Button';

export default function PersonalInfoPage() {
    const { t } = useTrans();
    const GENRES = [t('Inconnu'), t('Homme'), t('Femme')];
    const { user, handleUpdateProfile, handlePickAndUploadImage, isUploading } = useProfileVM();
    const router = useRouter();

    const [prenom, setPrenom] = useState(user?.firstName || '');
    const [nom, setNom] = useState(user?.lastName || '');
    const [genre, setGenre] = useState(user?.gender || 'Inconnu');
    const [nationalite, setNationalite] = useState(user?.nationality || '');
    const [dateNaissance, setDateNaissance] = useState<Date | null>(
        user?.dateOfBirth ? new Date(user.dateOfBirth) : null
    );
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [adresse, setAdresse] = useState(user?.address || '');
    const [ville, setVille] = useState(user?.city || '');
    const [pays, setPays] = useState(user?.country || '');
    const [telephone, setTelephone] = useState(user?.phoneNumber || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [languagesSpoken, setLanguagesSpoken] = useState(user?.languagesSpoken || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setPrenom(user.firstName || '');
            setNom(user.lastName || '');
            setGenre(user.gender || 'Inconnu');
            setNationalite(user.nationality || '');
            setDateNaissance(user.dateOfBirth ? new Date(user.dateOfBirth) : null);
            setAdresse(user.address || '');
            setVille(user.city || '');
            setPays(user.country || '');
            setTelephone(user.phoneNumber || '');
            setBio(user.bio || '');
            setLanguagesSpoken(user.languagesSpoken || '');
        }
    }, [user]);

    const [showGenrePicker, setShowGenrePicker] = useState(false);
    const [allCountries, setAllCountries] = useState<string[]>(['Tunisie', 'France', 'Arabie Saoudite', 'Algérie', 'Maroc']);
    const [showPaysPicker, setShowPaysPicker] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');

    const filteredCountries = allCountries.filter(c =>
        c.toLowerCase().includes(countrySearch.toLowerCase())
    );

    const handleClose = () => {
        router.back();
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const success = await handleUpdateProfile({
                firstName: prenom,
                lastName: nom,
                gender: genre,
                nationality: nationalite,
                dateOfBirth: dateNaissance ? dateNaissance.toISOString() : undefined,
                address: adresse,
                city: ville,
                country: pays,
                phoneNumber: telephone,
                bio: bio,
                languagesSpoken: languagesSpoken,
            });
            if (success) handleClose();
        } finally {
            setIsSaving(false);
        }
    };

    const GenrePickerModal = () => (
        <Modal visible={showGenrePicker} transparent animationType="slide">
            <View style={ps.sheetOverlay}>
                <View style={ps.sheet}>
                    <View style={ps.sheetHandle} />
                    <View style={ps.sheetHeader}>
                        <Text style={ps.sheetTitle}>{t('Choisir le genre')}</Text>
                        <TouchableOpacity onPress={() => setShowGenrePicker(false)}>
                            <Ionicons name="close" size={24} color={theme.colors.muted} />
                        </TouchableOpacity>
                    </View>
                    {GENRES.map((item) => (
                        <TouchableOpacity
                            key={item}
                            style={ps.sheetItem}
                            onPress={() => { setGenre(item); setShowGenrePicker(false); }}
                        >
                            <Text style={[ps.sheetItemText, { color: item === genre ? theme.colors.primary : theme.colors.text }]}>{t(item)}</Text>
                            {item === genre && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </Modal>
    );

    const CountryPickerModal = () => (
        <Modal visible={showPaysPicker} transparent animationType="slide">
            <View style={ps.sheetOverlay}>
                <View style={ps.countrySheet}>
                    <View style={ps.sheetHandle} />
                    <View style={ps.sheetHeader}>
                        <Text style={ps.sheetTitle}>{t('Choisir le pays')}</Text>
                        <TouchableOpacity onPress={() => { setShowPaysPicker(false); setCountrySearch(''); }}>
                            <Ionicons name="close" size={24} color={theme.colors.muted} />
                        </TouchableOpacity>
                    </View>
                    <View style={ps.countrySearchWrap}>
                        <Ionicons name="search" size={18} color={theme.colors.muted} style={{ marginRight: 12 }} />
                        <TextInput
                            style={ps.countrySearchInput}
                            placeholder={t('Rechercher un pays...')}
                            placeholderTextColor={theme.colors.muted}
                            value={countrySearch}
                            onChangeText={setCountrySearch}
                        />
                    </View>
                    <FlatList
                        data={filteredCountries}
                        keyExtractor={(item, index) => `${item}-${index}`}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={ps.sheetItem}
                                onPress={() => {
                                    setPays(item);
                                    setShowPaysPicker(false);
                                    setCountrySearch('');
                                }}
                            >
                                <Text style={[ps.sheetItemText, { color: item === pays ? theme.colors.primary : theme.colors.text }]}>{t(item)}</Text>
                                {item === pays && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={ps.container}>
            <View style={ps.header}>
                <TouchableOpacity onPress={handleClose} style={ps.closeBtn}>
                    <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={ps.headerTitle}>{t('Informations personnelles')}</Text>
                <View style={{ width: 36 }} />
            </View>
            <ScrollView contentContainerStyle={ps.content} showsVerticalScrollIndicator={false}>
                <View style={ps.avatarSection}>
                    <TouchableOpacity style={ps.avatarWrap} onPress={handlePickAndUploadImage}>
                        <Image source={{ uri: user?.photo }} style={ps.avatarImage} cachePolicy="disk" />
                        <View style={ps.cameraBadge}>
                            {isUploading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={16} color="#fff" />}
                        </View>
                    </TouchableOpacity>
                    <View style={ps.idBadge}>
                        <Text style={ps.identifiantText}>{t('ID: ')}{user?.uniqueIdentifier}</Text>
                    </View>
                </View>

                <Text style={ps.section}>{t('IDENTITÉ')}</Text>
                <View style={ps.card}>
                    <View style={ps.row}>
                        <Text style={ps.label}>{t('Prénom')}</Text>
                        <TextInput style={ps.input} value={prenom} onChangeText={setPrenom} placeholderTextColor={theme.colors.muted} />
                    </View>
                    <View style={ps.row}>
                        <Text style={ps.label}>{t('Nom')}</Text>
                        <TextInput style={ps.input} value={nom} onChangeText={setNom} placeholderTextColor={theme.colors.muted} />
                    </View>
                    <TouchableOpacity style={ps.row} onPress={() => setShowGenrePicker(true)}>
                        <Text style={ps.label}>{t('Genre')}</Text>
                        <View style={ps.pickerValueRow}>
                            <Text style={ps.valueText}>{t(genre)}</Text>
                            <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={[ps.row, { borderBottomWidth: 0 }]} onPress={() => setShowDatePicker(true)}>
                        <Text style={ps.label}>{t('Date de naissance')}</Text>
                        <View style={ps.pickerValueRow}>
                            <Text style={ps.valueText}>
                                {dateNaissance ? dateNaissance.toLocaleDateString() : t('Non définie')}
                            </Text>
                            <Ionicons name="calendar-outline" size={14} color={theme.colors.muted} />
                        </View>
                    </TouchableOpacity>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={dateNaissance || new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, date) => {
                            setShowDatePicker(false);
                            if (date) setDateNaissance(date);
                        }}
                    />
                )}

                <Text style={ps.section}>{t('DESCRIPTION & LANGUES')}</Text>
                <View style={[ps.card, { padding: 16 }]}>
                    <Text style={ps.fieldLabel}>{t('À propos (Bio)')}</Text>
                    <TextInput
                        multiline
                        numberOfLines={4}
                        style={ps.bioInput}
                        placeholder={t('Parlez-nous de vous...')}
                        value={bio}
                        onChangeText={setBio}
                    />
                    <View style={{ height: 16 }} />
                    <Text style={ps.fieldLabel}>{t('Langues parlées')}</Text>
                    <TextInput
                        style={ps.singleLineInput}
                        placeholder={t('Français, Anglais, Arabe...')}
                        value={languagesSpoken}
                        onChangeText={setLanguagesSpoken}
                    />
                </View>

                <Text style={ps.section}>{t('COORDONNÉES')}</Text>
                <View style={ps.card}>
                    <View style={ps.row}>
                        <Text style={ps.label}>{t('E-mail')}</Text>
                        <TextInput style={[ps.input, { color: theme.colors.muted }]} value={user?.email || ''} editable={false} />
                    </View>
                    <View style={ps.row}>
                        <Text style={ps.label}>{t('Téléphone')}</Text>
                        <TextInput style={ps.input} value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" />
                    </View>
                    <TouchableOpacity style={ps.row} onPress={() => setShowPaysPicker(true)}>
                        <Text style={ps.label}>{t('Pays')}</Text>
                        <View style={ps.pickerValueRow}>
                            <Text style={ps.valueText}>{t(pays)}</Text>
                            <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
                        </View>
                    </TouchableOpacity>
                    <View style={ps.row}>
                        <Text style={ps.label}>{t('Ville')}</Text>
                        <TextInput style={ps.input} value={ville} onChangeText={setVille} />
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={ps.footer}>
                <Button 
                    title={isSaving ? t('Enregistrement...') : t('Enregistrer les modifications')}
                    onPress={handleSave}
                    disabled={isSaving}
                    style={{ width: '100%' }}
                />
            </View>

            <GenrePickerModal />
            <CountryPickerModal />
        </SafeAreaView>
    );
}

const ps = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, backgroundColor: '#fff' },
    closeBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.text, letterSpacing: -0.3 },
    content: { padding: 18 },
    avatarSection: { alignItems: 'center', marginBottom: 20 },
    avatarWrap: { position: 'relative', marginBottom: 12 },
    avatarImage: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: theme.colors.primary },
    cameraBadge: { position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    idBadge: { backgroundColor: '#E8F5F1', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
    identifiantText: { fontSize: 12, fontWeight: '800', color: theme.colors.primary },
    section: { fontSize: 10, fontWeight: '900', color: theme.colors.muted, letterSpacing: 1.2, marginBottom: 10, marginTop: 18, paddingHorizontal: 4 },
    card: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
    row: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
    label: { fontSize: 13, fontWeight: '700', color: theme.colors.text, flex: 1 },
    input: { flex: 1.5, textAlign: 'right', fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600' },
    pickerValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    valueText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
    fieldLabel: { fontSize: 10, fontWeight: '900', color: theme.colors.muted, marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase' },
    bioInput: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 12,
        fontSize: 13,
        color: theme.colors.text,
        textAlignVertical: 'top',
        minHeight: 80,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    singleLineInput: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 42,
        fontSize: 13,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    footer: { padding: 18, borderTopWidth: 1, borderTopColor: theme.colors.divider, backgroundColor: '#fff' },
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
    countrySheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, height: '70%' },
    sheetHandle: { width: 36, height: 4, borderRadius: 3, backgroundColor: theme.colors.divider, alignSelf: 'center', marginBottom: 20 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sheetTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.text },
    sheetItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sheetItemText: { fontSize: 15, fontWeight: '700' },
    countrySearchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 16, borderWidth: 1.2, borderColor: theme.colors.border },
    countrySearchInput: { flex: 1, fontSize: 14, color: theme.colors.text, fontWeight: '600' },
});
