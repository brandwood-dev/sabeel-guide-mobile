import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import SignatureCanvas from 'react-native-signature-canvas';
import { freelanceComplianceApi } from '@/services/api';
import { theme } from '@/theme';
import { useRouter } from 'expo-router';
import { SERVER_BASE_URL } from '@/services/api';
import * as WebBrowser from 'expo-web-browser';

const CONTRACT_TEXT = [
  {
    title: '1. Introduction',
    content: 'Le présent Contrat de Services ("Contrat") est conclu entre le Guide ("Prestataire") et la plateforme Sabeel ("Plateforme") dans le but de faciliter les services de guidage pour les pèlerins.'
  },
  {
    title: '2. Objet du contrat',
    content: 'Le présent contrat a pour objet de définir les conditions dans lesquelles le Guide propose ses services de guide touristique aux pèlerins via la plateforme Sabeel.'
  },
  {
    title: '3. Obligations du Guide',
    content: 'Le Guide s\'engage à :\n• Fournir des services de guide professionnels et conformes aux standards de qualité\n• Respecter les principes religieux et culturels des pèlerins\n• Maintenir à jour ses documents professionnels et certifications\n• Assurer la sécurité et le bien-être des pèlerins pendant les prestations'
  },
  {
    title: '4. Durée et Renouvellement',
    content: 'Le présent contrat est conclu pour une durée renouvelable choisie par le Guide. Le contrat prend fin automatiquement à l\'échéance sauf renouvellement explicite.'
  },
  {
    title: '5. Rémunération',
    content: 'La rémunération du Guide est déterminée selon les tarifs affichés sur la plateforme. La commission de la plateforme est prélevée conformément aux conditions générales d\'utilisation.'
  },
  {
    title: '6. Responsabilité',
    content: 'Le Guide est responsable de ses actes professionnels et doit souscrire une assurance responsabilité civile professionnelle couvrant ses activités.'
  },
  {
    title: '7. Confidentialité',
    content: 'Le Guide s\'engage à maintenir la confidentialité des informations concernant les pèlerins et à ne pas les utiliser à des fins non autorisées.'
  },
  {
    title: '8. Droit applicable',
    content: 'Le présent contrat est régi par le droit en vigueur et tout litige sera soumis aux juridictions compétentes.'
  }
];

const DURATION_OPTIONS = [
  { label: 'Valide pour 6 mois', value: 6 },
  { label: 'Valide pour 1 an', value: 12 },
  { label: 'Valide pour 2 ans', value: 24 },
];

