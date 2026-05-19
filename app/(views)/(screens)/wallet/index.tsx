import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { useThemeColors, useIsDarkMode } from '@/hooks/useThemeColors';
import { walletApi } from '@/services/api';
import { paymentsApi } from '@/services/api';
import { authService } from '@/services/authService';
import { TransactionDetailsSheet } from '@/components/modals/TransactionDetailsSheet';
import { CustomAlert } from '@/components/common/CustomAlert';
import { useFocusEffect } from 'expo-router';

type Wallet = {
  id: string;
  currency: string;
  availableBalance: number;
  pendingBalance: number;
};

type Tx = {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
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

const formatDate = (value?: string) => {
  if (!value) return '';
  const ms = Date.parse(String(value));
  if (!Number.isFinite(ms)) return String(value);
  return new Date(ms).toLocaleDateString();
};

const isIncoming = (tx: Tx, walletId?: string) => {
  if (!walletId) return false;
  return String(tx.toWalletId || '') === String(walletId);
};

const shortTypeLabel = (txType: string) => {
  const t = String(txType || '').toUpperCase();
  if (t.includes('WITHDRAWAL')) return 'Withdrawal';
  if (t.includes('EARNING')) return 'Incoming';
  if (t.includes('PAYMENT')) return 'Payment';
  if (t.includes('TOPUP')) return 'Topup';
  if (t.includes('REFUND')) return 'Refund';
  return t || 'Transaction';
};

const withdrawalStatusLabel = (status: string) => {
  const s = String(status || '').toUpperCase();
  switch (s) {
    case 'SCHEDULED': return 'Programmé';
    case 'PROCESSING': return 'En cours';
    case 'PAID': return 'Payé';
    case 'FAILED': return 'Échoué';
    case 'REJECTED': return 'Rejeté';
    default: return s;
  }
};

const withdrawalStatusColor = (status: string) => {
  const s = String(status || '').toUpperCase();
  switch (s) {
    case 'SCHEDULED': return theme.colors.muted;
    case 'PROCESSING': return '#FFA500';
    case 'PAID': return theme.colors.primary;
    case 'FAILED':
    case 'REJECTED': return theme.colors.secondary;
    default: return theme.colors.muted;
  }
};

const buildIdempotencyKey = () => {
  return `mob-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export default function GuideWalletScreen() {
  const colors = useThemeColors() as any;
  const isDarkMode = useIsDarkMode();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txPreview, setTxPreview] = useState<Tx[]>([]);

  const [hasCard, setHasCard] = useState(false);
  const [cardLast4, setCardLast4] = useState<string | null>(null);
  const [cardDetailsVisible, setCardDetailsVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Tx | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const [withdrawSheetVisible, setWithdrawSheetVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'success' as 'success' | 'error' | 'warning',
    actionLabel: undefined as string | undefined,
    onAction: undefined as undefined | (() => void),
  });

  const load = async () => {
    try {
      const [meRes, txRes, profile, connectStatusRes] = await Promise.all([
        walletApi.getMe(),
        walletApi.listTransactions({ limit: 5, offset: 0 }),
        authService.getProfile().catch(() => null),
        paymentsApi.connectStatus().catch(() => null),
      ]);

      const w = meRes?.data?.wallet || null;
      setWallet(w);

      const items = Array.isArray(txRes?.data?.items) ? txRes.data.items : [];
      setTxPreview(items);

      const connected = Boolean((connectStatusRes as any)?.data?.connected);
      const last4 = (connectStatusRes as any)?.data?.last4 ? String((connectStatusRes as any).data.last4) : null;
      setHasCard(connected || Boolean((profile as any)?.stripeConnectedAccountId));
      setCardLast4(last4);
    } catch (e: any) {
      setAlertConfig({
        visible: true,
        title: 'Erreur',
        message: typeof e === 'string' ? e : 'Impossible de charger le wallet.',
        type: 'error',
        actionLabel: "D'accord",
        onAction: undefined,
      });
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        await load();
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const headerBalance = useMemo(() => {
    const available = wallet?.availableBalance || 0;
    const pending = wallet?.pendingBalance || 0;
    return {
      availableText: formatMoney(available, wallet?.currency),
      pendingText: formatMoney(pending, wallet?.currency),
    };
  }, [wallet?.availableBalance, wallet?.pendingBalance, wallet?.currency]);

  const openWithdraw = () => {
    if (!hasCard) {
      setAlertConfig({
        visible: true,
        title: 'Carte requise',
        message: 'Vous devez ajouter une carte pour effectuer un retrait.',
        type: 'warning',
        actionLabel: 'Ajouter une carte',
        onAction: () => router.push('/(views)/(screens)/wallet/add-card' as any),
      });
      return;
    }
    const available = wallet?.availableBalance || 0;
    if (available <= 0) {
      setAlertConfig({
        visible: true,
        title: 'Solde insuffisant',
        message: 'Votre solde disponible est de 0 TND.',
        type: 'warning',
        actionLabel: "D'accord",
        onAction: undefined,
      });
      return;
    }
    setWithdrawAmount('');
    setWithdrawSheetVisible(true);
  };

  const confirmWithdraw = async () => {
    const amountTND = Number(String(withdrawAmount || '').replace(',', '.'));
    if (!Number.isFinite(amountTND) || amountTND <= 0) {
      setAlertConfig({
        visible: true,
        title: 'Montant invalide',
        message: 'Veuillez saisir un montant valide.',
        type: 'warning',
        actionLabel: "D'accord",
        onAction: undefined,
      });
      return;
    }

    const amountCents = Math.floor(amountTND * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setAlertConfig({
        visible: true,
        title: 'Montant invalide',
        message: 'Veuillez saisir un montant valide.',
        type: 'warning',
        actionLabel: "D'accord",
        onAction: undefined,
      });
      return;
    }

    const available = wallet?.availableBalance || 0;
    if (amountCents > available) {
      setAlertConfig({
        visible: true,
        title: 'Solde insuffisant',
        message: `Maximum retrait: ${formatMoney(available, wallet?.currency)}`,
        type: 'warning',
        actionLabel: "D'accord",
        onAction: undefined,
      });
      return;
    }

    setAlertConfig({
      visible: true,
      title: 'Confirmer le retrait',
      message: `Voulez-vous retirer ${formatMoney(amountCents, wallet?.currency)} ? Le traitement peut prendre jusqu’à 48h.`,
      type: 'warning',
      actionLabel: 'Confirmer',
      onAction: async () => {
        setWithdrawLoading(true);
        try {
          await walletApi.requestWithdrawal({
            amountCents,
            idempotencyKey: buildIdempotencyKey(),
          });

          setWithdrawSheetVisible(false);
          setAlertConfig({
            visible: true,
            title: 'Demande envoyée',
            message: 'Votre demande de retrait a été envoyée. Traitement sous 48h max.',
            type: 'success',
            actionLabel: "D'accord",
            onAction: undefined,
          });

          await load();
        } catch (e: any) {
          setAlertConfig({
            visible: true,
            title: 'Erreur',
            message: typeof e === 'string' ? e : 'Impossible de demander le retrait.',
            type: 'error',
            actionLabel: "D'accord",
            onAction: undefined,
          });
        } finally {
          setWithdrawLoading(false);
        }
      },
    });
  };

  const getWithdrawalStatusColor = (status: string) => {
    const s = String(status || '').toUpperCase();
    switch (s) {
      case 'SCHEDULED': return colors.textSecondary;
      case 'PROCESSING': return '#FFA500';
      case 'PAID': return colors.primary;
      case 'FAILED':
      case 'REJECTED': return '#EF4444';
      default: return colors.textSecondary;
    }
  };

  const renderTx = ({ item }: { item: Tx }) => {
    const incoming = isIncoming(item, wallet?.id);
    const amountText = formatMoney(item.amount, item.currency);
    const sign = incoming ? '+' : '-';
    const txColor = incoming ? colors.primary : (isDarkMode ? '#FF9800' : theme.colors.secondary);

    return (
      <TouchableOpacity
        style={[ss.txItem, { backgroundColor: colors.surface }]}
        activeOpacity={0.8}
        onPress={() => {
          setSelectedTx(item);
          setDetailsVisible(true);
        }}
      >
        <View style={[ss.txIconWrap, { backgroundColor: incoming ? 'rgba(76, 175, 80, 0.12)' : 'rgba(255, 152, 0, 0.12)' }]}>
          <Ionicons name={incoming ? 'arrow-down' : 'arrow-up'} size={18} color={txColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[ss.txTitle, { color: colors.text }]}>{shortTypeLabel(item.type)}</Text>
          <Text style={[ss.txSub, { color: colors.textSecondary }]}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[ss.txAmount, { color: txColor }]}>
            {sign} {amountText}
          </Text>
          <Text style={[ss.txStatus, { color: item.type?.toUpperCase().includes('WITHDRAWAL') ? getWithdrawalStatusColor(String(item.status)) : colors.textSecondary }]}>
            {item.type?.toUpperCase().includes('WITHDRAWAL') ? withdrawalStatusLabel(String(item.status)) : String(item.status || '').toLowerCase()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[ss.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
    >
      <View style={ss.header}>
        <TouchableOpacity onPress={() => router.back()} style={[ss.backBtn, { backgroundColor: colors.surface }]}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[ss.headerTitle, { color: colors.text }]}>Sabeel Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={ss.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[ss.centerText, { color: colors.textSecondary }]}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={txPreview}
          keyExtractor={(it) => String(it?.id || Math.random())}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={{ padding: 18, paddingBottom: 28 + insets.bottom }}
          ListHeaderComponent={
            <View>
              <View style={[ss.walletCard, { backgroundColor: colors.surface }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={[ss.walletLabel, { color: colors.textSecondary }]}>Solde disponible</Text>
                    <Text style={[ss.walletBalance, { color: colors.text }]}>{headerBalance.availableText}</Text>
                    <Text style={[ss.walletPending, { color: colors.textSecondary }]}>En attente: {headerBalance.pendingText}</Text>
                  </View>
                  <View style={[ss.statusPill, { backgroundColor: hasCard ? 'rgba(76, 175, 80, 0.15)' : (isDarkMode ? '#2E3B56' : theme.colors.primary + '10') }]}>
                    <View style={[ss.dot, { backgroundColor: hasCard ? colors.primary : colors.textSecondary }]} />
                    <Text style={[ss.statusText, { color: colors.text }]}>{hasCard ? 'Card Added' : 'Not Added'}</Text>
                  </View>
                </View>

                <View style={ss.walletActionsRow}>
                  <TouchableOpacity
                    style={[ss.actionBtn, { backgroundColor: colors.primary }]}
                    onPress={async () => {
                      if (hasCard) {
                        setCardDetailsVisible(true);
                        return;
                      }
                      // Navigate directly to Stripe WebView for onboarding
                      try {
                        const res = await paymentsApi.connectOnboardingLink({ ownerType: 'GUIDE' });
                        const url = res?.data?.url ? String(res.data.url) : '';
                        if (url) {
                          router.push('/(views)/(screens)/wallet/stripe-connect-webview?url=' + encodeURIComponent(url) as any);
                        }
                      } catch {}
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="card-outline" size={18} color="#fff" />
                    <Text style={ss.actionBtnText}>{hasCard ? `Card •••• ${cardLast4 || '----'}` : 'Add Card'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[ss.actionBtn, { backgroundColor: isDarkMode ? '#2E3B56' : theme.colors.secondary }]}
                    onPress={openWithdraw}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="cash-outline" size={18} color="#fff" />
                    <Text style={ss.actionBtnText}>Withdraw</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={ss.sectionHeader}>
                <Text style={[ss.sectionTitle, { color: colors.text }]}>Transactions</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(views)/(screens)/wallet/history' as any)}
                  activeOpacity={0.8}
                >
                  <Text style={[ss.sectionAction, { color: colors.primary }]}>See All</Text>
                </TouchableOpacity>
              </View>

              {txPreview.length === 0 ? (
                <View style={[ss.emptyCard, { backgroundColor: colors.surface }]}>
                  <Ionicons name="receipt-outline" size={34} color={colors.textSecondary} />
                  <Text style={[ss.emptyTitle, { color: colors.text }]}>Aucune transaction</Text>
                  <Text style={[ss.emptySub, { color: colors.textSecondary }]}>Vos revenus, retraits et mouvements apparaîtront ici.</Text>
                </View>
              ) : null}
            </View>
          }
          renderItem={renderTx}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TransactionDetailsSheet
        visible={detailsVisible}
        transaction={selectedTx as any}
        onClose={() => setDetailsVisible(false)}
      />

      <Modal
        visible={cardDetailsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCardDetailsVisible(false)}
      >
        <TouchableOpacity style={ss.sheetOverlay} activeOpacity={1} onPress={() => setCardDetailsVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[ss.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 }]}
            onPress={() => {
            }}
          >
            <View style={[ss.sheetHandle, { backgroundColor: isDarkMode ? '#2E3B56' : '#E5E7EB' }]} />
            <TouchableOpacity style={ss.sheetClose} onPress={() => setCardDetailsVisible(false)}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            <Text style={[ss.sheetTitle, { color: colors.text }]}>Card</Text>
            <Text style={[ss.sheetSub, { color: colors.textSecondary }]}>{cardLast4 ? `•••• ${cardLast4}` : '•••• ----'}</Text>

            <TouchableOpacity
              style={[ss.primaryCta, { backgroundColor: colors.primary, marginTop: 6 }]}
              onPress={async () => {
                setCardDetailsVisible(false);
                try {
                  const res = await paymentsApi.connectOnboardingLink({ ownerType: 'GUIDE' });
                  const url = res?.data?.url ? String(res.data.url) : '';
                  if (url) {
                    router.push('/(views)/(screens)/wallet/stripe-connect-webview?url=' + encodeURIComponent(url) as any);
                  }
                } catch {}
              }}
              activeOpacity={0.85}
            >
              <Text style={ss.primaryCtaText}>Add new card</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={withdrawSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWithdrawSheetVisible(false)}
      >
        <TouchableOpacity style={ss.sheetOverlay} activeOpacity={1} onPress={() => setWithdrawSheetVisible(false)}>
          <TouchableOpacity
            activeOpacity={1}
            style={[ss.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 }]}
          >
            <View style={[ss.sheetHandle, { backgroundColor: isDarkMode ? '#2E3B56' : '#E5E7EB' }]} />
            <TouchableOpacity style={ss.sheetClose} onPress={() => setWithdrawSheetVisible(false)}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            <Text style={[ss.sheetTitle, { color: colors.text }]}>Withdraw</Text>
            <Text style={[ss.sheetSub, { color: colors.textSecondary }]}>Entrez le montant à retirer (TND). Traitement sous 48h max.</Text>

            <View style={[ss.inputWrap, { borderColor: colors.border }]}>
              <Text style={[ss.inputPrefix, { color: colors.text }]}>TND</Text>
              <TextInput
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                style={[ss.amountInput, { color: colors.text }]}
              />
            </View>

            <TouchableOpacity
              style={[ss.primaryCta, { backgroundColor: colors.primary, opacity: withdrawLoading ? 0.7 : 1 }]}
              onPress={confirmWithdraw}
              disabled={withdrawLoading}
            >
              {withdrawLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={ss.primaryCtaText}>Confirm Withdrawal</Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        actionLabel={alertConfig.actionLabel}
        onAction={alertConfig.onAction}
        onClose={() => {
          const action = alertConfig.onAction;
          setAlertConfig((p) => ({ ...p, visible: false, onAction: undefined }));
          if (action) action();
        }}
      />
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.secondary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  centerText: {
    color: theme.colors.muted,
    fontWeight: '700',
  },
  walletCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 5 },
    }),
  },
  walletLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.muted,
  },
  walletBalance: {
    fontSize: 26,
    fontWeight: '900',
    color: theme.colors.secondary,
    marginTop: 6,
  },
  walletPending: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.muted,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: theme.colors.primary + '10',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.secondary,
  },
  walletActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.secondary,
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.secondary,
  },
  emptySub: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.muted,
    textAlign: 'center',
  },
  txItem: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  txIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.colors.secondary,
  },
  txSub: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.muted,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '900',
  },
  txStatus: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '900',
    color: theme.colors.muted,
    textTransform: 'capitalize',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetClose: {
    position: 'absolute',
    top: 14,
    right: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.secondary,
    marginBottom: 6,
  },
  sheetSub: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.muted,
    marginBottom: 14,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.divider,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 14,
  },
  inputPrefix: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.secondary,
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.secondary,
  },
  primaryCta: {
    height: 54,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
});
