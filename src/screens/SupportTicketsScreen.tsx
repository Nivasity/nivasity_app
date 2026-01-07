import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { TextInput as PaperTextInput } from 'react-native-paper';
import AppIcon from '../components/AppIcon';
import Button from '../components/Button';
import Input from '../components/Input';
import OptionPickerDialog from '../components/OptionPickerDialog';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useTheme } from '../contexts/ThemeContext';
import { SupportTicketListItem, supportAPI } from '../services/api';

type SupportTicketsScreenProps = {
  navigation: any;
};

const toMimeType = (uri: string, mimeType?: string | null) => {
  const trimmed = (mimeType || '').trim();
  if (trimmed) return trimmed;
  const clean = (uri || '').split('?')[0].split('#')[0];
  const ext = clean.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'pdf') return 'application/pdf';
  return 'application/octet-stream';
};

const SUPPORT_CATEGORIES = [
  'Payments or Transactions',
  'Account or Access Issues',
  'Materials or Events',
  'Department Requests',
  'Technical and Other Issues',
] as const;

const formatRelative = (value?: string) => {
  const raw = (value || '').trim();
  if (!raw) return '';
  const t = new Date(raw.replace(' ', 'T')).getTime();
  if (Number.isNaN(t)) return '';
  const diffMs = Date.now() - t;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 52) return `${weeks}w ago`;
  const years = Math.floor(weeks / 52);
  return `${years}y ago`;
};

