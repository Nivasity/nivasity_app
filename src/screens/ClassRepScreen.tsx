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
import { Chip, CourseTile, IconButton } from '../components/ui';
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

// Class reps (HOC) export the list of students in their department who paid for a material,
// and see every export their department's class reps made. Same as the web portal's Class rep page.
const ClassRepScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const keyboardHeight = useKeyboardHeight();
  const [tab, setTab] = useState<'materials' | 'exports'>('materials');
  const [materials, setMaterials] = useState<HocMaterial[]>([]);
  const [exports, setExports] = useState<DeptExport[]>([]);
  const [matPage, setMatPage] = useState<HocPage | null>(null);
  const [expPage, setExpPage] = useState<HocPage | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState<HocMaterial | null>(null);
  const [rrr, setRrr] = useState('');
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [m, e] = await Promise.all([hocAPI.getMaterials(1), hocAPI.getExports(1)]);
      setMaterials(m.materials);
      setMatPage(m.pagination);
      setExports(e.exports);
      setExpPage(e.pagination);
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

  // Next page when the list is scrolled to the end
  const loadMore = async () => {
    const pg = tab === 'materials' ? matPage : expPage;
    if (loadingMore || !pg || pg.page >= pg.total_pages) return;
    setLoadingMore(true);
    try {
      if (tab === 'materials') {
        const m = await hocAPI.getMaterials(pg.page + 1);
        setMaterials((prev) => [...prev, ...m.materials.filter((x) => !prev.some((p) => p.id === x.id))]);
        setMatPage(m.pagination);
      } else {
        const e = await hocAPI.getExports(pg.page + 1);
        setExports((prev) => [...prev, ...e.exports.filter((x) => !prev.some((p) => p.id === x.id))]);
        setExpPage(e.pagination);
      }
    } catch (e: any) {
      appMessage.toast({ status: 'failed', message: e?.message || 'Could not load more' });
    } finally {
      setLoadingMore(false);
    }
  };

  const footer = loadingMore ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} /> : null;

  const runExport = async () => {
    if (!exporting) return;
    setBusy(true);
    try {
      const bytes = await hocAPI.exportList(exporting.id, rrr.trim());
      setExporting(null);
      setRrr('');
      await sharePdf(bytes, `manual-export-${exporting.course_code}`, 'Exported list');
      appMessage.toast({ status: 'success', message: 'List exported. Give it to the material granter.' });
      load();
    } catch (e: any) {
      appMessage.toast({ status: 'failed', message: e?.message || 'Could not export the list' });
    } finally {
      setBusy(false);
    }
  };

  const openExport = async (item: DeptExport) => {
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

  const copyLink = async (m: HocMaterial) => {
    await Clipboard.setStringAsync(`${PORTAL}/material/${m.id}`);
    appMessage.toast({ status: 'success', message: 'Share link copied' });
  };

  const card = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderBottomColor: colors.cardLip }];

  const renderMaterial = ({ item: m }: { item: HocMaterial }) => (
    <View style={card}>
      <View style={styles.row}>
        <CourseTile code={m.course_code} size={44} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText numberOfLines={2} style={[styles.title, { color: colors.text }]}>{m.title}</AppText>
          <AppText numberOfLines={1} style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
            {m.course_code} · {naira(m.price)}
            {m.active ? '' : ' · Closed'}
          </AppText>
        </View>
      </View>
      <AppText style={{ color: colors.textMuted, fontSize: 12 }}>
        <AppText style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>{m.sold}</AppText> paid in your department
        {m.sold > 0 ? (
          <>
            {' · '}
            <AppText style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>{m.pending_collection}</AppText> waiting for collection
          </>
        ) : null}
      </AppText>
      <View style={styles.row}>
        {m.pending_collection > 0 ? (
          <Button title="Export list" icon="document-text-outline" size="sm" onPress={() => setExporting(m)} style={{ flex: 1 }} />
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Pressable onPress={() => copyLink(m)} style={[styles.roundBtn, { borderColor: colors.border }]} accessibilityLabel="Copy share link">
          <AppIcon name="link-outline" size={18} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );

  const renderExport = ({ item }: { item: DeptExport }) => {
    const granted = item.status === 'granted';
    return (
      <View style={card}>
        <View style={styles.row}>
          <View style={[styles.statusIcon, { backgroundColor: granted ? colors.successSoft : colors.surfaceAlt }]}>
            <AppIcon name={granted ? 'checkmark-circle' : 'time-outline'} size={20} color={granted ? colors.success : colors.textMuted} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText numberOfLines={1} style={[styles.title, { color: colors.text }]}>{item.course_code}</AppText>
            <AppText numberOfLines={1} style={{ color: colors.textMuted, fontSize: 12 }}>{item.manual_title}</AppText>
          </View>
          <View style={[styles.badge, { backgroundColor: granted ? colors.successSoft : colors.surfaceAlt }]}>
            <AppText style={{ color: granted ? colors.success : colors.textMuted, fontSize: 11, fontWeight: '700' }}>
              {granted ? 'Granted' : 'Pending grant'}
            </AppText>
          </View>
        </View>
        <AppText style={{ color: colors.textMuted, fontSize: 12 }}>
          {item.students_count} students · {naira(item.total_amount)} · code {item.code}
        </AppText>
        <AppText style={{ color: colors.textMuted, fontSize: 12 }}>
          Exported by <AppText style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>{item.is_mine ? 'you' : item.exported_by}</AppText> · {when(item.exported_at)}
        </AppText>
        {granted ? (
          <AppText style={{ color: colors.textMuted, fontSize: 12 }}>
            Granted {when(item.granted_at)}
            {item.granted_by ? ` by ${item.granted_by}` : ''}
          </AppText>
        ) : null}
        <Button title="Open PDF" icon="document-outline" size="sm" variant="outline" loading={downloading === item.id} onPress={() => openExport(item)} />
      </View>
    );
  };

  const refresh = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
      tintColor={colors.accent}
      colors={[colors.accent]}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Back" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <AppText style={[styles.screenTitle, { color: colors.text }]}>Class rep</AppText>
          <AppText style={{ color: colors.textMuted, fontSize: 13 }}>Export paid-student lists for your department</AppText>
        </View>
      </View>
      <View style={styles.tabs}>
        <Chip label="Materials" active={tab === 'materials'} onPress={() => setTab('materials')} />
        <Chip label={`Exports${expPage?.total ? ` (${expPage.total})` : ''}`} active={tab === 'exports'} onPress={() => setTab('exports')} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : tab === 'materials' ? (
        <FlatList
          data={materials}
          keyExtractor={(m) => String(m.id)}
          renderItem={renderMaterial}
          contentContainerStyle={styles.list}
          refreshControl={refresh}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={footer}
          ListEmptyComponent={
            <EmptyState
              icon="book-outline"
              title="Nothing to export right now"
              subtitle="Materials show here when students in your department have paid and are waiting for collection."
            />
          }
        />
      ) : (
        <FlatList
          data={exports}
          keyExtractor={(e) => String(e.id)}
          renderItem={renderExport}
          contentContainerStyle={styles.list}
          refreshControl={refresh}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={footer}
          ListEmptyComponent={
            <EmptyState icon="documents-outline" title="No exports yet" subtitle="Lists exported by any class rep of your department show here, with who exported them." />
          }
        />
      )}

      <Modal visible={!!exporting} transparent animationType="slide" onRequestClose={() => !busy && setExporting(null)}>
        <View style={styles.sheetWrap}>
          <Pressable style={styles.backdrop} onPress={() => !busy && setExporting(null)} accessibilityLabel="Close" />
          <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: keyboardHeight }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <AppText style={[styles.sheetTitle, { color: colors.text }]}>Export {exporting?.course_code} list</AppText>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 4 }}>
              <AppText style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 8 }}>
                The PDF lists the {exporting?.pending_collection} student{exporting?.pending_collection === 1 ? '' : 's'} in your department who paid and haven't
                collected yet. Once the granter marks this list as collected, those students won't appear in the next export.
              </AppText>
              <Input label="RRR number (optional)" value={rrr} onChangeText={setRrr} keyboardType="number-pad" placeholder="e.g. 310007788221" />
              <Button title="Export and share PDF" icon="share-outline" onPress={runExport} loading={busy} />
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
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  card: { borderRadius: 24, borderWidth: 1, borderBottomWidth: 3, padding: 14, gap: 10, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  roundBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...(StyleSheet.absoluteFill as object), backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: 20, paddingTop: 10, paddingBottom: 32, gap: 12, maxHeight: '90%' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
});

export default ClassRepScreen;
