import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import AppText from './AppText';
import Button from './Button';
import EmptyState from './EmptyState';
import { Card, CourseTile } from './ui';
import { useTheme } from '../contexts/ThemeContext';
import { useAppMessage } from '../contexts/AppMessageContext';
import { BulkClaim, RejectedClaim, claimsAPI } from '../services/api';

const shortDate = (v?: string) => {
  if (!v) return '';
  const d = new Date(v.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

// Orders › Paid for me: materials a class rep (or the Nivasity team) paid for this student.
// Approve adds them to My purchases; Not mine asks once more; a rejection can be undone for 14 days.
const PaidForMeList: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const [pending, setPending] = useState<BulkClaim[] | null>(null);
  const [rejected, setRejected] = useState<RejectedClaim[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [askReject, setAskReject] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, r] = await Promise.all([claimsAPI.getPending(20).catch(() => []), claimsAPI.getRejected().catch(() => [])]);
    setPending(p);
    setRejected(r);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const key = (c: { source: string; id: number }) => `${c.source}-${c.id}`;

  const resolve = async (c: BulkClaim, action: 'confirm' | 'reject') => {
    setBusy(`${key(c)}-${action}`);
    try {
      const msg = await claimsAPI.resolve(c, action);
      appMessage.toast({ status: 'success', message: action === 'confirm' ? `${c.course_code} is now in My purchases` : msg || 'Done' });
      setAskReject(null);
      await load();
      onChanged?.();
    } catch (e: any) {
      appMessage.toast({ status: 'failed', message: e?.message || 'Could not update this payment' });
    } finally {
      setBusy(null);
    }
  };

  const restore = async (c: RejectedClaim) => {
    setBusy(`${key(c)}-restore`);
    try {
      await claimsAPI.restore(c);
      appMessage.toast({ status: 'success', message: `${c.course_code} is back. Approve it to add it to your purchases.` });
      await load();
      onChanged?.();
    } catch (e: any) {
      appMessage.toast({ status: 'failed', message: e?.message || 'Could not bring this payment back' });
    } finally {
      setBusy(null);
    }
  };

  if (pending === null) return <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />;

  if (!pending.length && !rejected.length) {
    return (
      <View style={{ paddingHorizontal: 16 }}>
        <EmptyState
          icon="gift-outline"
          title="Nothing paid for you yet"
          subtitle="When your class rep pays for a material for you, it shows here to approve. Not seeing it? Check that your matric number in Profile matches the one they used, or ask Bella."
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.body}>
      {pending.length > 0 ? (
        <AppText style={{ color: colors.textMuted, fontSize: 13 }}>
          Approve the ones you paid your class rep for. They'll move to My purchases with a receipt.
        </AppText>
      ) : null}
      {pending.map((c) => {
        const k = key(c);
        const confirming = askReject === k;
        return (
          <Card key={k} style={{ gap: 12 }}>
            <View style={styles.row}>
              <CourseTile code={c.course_code} size={44} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText numberOfLines={1} style={{ color: colors.text, fontWeight: '800' }}>{c.title || c.course_code}</AppText>
                <AppText numberOfLines={1} style={{ color: colors.textMuted, fontSize: 12 }}>
                  {c.course_code} · paid by {c.payer_name || 'a course mate'}
                  {c.paid_at ? ` · ${shortDate(c.paid_at)}` : ''}
                </AppText>
              </View>
            </View>
            {confirming ? (
              <AppText style={{ color: colors.text, fontSize: 13 }}>Sure {c.course_code} isn't yours? You can undo it here for 14 days.</AppText>
            ) : null}
            <View style={styles.row}>
              {confirming ? (
                <>
                  <Button title="Go back" variant="ghost" size="sm" style={{ flex: 1 }} disabled={!!busy} onPress={() => setAskReject(null)} />
                  <Button title="Yes, not mine" variant="outline" size="sm" style={{ flex: 1 }} loading={busy === `${k}-reject`} disabled={!!busy} onPress={() => resolve(c, 'reject')} />
                </>
              ) : (
                <>
                  <Button title="Not mine" variant="outline" size="sm" style={{ flex: 1 }} disabled={!!busy} onPress={() => setAskReject(k)} />
                  <Button title="Approve" size="sm" style={{ flex: 1 }} loading={busy === `${k}-confirm`} disabled={!!busy} onPress={() => resolve(c, 'confirm')} />
                </>
              )}
            </View>
          </Card>
        );
      })}

      {rejected.length > 0 ? (
        <AppText style={{ color: colors.textMuted, fontSize: 13, fontWeight: '800', marginTop: 8 }}>You said these aren't yours</AppText>
      ) : null}
      {rejected.map((c) => {
        const k = key(c);
        return (
          <Card key={k} style={[styles.row, { opacity: 0.95 }]}>
            <CourseTile code={c.course_code} size={44} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText numberOfLines={1} style={{ color: colors.text, fontWeight: '700' }}>{c.title || c.course_code}</AppText>
              <AppText numberOfLines={1} style={{ color: colors.textMuted, fontSize: 12 }}>
                {c.course_code} · rejected {shortDate(c.rejected_at)}
              </AppText>
            </View>
            <Button title="Undo" variant="outline" size="sm" loading={busy === `${k}-restore`} disabled={!!busy} onPress={() => restore(c)} />
          </Card>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});

export default PaidForMeList;