const SupportTicketsScreen: React.FC<SupportTicketsScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const appMessage = useAppMessage();

  const [tickets, setTickets] = useState<SupportTicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [composeVisible, setComposeVisible] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<(typeof SUPPORT_CATEGORIES)[number]>('Technical and Other Issues');
  const [attachment, setAttachment] = useState<{ uri: string; name: string; type: string } | null>(null);

  const loadTickets = useCallback(async () => {
    try {
      const data = await supportAPI.listTickets({ page: 1, limit: 50 });
      setTickets(data.tickets || []);
    } catch (e: any) {
      setTickets([]);
      appMessage.toast({ status: 'failed', message: e?.message || 'Failed to load tickets.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appMessage]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTickets();
  };

  const openTicket = (ticket: SupportTicketListItem) => {
    navigation.navigate('SupportChat', { ticketId: ticket.id, ticketCode: ticket.code, subject: ticket.subject });
  };

  const resetComposer = () => {
    setSubject('');
    setMessage('');
    setCategory('Technical and Other Issues');
    setAttachment(null);
    setCategoryOpen(false);
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      appMessage.toast({ status: 'failed', message: 'Allow photo access to attach an image.' });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (res.canceled || !res.assets?.[0]?.uri) return;
    const asset = res.assets[0];
    const uri = asset.uri;
    const name = (asset.fileName || `attachment-${Date.now()}.jpg`).trim();
    const type = toMimeType(uri, (asset as any).mimeType);
    setAttachment({ uri, name, type });
  };

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['application/pdf', 'image/*'],
    });
    if (res.canceled) return;
    const uri = res.assets?.[0]?.uri;
    if (!uri) return;
    const name = (res.assets?.[0]?.name || `attachment-${Date.now()}`).trim();
    const type = toMimeType(uri, res.assets?.[0]?.mimeType);
    setAttachment({ uri, name, type });
  };

  const submitTicket = async () => {
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();
    if (!cleanSubject || !cleanMessage) {
      appMessage.toast({ status: 'failed', message: 'Please enter a subject and message.' });
      return;
    }

    setCreating(true);
    try {
      const created = await supportAPI.createTicket({
        subject: cleanSubject,
        message: cleanMessage,
        category: category.trim() || undefined,
        attachment,
      });
      appMessage.toast({ status: 'success', message: 'Ticket created.' });
      setComposeVisible(false);
      resetComposer();
      await loadTickets();
      if (created?.id) openTicket(created);
    } catch (e: any) {
      appMessage.toast({ status: 'failed', message: e?.message || 'Failed to create ticket.' });
    } finally {
      setCreating(false);
    }
  };

  const renderItem = ({ item }: { item: SupportTicketListItem }) => {
    const title = (item.latest_message || item.subject || 'Support').trim();
    const relative = formatRelative(item.updated_at || item.created_at);
    const sub = `${item.category || 'Support'}${relative ? ` • ${relative}` : ''}`;
    const avatarLetter = (item.category || 'S').trim().charAt(0).toUpperCase();
    return (
      <TouchableOpacity
        onPress={() => openTicket(item)}
        style={[styles.ticketRow, { borderBottomColor: colors.border }]}
        activeOpacity={0.86}
        accessibilityRole="button"
        accessibilityLabel={`Open ticket ${item.code}`}
      >
        <View style={[styles.avatar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={[styles.avatarText, { color: colors.secondary }]}>{avatarLetter}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.ticketTitle, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.ticketSub, { color: colors.textMuted }]} numberOfLines={1}>
            {sub}
          </Text>
        </View>
        <AppIcon name="chevron-forward" size={16} color={colors.text} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.iconButton]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <AppIcon name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            Messages
          </Text>
        </View>

        <View style={[styles.iconButton, { opacity: 0 }]} />
      </View>

      <FlatList
        data={tickets}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: 90 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No support tickets yet</Text>
              <View style={{ height: 12 }} />
              <Button title="Create a ticket" onPress={() => setComposeVisible(true)} variant="outline" />
            </View>
          )
        }
      />

      <TouchableOpacity
        onPress={() => {
          resetComposer();
          setComposeVisible(true);
        }}
        style={[
          styles.fab,
          {
            backgroundColor: colors.accent,
            borderColor: colors.border,
            bottom: 18 + insets.bottom,
          },
        ]}
        activeOpacity={0.86}
        accessibilityRole="button"
        accessibilityLabel="Create new ticket"
      >
        <AppIcon name="create-outline" size={22} color={colors.onAccent} />
      </TouchableOpacity>

      <Modal visible={composeVisible} transparent animationType="slide" onRequestClose={() => setComposeVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setComposeVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Close new ticket"
          >
            <BlurView intensity={28} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.18)' },
              ]}
            />
          </Pressable>

          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: 14 + insets.bottom },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <Text style={[styles.sheetTitle, { color: colors.text }]}>New ticket</Text>
            </View>

            <Input label="Subject" value={subject} onChangeText={setSubject} placeholder="What do you need help with?" />
            <TouchableOpacity
              onPress={() => setCategoryOpen(true)}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="Select support category"
            >
              <View pointerEvents="none">
                <Input
                  label="Category"
                  value={category}
                  editable={false}
                  right={<PaperTextInput.Icon icon="chevron-down" color={colors.textMuted} />}
                />
              </View>
            </TouchableOpacity>
            <Input
              label="Message"
              value={message}
              onChangeText={setMessage}
              placeholder="Describe the issue..."
              multiline
              style={{ minHeight: 120 }}
            />

            <View style={styles.attachRow}>
              <TouchableOpacity
                onPress={pickPhoto}
                style={[styles.attachButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Attach photo"
              >
                <AppIcon name="image-outline" size={18} color={colors.textMuted} />
                <Text style={[styles.attachText, { color: colors.text }]}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={pickFile}
                style={[styles.attachButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Attach file"
              >
                <AppIcon name="document-attach-outline" size={18} color={colors.textMuted} />
                <Text style={[styles.attachText, { color: colors.text }]}>File</Text>
              </TouchableOpacity>
              {attachment ? (
                <TouchableOpacity
                  onPress={() => setAttachment(null)}
                  style={[styles.attachmentPill, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Remove attachment"
                >
                  <AppIcon name="attach-outline" size={14} color={colors.textMuted} />
                  <Text style={[styles.attachmentName, { color: colors.textMuted }]} numberOfLines={1}>
                    {attachment.name}
                  </Text>
                  <AppIcon name="close-outline" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <Button title={creating ? 'Creating...' : 'Create ticket'} onPress={submitTicket} disabled={creating} />
          </View>
        </View>
      </Modal>

      <OptionPickerDialog
        visible={categoryOpen}
        title="Select category"
        options={[...SUPPORT_CATEGORIES]}
        selected={category}
        onClose={() => setCategoryOpen(false)}
        onSelect={(value) => setCategory(value as (typeof SUPPORT_CATEGORIES)[number])}
        searchEnabled
        searchPlaceholder="Search category..."
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 6,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  ticketTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  ticketSub: {
    fontSize: 13,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    marginTop: 80,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sheetHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  handle: {
    width: 46,
    height: 4,
    borderRadius: 99,
    opacity: 0.9,
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  attachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 2,
    marginBottom: 14,
  },
  attachButton: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachText: {
    fontSize: 12,
    fontWeight: '500',
  },
  attachmentPill: {
    maxWidth: '100%',
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachmentName: {
    maxWidth: 180,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default SupportTicketsScreen;
