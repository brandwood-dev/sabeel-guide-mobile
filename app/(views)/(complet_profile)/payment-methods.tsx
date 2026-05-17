import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '@/theme';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

const PaymentMethodsScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.methodCard}>
                    <View style={styles.methodHeader}>
                        <FontAwesome5 name="university" size={20} color={theme.colors.primary} />
                        <View>
                            <Text style={styles.methodTitle}>Bank Account (Primary)</Text>
                            <Text style={styles.methodDetails}>Attijari Bank • **** 4567</Text>
                        </View>
                    </View>
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                </View>

                <TouchableOpacity style={styles.addBtn}>
                    <Ionicons name="add" size={24} color={theme.colors.primary} />
                    <Text style={styles.addText}>Add New Payment Method</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

export default PaymentMethodsScreen;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    scrollContent: { padding: 24 },
    methodCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#F8F9FB',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F3F5',
        marginBottom: 16,
    },
    methodHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    methodTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.secondary },
    methodDetails: { fontSize: 13, color: theme.colors.muted, marginTop: 2 },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: theme.colors.primary,
        borderRadius: 16,
        gap: 8,
    },
    addText: { fontWeight: 'bold', color: theme.colors.primary },
});
