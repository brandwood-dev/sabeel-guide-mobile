import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { walletApi } from '@/services/api';
import { TransactionDetailsSheet } from '@/components/modals/TransactionDetailsSheet';

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
  const cur = String(currency || 'MAD').toUpperCase();
  return `${(amount / 100).toFixed(2)} ${cur}`;
};

const formatDate = (value?: string) => {
  if (!value) return '';
  const ms = Date.parse(String(value));
  if (!Number.isFinite(ms)) return String(value);
  return new Date(ms).toLocaleDateString();
};

const isIncoming = (txType: string) => {
  const t = String(txType || '').toUpperCase();
  return t === 'EARNING' || t === 'TOPUP' || t === 'REFUND';
};

const filterLabel = (key: 'all' | 'incoming' | 'withdrawal') => {
  if (key === 'incoming') return 'Incoming';
  if (key === 'withdrawal') return 'Withdrawal';
  return 'All';
};

export default function WalletHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<'all' | 'incoming' | 'withdrawal'>('all');
  const [items, setItems] = useState<Tx[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedTx, setSelectedTx] = useState<Tx | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const limit = 20;

  const visibleItems = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'incoming') return items.filter((t) => isIncoming(t.type));
    return items.filter((t) => String(t.type || '').toUpperCase().includes('WITHDRAWAL'));
  }, [filter, items]);

  const loadPage = async (offset: number) => {
    const res = await walletApi.listTransactions({ limit, offset });
    const nextItems = Array.isArray(res?.data?.items) ? res.data.items : [];
    const nextTotal = Number(res?.data?.total || 0);
    return { nextItems, nextTotal };
  };

  const loadInitial = async () => {
    setLoading(true);
    try {
      const { nextItems, nextTotal } = await loadPage(0);
      setItems(nextItems);
      setTotal(nextTotal);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const { nextItems, nextTotal } = await loadPage(0);
      setItems(nextItems);
      setTotal(nextTotal);
    } finally {
      setRefreshing(false);
    }
  };

  const onEndReached = async () => {
    if (loadingMore) return;
    if (items.length >= total) return;
    setLoadingMore(true);
    try {
      const { nextItems } = await loadPage(items.length);
      setItems((prev) => [...prev, ...nextItems]);
    } finally {
      setLoadingMore(false);
    }
  };

  const renderItem = ({ item }: { item: Tx }) => {
    const incoming = isIncoming(item.type);
    return (
      <TouchableOpacity
        style={ss.txItem}
        activeOpacity={0.8}
        onPress={() => {
          setSelectedTx(item);
          setDetailsVisible(true);
        }}
      >
        <View style={[ss.txIconWrap, { backgroundColor: incoming ? 'rgba(44,95,45,0.10)' : 'rgba(217,171,131,0.14)' }]}>
          <Ionicons name={incoming ? 'arrow-down' : 'arrow-up'} size={18} color={incoming ? theme.colors.primary : theme.colors.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ss.txTitle}>{String(item.type || '').replace(/_/g, ' ')}</Text>
          <Text style={ss.txSub}>{formatDate(item.createdAt)} · {String(item.status || '').toLowerCase()}</Text>
        </View>
        <Text style={[ss.txAmount, { color: incoming ? theme.colors.primary : theme.colors.secondary }]}>
          {incoming ? '+' : '-'} {formatMoney(item.amount, item.currency)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[ss.container, { paddingTop: insets.top }]}
    >
      <View style={ss.header}>
        <TouchableOpacity onPress={() => router.back()} style={ss.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.secondary} />
        </TouchableOpacity>
        <Text style={ss.headerTitle}>Transaction History</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={ss.filtersRow}>
        {(['all', 'incoming', 'withdrawal'] as const).map((k) => (
          <TouchableOpacity
            key={k}
            style={[ss.filterPill, filter === k && ss.filterPillActive]}
            onPress={() => setFilter(k)}
            activeOpacity={0.85}
          >
            <Text style={[ss.filterText, filter === k && ss.filterTextActive]}>{filterLabel(k)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={ss.center}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={ss.centerText}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={(it) => String(it?.id || Math.random())}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 18, paddingBottom: 28 + insets.bottom }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReachedThreshold={0.5}
          onEndReached={onEndReached}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 14 }}>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <TransactionDetailsSheet
        visible={detailsVisible}
        transaction={selectedTx as any}
        onClose={() => setDetailsVisible(false)}
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
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 6,
  },
  filterPill: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: theme.colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.colors.secondary,
  },
  filterTextActive: {
    color: '#fff',
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
  txItem: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
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
    textTransform: 'capitalize',
  },
  txSub: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.muted,
  },
  txAmount: {
    fontSize: 12,
    fontWeight: '900',
  },
});
