import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as DocumentPicker from 'expo-document-picker';
import { TextInput as PaperTextInput } from 'react-native-paper';
import AppIcon from '../components/AppIcon';
import Button from '../components/Button';
import Input from '../components/Input';
import OptionPickerDialog from '../components/OptionPickerDialog';
import EmptyState from '../components/EmptyState';
import { IconButton } from '../components/ui';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useTheme } from '../contexts/ThemeContext';
import { SupportTicketListItem, supportAPI } from '../services/api';

type SupportTicketsScreenProps = {
  navigation: any;
};

const SKELETON_ROWS = Array.from({ length: 10 }, (_, i) => i);

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
  const highlightColor = isDark ? colors.accentMuted : colors.secondary;

  const [tickets, setTickets] = useState<SupportTicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const shimmer = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    if (!loading) return;
    shimmer.setValue(0);
    const anim = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 900,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => {
      anim.stop();
    };
  }, [loading, shimmer]);

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
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['image/*'],
    });
    if (res.canceled) return;
    const uri = res.assets?.[0]?.uri;
    if (!uri) return;
    const name = (res.assets?.[0]?.name || `attachment-${Date.now()}.jpg`).trim();
    const type = toMimeType(uri, res.assets?.[0]?.mimeType);
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

  const statusStyle = (status?: string) => {
    switch ((status || '').toLowerCase()) {
      case 'open':
        return { label: 'Open', fg: colors.accent, bg: colors.accentSoft };
      case 'in_progress':
        return { label: 'In progress', fg: colors.info, bg: colors.infoSoft };
      case 'resolved':
        return { label: 'Resolved', fg: colors.success, bg: colors.successSoft };
      case 'closed':
        return { label: 'Closed', fg: colors.textMuted, bg: colors.surfaceAlt };
      default:
        return null;
    }
  };

  const renderItem = ({ item, index }: { item: SupportTicketListItem; index: number }) => {
    const title = (item.subject || item.latest_message || 'Support').trim();
    const relative = formatRelative(item.updated_at || item.created_at);
    const sub = [item.latest_message?.trim(), relative].filter(Boolean).join(' · ') || item.category || 'Support';
    const st = statusStyle(item.status);
    const first = index === 0;
    const last = index === tickets.length - 1;
    return (
      <Pressable
        onPress={() => openTicket(item)}
        style={({ pressed }) => [
          styles.ticketRow,
          {
            backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
            borderColor: colors.border,
            borderTopWidth: first ? 1 : 0,
            borderTopLeftRadius: first ? 24 : 0,
            borderTopRightRadius: first ? 24 : 0,
            borderBottomWidth: last ? 3 : StyleSheet.hairlineWidth,
            borderBottomColor: last ? colors.cardLip : colors.border,
            borderBottomLeftRadius: last ? 24 : 0,
            borderBottomRightRadius: last ? 24 : 0,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Open ticket ${item.code}`}
      >
        <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
          <AppIcon name="chatbubble-ellipses-outline" size={18} color={colors.accent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.ticketTitle, { color: colors.text, flexShrink: 1 }]} numberOfLines={1}>
              {title}
            </Text>
            {st ? (
              <View style={[styles.badge, { backgroundColor: st.bg }]}>
                <Text style={[styles.badgeText, { color: st.fg }]}>{st.label}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.ticketSub, { color: colors.textMuted }]} numberOfLines={1}>
            {sub}
          </Text>
        </View>
        <AppIcon name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>
    );
  };

  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  const renderSkeleton = () => (
    <View style={{ paddingTop: 6 }} accessibilityLabel="Loading tickets">
      {SKELETON_ROWS.map((idx) => (
        <View key={idx} style={[styles.ticketRow, { borderBottomColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Animated.View style={[styles.skeletonDot, { backgroundColor: colors.surface, opacity: shimmerOpacity }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Animated.View
              style={[styles.skeletonLine, { backgroundColor: colors.surfaceAlt, opacity: shimmerOpacity, width: '78%' }]}
            />
            <View style={{ height: 8 }} />
            <Animated.View
              style={[styles.skeletonLine, { backgroundColor: colors.surfaceAlt, opacity: shimmerOpacity, width: '52%' }]}
            />
          </View>
          <View style={{ width: 18, height: 18 }} />
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Go back" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            Support
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>We reply by email and here</Text>
        </View>
      </View>

      <FlatList
        data={tickets}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: 90 + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            renderSkeleton()
          ) : (
            <View style={styles.empty}>
              <EmptyState
                icon="chatbubbles-outline"
                title="No tickets yet"
                subtitle="Something not right with a payment, material or your account? Open a ticket and we'll help."
                actionLabel="New ticket"
                onAction={() => {
                  resetComposer();
                  setComposeVisible(true);
                }}
              />
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
            borderBottomColor: colors.accentLip,
            bottom: 18 + insets.bottom,
          },
        ]}
        activeOpacity={0.86}
        accessibilityRole="button"
        accessibilityLabel="Create new ticket"
      >
        <AppIcon name="add" size={20} color={colors.onAccent} />
        <Text style={{ color: colors.onAccent, fontWeight: '700', fontSize: 15 }}>New ticket</Text>
      </TouchableOpacity>

      <Modal visible={composeVisible} transparent animationType="slide" onRequestClose={() => setComposeVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setComposeVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Close new ticket"
          >
            <BlurView intensity={28} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
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
        </KeyboardAvoidingView>
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
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 6,
    paddingHorizontal: 16,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontWeight: '700',
  },
  ticketSub: {
    fontSize: 12,
    marginTop: 2,
  },
  skeletonDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
    borderBottomWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
