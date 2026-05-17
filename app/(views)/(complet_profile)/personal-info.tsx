import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { useRouter } from 'expo-router';
import { authService } from '@/services/authService';
import { CustomAlert } from '@/components/common/CustomAlert';
import { useUser } from '@/context/UserContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const PersonalInfoScreen = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, setUser } = useUser();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [dob, setDob] = useState<Date | null>(null);
    const [gender, setGender] = useState("male");
    const [nationality, setNationality] = useState("");
    const [residence, setResidence] = useState("");
    const [address, setAddress] = useState("");
    const [bio, setBio] = useState("");
    const [languages, setLanguages] = useState("");
    const [specialties, setSpecialties] = useState("");
    const [experience, setExperience] = useState("");
    const [pricePerDay, setPricePerDay] = useState("");
    const [location, setLocation] = useState("");

    const [alert, setAlert] = useState<{
        visible: boolean; title: string; message: string;
        type: 'success' | 'error' | 'warning'; action?: () => void;
    }>({ visible: false, title: '', message: '', type: 'error' });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const profile = await authService.getProfile();
            setFirstName(profile.firstName || "");
            setLastName(profile.lastName || "");
            if (profile.dateOfBirth) {
                setDob(new Date(profile.dateOfBirth));
            }
            setGender(profile.gender?.toLowerCase() || "male");
            setNationality(profile.nationality || "");
            setResidence(profile.countryOfResidence || "");
            setAddress(profile.fullAddress || "");
            setBio(profile.bio || "");
            setLanguages(profile.languages?.join(', ') || "");
            setSpecialties(profile.specialties?.join(', ') || "");
            setExperience(profile.experience?.toString() || "");
            setPricePerDay(profile.pricePerDay?.toString() || "");
            setLocation(profile.location || "");
        } catch (error) {
            setAlert({
                visible: true,
                title: "Erreur",
                message: "Impossible de charger votre profil.",
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDob(selectedDate);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const data = {
                firstName,
                lastName,
                dateOfBirth: dob ? dob.toISOString().split('T')[0] : undefined,
                gender: gender.toLowerCase(),
                nationality,
                countryOfResidence: residence,
                fullAddress: address,
                bio,
                languages: languages.split(',').map(s => s.trim()).filter(s => s.length > 0),
                specialties: specialties.split(',').map(s => s.trim()).filter(s => s.length > 0),
                experience: parseInt(experience) || 0,
                pricePerDay: parseFloat(pricePerDay) || 0,
                location
            };

            await authService.updateProfile(data);
            
            const fullProfile = await authService.getProfile();
            setUser(fullProfile);

            setAlert({
                visible: true,
                title: "Succès",
                message: "Vos informations ont été mises à jour avec succès !",
                type: 'success',
                action: () => router.back()
            });
        } catch (error: any) {
            setAlert({
                visible: true,
                title: "Erreur",
                message: typeof error === 'string' ? error : "Une erreur est survenue lors de la sauvegarde.",
                type: 'error'
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }


    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.form}>
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Prénom</Text>
                            <TextInput
                                style={styles.input}
                                value={firstName}
                                onChangeText={setFirstName}
                                placeholder="Prénom"
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Nom</Text>
                            <TextInput
                                style={styles.input}
                                value={lastName}
                                onChangeText={setLastName}
                                placeholder="Nom"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Biographie</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Parlez-nous de vous, votre parcours spirituel..."
                            multiline
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Date de naissance</Text>
                        <TouchableOpacity 
                            style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} 
                            onPress={() => setShowDatePicker(true)}
                            activeOpacity={0.7}
                        >
                            <Text style={{ color: dob ? '#1F2937' : '#9CA3AF', fontSize: 15 }}>
                                {dob ? dob.toLocaleDateString('fr-FR') : "Choisir une date"}
                            </Text>
                            <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={dob || new Date()}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onDateChange}
                                maximumDate={new Date()}
                            />
                        )}
                    </View>


                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Genre</Text>
                        <View style={styles.genderContainer}>
                            {['Male', 'Female'].map((g) => (
                                <TouchableOpacity
                                    key={g}
                                    style={[styles.genderOption, gender.toLowerCase() === g.toLowerCase() && styles.genderOptionActive]}
                                    onPress={() => setGender(g.toLowerCase())}
                                >
                                    <Text style={[styles.genderText, gender.toLowerCase() === g.toLowerCase() && styles.genderTextActive]}>{g}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Ville & Pays (Ex: Tunis, Tunisie)</Text>
                        <TextInput
                            style={styles.input}
                            value={location}
                            onChangeText={setLocation}
                            placeholder="Ville, Pays"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Langues parlées (Séparez par des virgules)</Text>
                        <TextInput
                            style={styles.input}
                            value={languages}
                            onChangeText={setLanguages}
                            placeholder="Arabe, Français, Anglais..."
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Spécialités (Séparez par des virgules)</Text>
                        <TextInput
                            style={styles.input}
                            value={specialties}
                            onChangeText={setSpecialties}
                            placeholder="Omra Standard, VIP, Histoire des lieux saints..."
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Expérience (Années)</Text>
                            <TextInput
                                style={styles.input}
                                value={experience}
                                onChangeText={setExperience}
                                keyboardType="number-pad"
                                placeholder="Ex: 5"
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Prix / Jour (TND)</Text>
                            <TextInput
                                style={styles.input}
                                value={pricePerDay}
                                onChangeText={setPricePerDay}
                                keyboardType="decimal-pad"
                                placeholder="Ex: 150"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Nationalité</Text>
                        <TextInput
                            style={styles.input}
                            value={nationality}
                            onChangeText={setNationality}
                            placeholder="Nationalité"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Adresse complète</Text>
                        <TextInput
                            style={[styles.input, { height: 70 }]}
                            value={address}
                            onChangeText={setAddress}
                            placeholder="Adresse"
                            multiline
                        />
                    </View>
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 15), paddingTop: 10 }]}>
                <TouchableOpacity 
                    style={[styles.saveBtn, isSaving && { opacity: 0.7 }]} 
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveBtnText}>Enregistrer</Text>
                    )}
                </TouchableOpacity>
            </View>

            <CustomAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onClose={() => setAlert(a => ({ ...a, visible: false }))}
                onAction={alert.action}
            />
        </SafeAreaView>
    );
};

export default PersonalInfoScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    scrollContent: {
        padding: 20,
    },
    form: {
        gap: 16,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    inputGroup: {
        gap: 6,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.secondary,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#F8F9FB',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        fontSize: 15,
        color: '#1F2937',
        borderWidth: 1,
        borderColor: '#F1F3F5',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    genderContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    genderOption: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#F1F3F5',
        alignItems: 'center',
        backgroundColor: '#F8F9FB',
    },
    genderOptionActive: {
        borderColor: theme.colors.primary,
        backgroundColor: `${theme.colors.primary}10`,
    },
    genderText: {
        fontSize: 14,
        color: theme.colors.muted,
        fontWeight: '600',
    },
    genderTextActive: {
        color: theme.colors.primary,
        fontWeight: '800',
    },
    saveBtn: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 30,
        elevation: 4,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

