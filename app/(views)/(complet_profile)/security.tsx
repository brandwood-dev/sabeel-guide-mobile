import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { theme } from '@/theme';

const SecurityScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Change Password</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Current Password</Text>
                        <TextInput style={styles.input} secureTextEntry />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>New Password</Text>
                        <TextInput style={styles.input} secureTextEntry />
                    </View>
                    <TouchableOpacity style={styles.saveBtn} onPress={() => Alert.alert("Success", "Password updated!")}>
                        <Text style={styles.saveText}>Update Password</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default SecurityScreen;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    scrollContent: { padding: 24 },
    section: { gap: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.secondary },
    inputGroup: { gap: 8 },
    label: { fontSize: 14, color: theme.colors.muted },
    input: { backgroundColor: '#F8F9FB', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#F1F3F5' },
    saveBtn: { backgroundColor: theme.colors.secondary, padding: 18, borderRadius: 16, alignItems: 'center' },
    saveText: { color: '#fff', fontWeight: 'bold' },
});
