import React, { useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { freelanceComplianceApi } from '@/services/api';
import { CustomAlert } from '@/components/common/CustomAlert';

type EmailItem = {
  id: string;
  email: string;
  verified: boolean;
  createdAt: string;
};

export default function VerificationPage() {
  const router = useRouter();
  const colors = useThemeColors() as any;
  const PRIMARY = colors.primary;

  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpMode, setOtpMode] = useState<{ visible: boolean; email: string }>({ visible: false, email: '' });
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [alert, setAlert] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'warning' }>({
    visible: false,
    title: '',
    message: '',
    type: 'success',
  });

  const loadEmails = async () => {
    setLoading(true);
    try {
      const res = await freelanceComplianceApi.listEmails();
      setEmails(res.data);
    } catch (e) {
      console.error('Failed to load emails', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmails();
  }, []);

  const handleAddEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      Alert.alert('Erreur', 'Veuillez saisir une adresse email valide.');
      return;
    }

    setLoading(true);
    try {
      await freelanceComplianceApi.addEmail({ email: newEmail.trim() });
      setNewEmail('');
      setAlert({
        visible: true,
        title: 'Succès',
        message: 'L\'email a été ajouté. Un code OTP a été envoyé pour vérification.',
        type: 'success',
      });
      // Automatically open OTP mode for this email
      setOtpDigits(['', '', '', '', '', '']);
      setOtpMode({ visible: true, email: newEmail.trim() });
      await loadEmails();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message || 'Impossible d\'ajouter l\'email.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRequest = async (email: string) => {
    setLoading(true);
    try {
      await freelanceComplianceApi.requestEmailOtp({ email });
      setOtpDigits(['', '', '', '', '', '']);
      setOtpMode({ visible: true, email });
    } catch (e: any) {
      Alert.alert('Erreur', 'Impossible d\'envoyer le code OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpDigits.join('');
    if (code.length !== 6) return;

    setLoading(true);
    try {
      await freelanceComplianceApi.verifyEmailOtp({ email: otpMode.email, otp: code });
      setOtpMode({ visible: false, email: '' });
      setAlert({
        visible: true,
        title: 'Vérifié !',
        message: 'Votre adresse email a été vérifiée avec succès.',
        type: 'success',
      });
      await loadEmails();
    } catch (e: any) {
      Alert.alert('Erreur', 'Code OTP invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  const renderEmailCard = (item: EmailItem) => (
    <View key={item.id} style={styles.emailCard}>
      <View style={styles.emailInfo}>
        <Text style={styles.emailText}>{item.email}</Text>
        <Text style={styles.dateText}>Ajouté le {new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      {item.verified ? (
        <View style={[styles.statusBadge, styles.verifiedBadge]}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
          <Text style={styles.verifiedText}>Verified</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.statusBadge, styles.notVerifiedBadge]}
          onPress={() => handleVerifyRequest(item.email)}
        >
          <Text style={styles.notVerifiedText}>Not Verified</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.title}>Email Verification</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Intro Section */}
        <View style={styles.introSection}>
          <View style={styles.introIconContainer}>
            <MaterialCommunityIcons name="shield-check-outline" size={40} color={PRIMARY} />
          </View>
          <Text style={styles.introTitle}>Secure Your Account</Text>
          <Text style={styles.introDesc}>
            This page allows you to manage and verify your professional email addresses to secure your account and receive important notifications from Sabeel.
          </Text>
        </View>

        {/* Info Card */}


        {/* Email List */}
        <Text style={styles.sectionTitle}>Your Emails</Text>
        {emails.length === 0 && !loading ? (
          <Text style={styles.emptyText}>No professional emails added yet.</Text>
        ) : (
          emails.map(renderEmailCard)
        )}

        {/* Add Email Section */}
        <View style={styles.addSection}>
          <Text style={styles.sectionTitle}>Add Another Email</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter new email address"
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: PRIMARY }]}
            onPress={handleAddEmail}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addBtnText}>Add Email</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* OTP Modal */}
      <Modal visible={otpMode.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.otpCard}>
            <Text style={styles.otpTitle}>Verify Your Email</Text>
            <Text style={styles.otpSubtitle}>We've sent a 6-digit code to {otpMode.email}</Text>

            <View style={styles.otpRow}>
              {otpDigits.map((digit, idx) => (
                <TextInput
                  key={idx}
                  style={styles.otpBox}
                  value={digit}
                  onChangeText={(v) => {
                    const next = [...otpDigits];
                    next[idx] = v.slice(-1);
                    setOtpDigits(next);
                  }}
                  keyboardType="numeric"
                  maxLength={1}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.verifyBtn, { backgroundColor: PRIMARY }]}
              onPress={handleVerifyOtp}
            >
              <Text style={styles.verifyBtnText}>Verify OTP</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setOtpMode({ visible: false, email: '' })}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  scrollContent: { padding: 20 },

  introSection: { alignItems: 'center', marginBottom: 24 },
  introIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  introTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  introDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },

  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    gap: 12,
    marginBottom: 32
  },
  infoText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  emailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  emailInfo: { flex: 1 },
  emailText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  dateText: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4
  },
  verifiedBadge: { backgroundColor: '#ECFDF5' },
  notVerifiedBadge: { backgroundColor: '#FEF2F2' },
  verifiedText: { fontSize: 12, fontWeight: '700', color: '#10B981' },
  notVerifiedText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },

  addSection: { marginTop: 24 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 50, fontSize: 14, color: '#111827' },
  addBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 10, marginBottom: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  otpCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center' },
  otpTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  otpSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 24 },
  otpBox: {
    width: 40,
    height: 50,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700'
  },
  verifyBtn: { width: '100%', height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
});

