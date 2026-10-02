import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import AppText from './AppText';
import AppIcon from './AppIcon';
import EmptyState from './EmptyState';
import { CourseTile } from './ui';
import { useTheme } from '../contexts/ThemeContext';
import { useAppMessage } from '../contexts/AppMessageContext';
import { BulkPaymentRecord, receiptsAPI } from '../services/api';
import { downloadAndShareReceipt } from '../utils/receiptPdf';

const when = (v: string) => {
  const d = new Date(String(v).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

// Orders > Bulk payments: what the student paid for course mates. Tapping one downloads the
// official receipt PDF listing every student paid for (same as the website).
export default function BulkPaymentsList({ onPayForMates }: { onPayForMates?: () => void }) {
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const [payments, setPayments] = useState<BulkPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyRef, setBusyRef] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPayments(await receiptsAPI.bulkHistory());
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const download = async (p: BulkPaymentRecord) => {
    if (busyRef) return;
    setBusyRef(p.ref_id);
    try {
      await downloadAndShareReceipt(p.ref_id);
    } catch (e: any) {
      appMessage.alert({ title: 'Could not download receipt', message: e?.message || 'Please try again.' });
    } finally {
      setBusyRef(null);
    }
  };

  if (loading) return <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />;

  return (
    <FlatList
      data={payments}
      keyExtractor={(p) => String(p.id)}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
      ListEmptyComponent={
        <EmptyState
          icon="people-outline"
          title="No bulk payments yet"
          subtitle="When you pay for course mates' copies, the receipts show up here."
          actionLabel={onPayForMates ? 'Pay for course mates' : undefined}
          onAction={onPayForMates}
        />
      }
      renderItem={({ item: p }) => (
        <Pressable
          onPress={() => download(p)}
          accessibilityRole="button"
          accessibilityLabel={`Download receipt for bulk payment ${p.course_code}`}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderColor: colors.border, borderBottomColor: colors.cardLip },
          ]}
        >
          <CourseTile code={p.course_code} size={46} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText numberOfLines={2} style={[styles.title, { color: colors.text }]}>
              {p.title}
            </AppText>
            <AppText numberOfLines={1} style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
              {p.course_code} · {p.student_count} student{p.student_count === 1 ? '' : 's'} · {when(p.paid_at)}
            </AppText>
            <AppText style={[styles.amount, { color: colors.text }]}>₦{Number(p.total_amount || 0).toLocaleString()}</AppText>
          </View>
          <View style={[styles.dl, { backgroundColor: colors.accentSoft }]}>
            {busyRef === p.ref_id ? <ActivityIndicator color={colors.accent} /> : <AppIcon name="download-outline" size={18} color={colors.accent} />}
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 24, borderWidth: 1, borderBottomWidth: 3, marginBottom: 10 },
  title: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  amount: { fontSize: 15, fontWeight: '800', marginTop: 6 },
  dl: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