export default function ContractScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState(12);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [typedSignature, setTypedSignature] = useState('');
  const [signatureMode, setSignatureMode] = useState<'type' | 'draw'>('type');
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const signatureRef = useRef<any>(null);

  const [compliance, setCompliance] = useState<any>(null);
  const [complianceLoading, setComplianceLoading] = useState(false);

  const loadCompliance = async () => {
    setComplianceLoading(true);
    try {
      const res = await freelanceComplianceApi.getMe();
      setCompliance(res.data);
    } catch {
      setCompliance(null);
    } finally {
      setComplianceLoading(false);
    }
  };

  useEffect(() => {
    loadCompliance();
  }, []);

  const contractDone = Boolean(compliance?.steps?.contract?.done);
  const contractExpiresAt = compliance?.steps?.contract?.expiresAt
    ? new Date(compliance.steps.contract.expiresAt)
    : null;
  const contractSignedAt = compliance?.steps?.contract?.signedAt
    ? new Date(compliance.steps.contract.signedAt)
    : null;
  const contractExpired =
    !contractDone &&
    !!contractSignedAt &&
    !!contractExpiresAt &&
    contractExpiresAt.getTime() <= Date.now();

  const handleSignature = (signature: string) => {
    if (signature) {
      console.log('[Signature] Captured signature image');
      setSignatureImage(signature);
      setShowSignatureModal(false);
    } else {
      Alert.alert('Info', 'Veuillez dessiner une signature avant d\'enregistrer.');
    }
  };

  const handleClear = () => {
    if (signatureRef.current) {
      signatureRef.current.clearSignature();
      setSignatureImage(null);
    }
  };

  const handleSaveSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.readSignature();
    }
  };

  const handleDownloadPdf = async () => {
    setLoading(true);
    try {
      // Get the signed URL from the backend
      const res = await freelanceComplianceApi.getMe();
      const contractUrl = res.data?.steps?.contract?.contractPdfUrl;

      if (!contractUrl) {
        Alert.alert('Erreur', 'Le contrat n\'est pas encore disponible.');
        return;
      }

      // Open in browser which usually handles PDF download/viewing better
      await WebBrowser.openBrowserAsync(contractUrl);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de télécharger le contrat.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (contractDone) {
      handleDownloadPdf();
      return;
    }

    if (signatureMode === 'type' && !typedSignature.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir votre nom pour la signature');
      return;
    }

    if (signatureMode === 'draw' && !signatureImage) {
      Alert.alert('Erreur', 'Veuillez dessiner votre signature');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('durationMonths', duration.toString());

      if (signatureMode === 'draw' && signatureImage) {
        // Send signature as base64 data URL (more reliable than Blob in React Native)
        formData.append('signatureBase64', signatureImage);
      } else {
        formData.append('signatureText', typedSignature);
      }

      await freelanceComplianceApi.uploadContract(formData);
      await loadCompliance();

      Alert.alert('Succès', 'Votre contrat a été soumis et activé avec succès.', [{ text: 'OK' }]);
      setSignatureImage(null);
      setTypedSignature('');
      setDuration(12);
    } catch (error: any) {
      Alert.alert('Erreur', error?.response?.data?.message || 'Impossible de soumettre le contrat.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contract Guide</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Contract Status Banner */}
        {contractDone && (
          <View style={styles.statusBanner}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.white} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.statusTitle}>Contrat Actif</Text>
              <Text style={styles.statusSub}>Expire le {contractExpiresAt?.toLocaleDateString()}</Text>
            </View>
          </View>
        )}
        {contractExpired && (
          <View style={[styles.statusBanner, { backgroundColor: '#F59E0B' }]}>
            <Ionicons name="alert-circle" size={24} color={theme.colors.white} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.statusTitle}>Contrat expiré</Text>
              <Text style={styles.statusSub}>Expiré le {contractExpiresAt?.toLocaleDateString()}</Text>
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Conditions du Contrat</Text>
        </View>

        {/* Contract Terms Card */}
        <View style={styles.termsCard}>
          {CONTRACT_TEXT.map((item, index) => (
            <View key={index} style={styles.termItem}>
              <Text style={styles.termTitle}>{item.title}</Text>
              <Text style={styles.termContent}>{item.content}</Text>
            </View>
          ))}
        </View>

        {/* Contract Validity Selection */}
        {!contractDone && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Validité du Contrat</Text>
            </View>
            <View style={styles.validityCard}>
              {DURATION_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.radioOption,
                    duration === option.value && styles.radioOptionSelected
                  ]}
                  onPress={() => setDuration(option.value)}
                >
                  <Text style={[
                    styles.radioText,
                    duration === option.value && styles.radioTextSelected
                  ]}>{option.label}</Text>
                  <View style={[
                    styles.radioCircle,
                    duration === option.value && styles.radioCircleSelected
                  ]}>
                    {duration === option.value && <View style={styles.radioInnerCircle} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Signature Confirmation */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Confirmation de Signature</Text>
            </View>
            <View style={styles.signatureCard}>
              <Text style={styles.signatureSubtext}>Saisissez ou dessinez votre signature pour confirmer et autoriser cet accord.</Text>
              
              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tab, signatureMode === 'type' && styles.tabActive]}
                  onPress={() => setSignatureMode('type')}
                >
                  <Text style={[styles.tabText, signatureMode === 'type' && styles.tabTextActive]}>Saisir</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, signatureMode === 'draw' && styles.tabActive]}
                  onPress={() => setSignatureMode('draw')}
                >
                  <Text style={[styles.tabText, signatureMode === 'draw' && styles.tabTextActive]}>Dessiner</Text>
                </TouchableOpacity>
              </View>

              {signatureMode === 'type' ? (
                <View style={styles.signatureInputContainer}>
                  <Text style={styles.inputLabel}>Votre Signature (Nom Complet)</Text>
                  <TextInput
                    style={styles.signatureInput}
                    placeholder="Tapez ici..."
                    value={typedSignature}
                    onChangeText={setTypedSignature}
                  />
                </View>
              ) : (
                <View style={styles.drawContainer}>
                  {signatureImage ? (
                    <View style={styles.signaturePreview}>
                      <Text style={styles.previewLabel}>Aperçu de la signature</Text>
                      <View style={styles.signaturePlaceholder}>
                        <Ionicons name="checkmark-circle" size={32} color={theme.colors.success} />
                        <Text style={styles.signatureSuccessText}>Signature enregistrée</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.reDrawButton} 
                        onPress={() => setShowSignatureModal(true)}
                      >
                        <Text style={styles.reDrawText}>Redessiner</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.drawButton} 
                      onPress={() => setShowSignatureModal(true)}
                    >
                      <MaterialIcons name="draw" size={32} color={theme.colors.primary} />
                      <Text style={styles.drawButtonText}>Cliquer pour dessiner</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Footer with Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton, 
            !contractDone && (loading || (signatureMode === 'draw' && !signatureImage) || (signatureMode === 'type' && !typedSignature)) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>
              {contractDone ? 'Télécharger PDF' : 'Signer & Activer'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Signature Drawing Modal */}
      <Modal
        visible={showSignatureModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSignatureModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSignatureModal(false)} style={styles.modalHeaderButton}>
              <Ionicons name="close" size={28} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Signature</Text>
            <TouchableOpacity onPress={handleSaveSignature} style={styles.modalHeaderButton}>
              <Ionicons name="checkmark" size={28} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.signatureCanvasContainer}>
            <SignatureCanvas
              ref={signatureRef}
              onOK={handleSignature}
              onEmpty={() => {}}
              onClear={() => console.log('[Signature] Cleared')}
              imageType="image/png"
              autoClear={true}
              descriptionText="Signez ici"
              style={styles.signatureCanvas}
            />
          </View>

          <View style={styles.signatureActions}>
            <TouchableOpacity style={styles.signatureActionButton} onPress={handleClear}>
              <Text style={styles.signatureActionText}>Effacer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  scrollContent: {
    padding: 16,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  statusTitle: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  statusSub: {
    color: theme.colors.white,
    opacity: 0.9,
    fontSize: 13,
  },
  sectionHeader: {
    marginBottom: 12,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  termsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  termItem: {
    marginBottom: 20,
  },
  termTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  termContent: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  validityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F1F1',
    marginBottom: 10,
  },
  radioOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#F0F7F0',
  },
  radioText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  radioTextSelected: {
    color: theme.colors.primary,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: theme.colors.primary,
  },
  radioInnerCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  signatureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  signatureSubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 20,
    lineHeight: 18,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F1F1',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.white,
  },
  signatureInputContainer: {
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 10,
  },
  signatureInput: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  drawContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  drawButton: {
    alignItems: 'center',
  },
  drawButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 8,
  },
  signaturePreview: {
    width: '100%',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  signaturePlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7F0',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  signatureSuccessText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.success,
  },
  reDrawButton: {
    marginTop: 12,
  },
  reDrawText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalHeaderButton: {
    padding: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalSaveText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  signatureCanvasContainer: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  signatureCanvas: {
    flex: 1,
  },
  signatureActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    alignItems: 'center',
  },
  signatureActionButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: '#F1F1F1',
    borderRadius: 12,
  },
  signatureActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
});
