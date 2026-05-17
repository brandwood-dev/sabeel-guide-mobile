import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, Image } from 'react-native';
import { theme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

const IdentityKYCScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.verifiedCard}>
                    <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                    <Text style={styles.verifiedTitle}>Account Verified</Text>
                    <Text style={styles.verifiedSub}>Your identity has been successfully confirmed.</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Document Details</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Document Type</Text>
                        <Text style={styles.value}>Passport</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Document No</Text>
                        <Text style={styles.value}>Z9887722</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Expiry Date</Text>
                        <Text style={styles.value}>20/11/2028</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Photos</Text>
                    <View style={styles.photoRow}>
                        <View style={styles.photoPlaceholder} />
                        <View style={styles.photoPlaceholder} />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default IdentityKYCScreen;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    scrollContent: { padding: 24 },
    verifiedCard: {
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#F0F7F2',
        borderRadius: 20,
        marginBottom: 24,
    },
    verifiedTitle: { fontSize: 20, fontWeight: 'bold', color: '#4CAF50', marginTop: 12 },
    verifiedSub: { fontSize: 14, color: theme.colors.muted, textAlign: 'center', marginTop: 4 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.secondary, marginBottom: 16 },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F3F5',
    },
    label: { color: theme.colors.muted },
    value: { fontWeight: 'bold', color: theme.colors.secondary },
    photoRow: { flexDirection: 'row', gap: 12 },
    photoPlaceholder: { flex: 1, height: 100, backgroundColor: '#F8F9FB', borderRadius: 12 },
});
