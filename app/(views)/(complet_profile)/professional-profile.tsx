import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import { theme } from '@/theme';
import { useRouter } from 'expo-router';

const ProfessionalProfileScreen = () => {
    const router = useRouter();
    const [type, setType] = useState("Freelance Guide");
    const [experience, setExperience] = useState("8 Years");
    const [languages, setLanguages] = useState("Arabic, French, English");
    const [specialties, setSpecialties] = useState("Umrah, VIP Groups, Cultural Tours");
    const [bio, setBio] = useState("Passionate about spiritual guiding and deep knowledge of holy places. Dedicated to providing pilgrims with a smooth and meaningful experience.");

    const handleSave = () => {
        Alert.alert("Success", "Professional profile updated successfully!");
        router.back();
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Guide Type</Text>
                        <TextInput
                            style={styles.input}
                            value={type}
                            onChangeText={setType}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Years of Experience</Text>
                        <TextInput
                            style={styles.input}
                            value={experience}
                            onChangeText={setExperience}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Languages Spoken</Text>
                        <TextInput
                            style={styles.input}
                            value={languages}
                            onChangeText={setLanguages}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Specialties</Text>
                        <TextInput
                            style={styles.input}
                            value={specialties}
                            onChangeText={setSpecialties}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Short Bio</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={bio}
                            onChangeText={setBio}
                            multiline
                        />
                    </View>

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                        <Text style={styles.saveBtnText}>Save Changes</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default ProfessionalProfileScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        padding: 24,
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.muted,
    },
    input: {
        backgroundColor: '#F8F9FB',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        fontSize: 16,
        color: theme.colors.secondary,
        borderWidth: 1,
        borderColor: '#F1F3F5',
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    saveBtn: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 20,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
