import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../components/AppText';
import AppIcon from '../components/AppIcon';
import Button from '../components/Button';
import Input from '../components/Input';
import EmptyState from '../components/EmptyState';
import { Chip, CourseTile, IconButton } from '../components/ui';
import { useTheme } from '../contexts/ThemeContext';
import { useAppMessage } from '../contexts/AppMessageContext';
import { MaterialRequest, MaterialRequestScope, materialRequestsAPI } from '../services/api';

type Props = { navigation: any };

const SCOPES: { value: MaterialRequestScope; label: string }[] = [
  { value: 'my_department', label: 'My department' },
  { value: 'faculty', label: 'My faculty' },
  { value: 'school', label: 'Whole school' },
];

const upvoted = (r: MaterialRequest) => r.viewer_has_upvoted === true || r.viewer_has_upvoted === 1 || r.viewer_has_upvoted === '1';

// Request a material that is not in the store yet. Course mates upvote it; once enough of the
// expected buyers ask, the request is passed on (same rules as the website).
const MaterialRequestsScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [voting, setVoting] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<MaterialRequestScope>('my_department');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await materialRequestsAPI.list();
      setRequests(data.requests);
    } catch (e: any) {
      appMessage.toast({ status: 'failed', message: e?.message || 'Could not load requests' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appMessage]);

  useEffect(() => {
    load();
  }, [load]);

  const vote = async (r: MaterialRequest) => {
    setVoting(r.id);
    try {
      const message = await materialRequestsAPI.upvote(r.id);
      appMessage.toast({ status: 'success', message: message || 'Added your vote' });
      await load();
    } catch (e: any) {
      appMessage.toast({ status: 'failed', message: e?.message || 'Could not add your vote' });
    } finally {
      setVoting(null);
    }
  };

  const share = (r: MaterialRequest) => {
    Share.share({
      message: `I've asked for ${r.material_code} (${r.material_title}) on Nivasity. Open the Nivasity app, go to Material requests and tap "I need this too" so it gets added faster.`,
    }).catch(() => undefined);
  };

  const submit = async () => {
    if (!code.trim() || !title.trim()) return;
    setSending(true);
    setError(null);
    try {
      const { message, result } = await materialRequestsAPI.create({
        material_code: code.trim(),
        material_title: title.trim(),
        scope,
      });
      if (result?.status === 'material_exists') {
        setOpen(false);
        appMessage.alert({
          title: 'Already in the store',
          message: message || 'This material is already on sale. Check the store.',
          actions: [{ text: 'Open store', onPress: () => navigation.navigate('StudentMain', { screen: 'Store' }) }, { text: 'OK' }],
        });
        return;
      }
      appMessage.toast({ status: 'success', message: message || 'Request sent' });
      setOpen(false);
      setCode('');
      setTitle('');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not send your request');
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item: r }: { item: MaterialRequest }) => {
    const pct = Math.max(0, Math.min(100, Number(r.progress_percent) || 0));
    const mine = upvoted(r);
    const statusLabel = r.threshold_met || r.status === 'under_review' ? 'Passed on' : r.status === 'resolved' ? 'Added' : null;
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderBottomColor: colors.cardLip }]}>
        <View style={styles.cardTop}>
          <CourseTile code={r.material_code} size={44} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText numberOfLines={2} style={[styles.title, { color: colors.text }]}>
              {r.material_title}
            </AppText>
            <AppText numberOfLines={1} style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
              {[r.material_code, r.target_department_name || r.target_faculty_name].filter(Boolean).join(' · ')}
            </AppText>
          </View>
          {statusLabel ? (
            <View style={[styles.badge, { backgroundColor: colors.successSoft }]}>
              <AppText style={{ color: colors.success, fontSize: 11, fontWeight: '700' }}>{statusLabel}</AppText>
            </View>
          ) : null}
        </View>

        <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: r.threshold_met ? colors.success : colors.accent }]} />
        </View>
        <AppText style={{ color: colors.textMuted, fontSize: 12 }}>
          {r.upvote_count} of {r.expected_buyers_count || '—'} students · {pct}% (needs {r.threshold_percent}%)
        </AppText>

        <View style={styles.actions}>
          <Button
            title={mine ? 'You asked for this' : 'I need this too'}
            icon={mine ? 'checkmark' : 'arrow-up'}
            size="sm"
            variant={mine ? 'outline' : 'primary'}
            disabled={mine}
            loading={voting === r.id}
            onPress={() => vote(r)}
            style={{ flex: 1 }}
          />
          <Pressable onPress={() => share(r)} style={[styles.shareBtn, { borderColor: colors.border }]} accessibilityLabel="Share request">
            <AppIcon name="share-social-outline" size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Back" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <AppText style={[styles.screenTitle, { color: colors.text }]}>Material requests</AppText>
          <AppText style={{ color: colors.textMuted, fontSize: 13 }}>Ask for materials that are not in the store</AppText>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(r) => String(r.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
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
              icon="megaphone-outline"
              title="No requests yet"
              subtitle="Can't find a material? Request it and share it so classmates can upvote."
              actionLabel="New request"
              onAction={() => setOpen(true)}
            />
          }
        />
      )}

      <View style={styles.fabWrap}>
        <Button title="New request" icon="add" onPress={() => setOpen(true)} />
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => !sending && setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
          <Pressable style={styles.backdrop} onPress={() => !sending && setOpen(false)} accessibilityLabel="Close" />
          <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <AppText style={[styles.sheetTitle, { color: colors.text }]}>New request</AppText>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 4 }}>
              {error ? (
                <View style={[styles.error, { backgroundColor: colors.dangerSoft }]}>
                  <AppText style={{ color: colors.danger, fontWeight: '600', fontSize: 13 }}>{error}</AppText>
                </View>
              ) : null}
              <Input label="Course code" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" placeholder="e.g. CSC 305" />
              <Input label="Material title" value={title} onChangeText={setTitle} placeholder="e.g. Operating Systems" />
              <AppText style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Who needs it?</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {SCOPES.map((s) => (
                  <Chip key={s.value} label={s.label} active={scope === s.value} onPress={() => setScope(s.value)} />
                ))}
              </View>
              <Button title="Send request" onPress={submit} loading={sending} disabled={!code.trim() || !title.trim()} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  screenTitle: { fontSize: 22, fontWeight: '800' },
  card: { borderRadius: 24, borderWidth: 1, borderBottomWidth: 3, padding: 14, gap: 10, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  shareBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  fabWrap: { position: 'absolute', left: 16, right: 16, bottom: 24 },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...(StyleSheet.absoluteFill as object), backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: 20, paddingTop: 10, paddingBottom: 32, gap: 12, maxHeight: '90%' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  error: { borderRadius: 14, padding: 12, marginBottom: 8 },
});

export default MaterialRequestsScreen;
