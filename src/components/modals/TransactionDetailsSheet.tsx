import React from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';

type Tx = {
  id?: string;
  amount?: number;
  currency?: string;
  type?: string;
  status?: string;
  createdAt?: string;
  fromWalletId?: string | null;
  toWalletId?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  stripeObjectType?: string | null;
  stripeObjectId?: string | null;
  stripeEventId?: string | null;
  metadata?: any;
};

const formatMoney = (amountCents?: number, currency?: string) => {
  const amount = typeof amountCents === 'number' ? amountCents : 0;
  const cur = String(currency || 'TND').toUpperCase();
  const divisor = cur === 'TND' ? 1000 : 100;
  return `${(amount / divisor).toFixed(2)} ${cur}`;
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const ms = Date.parse(String(value));
  if (!Number.isFinite(ms)) return String(value);
  return new Date(ms).toLocaleString();
};

const renderField = (label: string, value: any) => {
  const text = value === null || value === undefined || value === '' ? '-' : String(value);
  return (
    <View style={ss.row}>
      <Text style={ss.label}>{label}</Text>
      <Text style={ss.value} numberOfLines={3}>
        {text}
      </Text>
    </View>
  );
};

export const TransactionDetailsSheet = ({
  visible,
  transaction,
  onClose,
}: {
  visible: boolean;
  transaction: Tx | null;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const tx = transaction || ({} as Tx);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={ss.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[ss.sheet, { paddingBottom: insets.bottom + 18 }]}
        >
          <View style={ss.handle} />
          <TouchableOpacity style={ss.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color={theme.colors.muted} />
          </TouchableOpacity>

          <View style={ss.header}>
            <View style={ss.iconWrap}>
              <Ionicons name="receipt-outline" size={22} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ss.title}>Détails de transaction</Text>
              <Text style={ss.subtitle} numberOfLines={1}>
                {formatMoney(tx.amount, tx.currency)}
              </Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
            <View style={ss.section}>
              <Text style={ss.sectionTitle}>Transaction</Text>
              {renderField('Transaction ID', tx.id)}
              {renderField('Type', tx.type)}
              {renderField('Status', tx.status)}
              {renderField('Date & heure', formatDateTime(tx.createdAt))}
            </View>

            <View style={ss.section}>
              <Text style={ss.sectionTitle}>Références</Text>
              {renderField('Wallet reference type', tx.referenceType)}
              {renderField('Wallet reference ID', tx.referenceId)}
              {renderField('Stripe object type', tx.stripeObjectType)}
              {renderField('Stripe object ID', tx.stripeObjectId)}
              {renderField('Stripe event ID', tx.stripeEventId)}
            </View>

            <View style={ss.section}>
              <Text style={ss.sectionTitle}>Participants</Text>
              {renderField('From wallet', tx.fromWalletId)}
              {renderField('To wallet', tx.toWalletId)}
            </View>

            <View style={ss.section}>
              <Text style={ss.sectionTitle}>Raison / Metadata</Text>
              {renderField('Reason', tx?.metadata?.reason || tx?.metadata?.message || tx?.metadata?.flow)}
              {renderField('Metadata', tx.metadata ? JSON.stringify(tx.metadata) : null)}
            </View>

            <View style={{ height: 6 }} />
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const ss = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    width: '100%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 18 },
      android: { elevation: 18 },
    }),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 14,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingRight: 26,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: theme.colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.muted,
    marginTop: 2,
  },
  section: {
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.colors.text,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  label: {
    width: 120,
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: '700',
  },
  value: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '700',
    textAlign: 'right',
  },
});
