import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import AppText from '../components/AppText';
import AppIcon from '../components/AppIcon';
import Button from '../components/Button';
import Input from '../components/Input';
import EmptyState from '../components/EmptyState';
import { CourseTile, IconButton } from '../components/ui';
import { useTheme } from '../contexts/ThemeContext';
import { useAppMessage } from '../contexts/AppMessageContext';
import { DeptExport, HocMaterial, HocPage, hocAPI } from '../services/api';
import { sharePdf } from '../utils/sharePdf';

const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;
const when = (dt?: string | null) =>
  dt
    ? new Date(dt.replace(' ', 'T')).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';
const PORTAL = 'https://funaab.nivasity.com';

// Class reps (HOC): one list of their department's materials that have students waiting for
// collection or were exported before. Tap a material to export its list and see its exports
// (by any class rep of the department). Same flow as the web portal's Class rep page.
const ClassRepScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const keyboardHeight = useKeyboardHeight();
  const [materials, setMaterials] = useState<HocMaterial[]>([]);
  const [page, setPage] = useState<HocPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Material panel
  const [open, setOpen] = useState<HocMaterial | null>(null);
  const [exports, setExports] = useState<DeptExport[]>([]);
  const [exportsLoading, setExportsLoading] = useState(false);
  const [waiting, setWaiting] = useState(0);
  const [rrr, setRrr] = useState('');
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const m = await hocAPI.getMaterials(1);
      setMaterials(m.materials);
      setPage(m.pagination);
    } catch (e: any) {
      appMessage.toast({ status: 'failed', message: e?.message || 'Could not load your class rep page' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appMessage]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    if (loadingMore || !page || page.page >= page.total_pages) return;
    setLoadingMore(true);
    try {
      const m = await hocAPI.getMaterials(page.page + 1);
      setMaterials((prev) => [...prev, ...m.materials.filter((x) => !prev.some((p) => p.id === x.id))]);
      setPage(m.pagination);
    } catch (e: any) {
      appMessage.toast({ status: 'failed', message: e?.message || 'Could not load more' });
    } finally {
      setLoadingMore(false);
    }
  };

  const loadExports = async (m: HocMaterial) => {
    setExportsLoading(true);
    try {
      const e = await hocAPI.getExports(1, m.id);
      setExports(e.exports);
    } catch (e: any) {
      appMessage.toast({ status: 'failed', message: e?.message || 'Could not load exports' });
    } finally {
      setExportsLoading(false);
    }
  };

  const openMaterial = (m: HocMaterial) => {
    setOpen(m);
    setWaiting(m.pending_collection);
    setRrr('');
    setExports([]);
    loadExports(m);
  };

  const runExport = async () => {
    if (!open) return;
    setBusy(true);
    try {
      const bytes = await hocAPI.exportList(open.id, rrr.trim());
      setRrr('');
      setWaiting(0);
      loadExports(open);
      load();
      await sharePdf(bytes, `manual-export-${open.course_code}`, 'Exported list');
      appMessage.toast({ status: 'success', message: 'List exported. Give it to the material granter.' });
    } catch (e: any) {
      appMessage.toast({ status: 'failed', message: e?.message || 'Could not export the list' });
    } finally {
      setBusy(false);
    }
  };

  const openPdf = async (item: DeptExport) => {
    setDownloading(item.id);
    try {
      const bytes = await hocAPI.exportPdf(item.id);
      await sharePdf(bytes, `${item.status === 'granted' ? 'granted-export' : 'export'}-${item.code}`, 'Exported list');
    } catch (e: any) {
      appMessage.toast({ status: 'failed', message: e?.message || 'Could not download the export' });
    } finally {
      setDownloading(null);
    }
  };

  const copyLink = async () => {
    if (!open) return;
    await Clipboard.setStringAsync(`${PORTAL}/material/${open.id}`);
    appMessage.toast({ status: 'success', message: 'Share link copied' });
  };

  const pill = (bg: string, fg: string, label: string) => (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <AppText style={{ color: fg, fontSize: 11, fontWeight: '700' }}>{label}</AppText>
    </View>
  );

  const renderMaterial = ({ item: m }: { item: HocMaterial }) => (
    <Pressable
      onPress={() => openMaterial(m)}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderBottomColor: colors.cardLip }]}
      accessibilityRole="button"
      accessibilityLabel={`${m.course_code}, ${m.pending_collection} waiting`}
    >
      <CourseTile code={m.course_code} size={44} />
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <View>
          <AppText numberOfLines={1} style={[styles.title, { color: colors.text }]}>{m.course_code}</AppText>
          <AppText numberOfLines={1} style={{ color: colors.textMuted, fontSize: 12 }}>{m.title}</AppText>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {m.pending_collection > 0
            ? pill(colors.accent, colors.onAccent, `${m.pending_collection} waiting to export`)
            : pill(colors.surfaceAlt, colors.textMuted, 'Nothing waiting')}
          {m.exports_count > 0 ? pill(colors.surfaceAlt, colors.text, `${m.exports_count} export${m.exports_count === 1 ? '' : 's'}`) : null}
        </View>
      </View>
      <AppIcon name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Back" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <AppText style={[styles.screenTitle, { color: colors.text }]}>Class rep</AppText>
          <AppText style={{ color: colors.textMuted, fontSize: 13 }}>Tap a material to export its list or see past exports</AppText>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={materials}
          keyExtractor={(m) => String(m.id)}
          renderItem={renderMaterial}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} /> : null}
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
              icon="book-outline"
              title="Nothing here yet"
              subtitle="Materials show here when students in your department have paid for them, or after a class rep exports a list."
            />
          }
        />
      )}

      <Modal visible={!!open} transparent animationType="slide" onRequestClose={() => !busy && setOpen(null)}>
        <View style={styles.sheetWrap}>
          <Pressable style={styles.backdrop} onPress={() => !busy && setOpen(null)} accessibilityLabel="Close" />
          <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: keyboardHeight }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <AppText style={[styles.sheetTitle, { color: colors.text }]}>{open?.course_code}</AppText>
            <AppText style={{ color: colors.textMuted, fontSize: 13 }}>
              {open?.title} · {naira(open?.price || 0)} · {open?.sold} paid in your department
            </AppText>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10, paddingTop: 4 }}>
              <View style={[styles.box, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                {waiting > 0 ? (
                  <>
                    <AppText style={{ color: colors.text, fontSize: 13, lineHeight: 19 }}>
                      <AppText style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>
                        {waiting} student{waiting === 1 ? '' : 's'}
                      </AppText>{' '}
                      paid and {waiting === 1 ? 'is' : 'are'} waiting for collection. Export the list and give it to the material granter.
                    </AppText>
                    <Input label="RRR number (optional)" value={rrr} onChangeText={setRrr} keyboardType="number-pad" placeholder="e.g. 310007788221" />
                    <Button title="Export list (PDF)" icon="share-outline" onPress={runExport} loading={busy} />
                  </>
                ) : (
                  <AppText style={{ color: colors.textMuted, fontSize: 13 }}>Nobody is waiting for collection right now. Past exports are below.</AppText>
                )}
              </View>

              <AppText style={[styles.label, { color: colors.textMuted }]}>EXPORTS</AppText>
              {exportsLoading ? (
                <ActivityIndicator color={colors.accent} />
              ) : exports.length === 0 ? (
                <AppText style={{ color: colors.textMuted, fontSize: 13 }}>No exports yet for this material.</AppText>
              ) : (
                exports.map((item) => {
                  const granted = item.status === 'granted';
                  return (
                    <View key={item.id} style={[styles.exportRow, { borderColor: colors.border }]}>
                      <View style={[styles.statusIcon, { backgroundColor: granted ? colors.successSoft : colors.surfaceAlt }]}>
                        <AppIcon name={granted ? 'checkmark-circle' : 'time-outline'} size={18} color={granted ? colors.success : colors.textMuted} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <AppText style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
                          {item.students_count} student{item.students_count === 1 ? '' : 's'} · {granted ? 'Granted' : 'Pending grant'}
                        </AppText>
                        <AppText style={{ color: colors.textMuted, fontSize: 12 }}>
                          By {item.is_mine ? 'you' : item.exported_by} · {when(item.exported_at)}
                        </AppText>
                        {granted ? (
                          <AppText style={{ color: colors.textMuted, fontSize: 12 }}>
                            Granted {when(item.granted_at)}
                            {item.granted_by ? ` by ${item.granted_by}` : ''}
                          </AppText>
                        ) : null}
                      </View>
                      <Button title="PDF" size="sm" variant="outline" loading={downloading === item.id} onPress={() => openPdf(item)} />
                    </View>
                  );
                })
              )}

              <Button title="Copy share link" icon="link-outline" variant="ghost" onPress={copyLink} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  screenTitle: { fontSize: 22, fontWeight: '800' },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 24, borderWidth: 1, borderBottomWidth: 3, padding: 14, marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '800' },
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  box: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginTop: 4 },
  exportRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, padding: 10 },
  statusIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...(StyleSheet.absoluteFill as object), backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: 20, paddingTop: 10, paddingBottom: 32, gap: 6, maxHeight: '90%' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 6 },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
});

export default ClassRepScreen;
