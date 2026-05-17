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

const ContactDetailsScreen = () => {
    const router = useRouter();
    const [email, setEmail] = useState("ahmed.guide@sabeel.com");
    const [phone, setPhone] = useState("+216 22 123 456");
    const [whatsapp, setWhatsapp] = useState("+216 22 123 456");
    const [emergency, setEmergency] = useState("Maria Ahmed (+216 98 765 432)");

    const handleSave = () => {
        Alert.alert("Success", "Contact details updated successfully!");
        router.back();
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>WhatsApp Number</Text>
                        <TextInput
                            style={styles.input}
                            value={whatsapp}
                            onChangeText={setWhatsapp}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Emergency Contact</Text>
                        <TextInput
                            style={styles.input}
                            value={emergency}
                            onChangeText={setEmergency}
                            placeholder="Name and Phone"
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

export default ContactDetailsScreen;

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
