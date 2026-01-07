import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AppIcon from '../components/AppIcon';
import Loading from '../components/Loading';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { SupportTicketDetails, SupportTicketMessage, supportAPI } from '../services/api';

type SupportChatScreenProps = {
  navigation: any;
  route: any;
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

const SupportChatScreen: React.FC<SupportChatScreenProps> = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const appMessage = useAppMessage();

  const formatMessageTimestamp = useCallback((date: Date) => {
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${time}, ${day}`;
  }, []);

  const ticketIdParam = route?.params?.ticketId;
  const ticketCodeParam = route?.params?.ticketCode;
  const initialSubject = route?.params?.subject;

  const ticketId = useMemo(() => (ticketIdParam != null ? Number(ticketIdParam) : NaN), [ticketIdParam]);
  const ticketCode = useMemo(() => (ticketCodeParam ? String(ticketCodeParam) : ''), [ticketCodeParam]);

  const [ticket, setTicket] = useState<SupportTicketDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [inputHeight, setInputHeight] = useState(52);
  const [expandedTimes, setExpandedTimes] = useState<Record<string, boolean>>({});

  const listRef = useRef<FlatList<SupportTicketMessage> | null>(null);

  const loadDetails = useCallback(async () => {
    try {
      const details = await supportAPI.getTicketDetails({
        id: Number.isFinite(ticketId) ? ticketId : undefined,
        code: !Number.isFinite(ticketId) ? ticketCode : undefined,
      });
      setTicket(details);
    } catch (e: any) {
      appMessage.toast({ status: 'failed', message: e?.message || 'Failed to load ticket.' });
      setTicket(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appMessage, ticketCode, ticketId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const myUserId = useMemo(() => {
    const v = user?.id != null ? Number(user.id) : NaN;
    return Number.isFinite(v) ? v : null;
  }, [user?.id]);

  const title = (ticket?.subject || initialSubject || 'Support Ticket').trim();

  const statusMeta = useMemo(() => {
    const map: Record<string, { label: string; tone: 'success' | 'warning' | 'muted' }> = {
      open: { label: 'Open', tone: 'success' },
      in_progress: { label: 'In progress', tone: 'warning' },
      closed: { label: 'Closed', tone: 'muted' },
    };
    return map;
  }, []);

  const statusStyle = useMemo(() => {
    const raw = (ticket?.status || '').toLowerCase();
    const meta = statusMeta[raw] || { label: ticket?.status || 'Unknown', tone: 'muted' };
    const bg =
      meta.tone === 'success'
        ? isDark
          ? 'rgba(34,197,94,0.18)'
          : 'rgba(34,197,94,0.12)'
        : meta.tone === 'warning'
          ? isDark
            ? 'rgba(245,158,11,0.18)'
            : 'rgba(245,158,11,0.12)'
          : isDark
            ? 'rgba(148,163,184,0.14)'
            : 'rgba(148,163,184,0.10)';
    const fg =
      meta.tone === 'success' ? colors.success : meta.tone === 'warning' ? colors.warning : colors.textMuted;
    return { label: meta.label, bg, fg };
  }, [colors.success, colors.textMuted, colors.warning, isDark, statusMeta, ticket?.status]);

  const messages = useMemo(() => (ticket?.messages || []).slice(), [ticket?.messages]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  };

  useEffect(() => {
    if (!loading) scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, loading]);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      appMessage.toast({ status: 'failed', message: 'Allow photo access to attach an image.' });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
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

  const openAttachment = async (value?: string | null) => {
    const url = (value || '').trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      appMessage.toast({ status: 'info', message: 'Attachment link is not available.' });
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      appMessage.toast({ status: 'failed', message: 'Failed to open attachment.' });
    }
  };

  const sendMessage = async () => {
    if (!ticket?.id) return;
    const clean = draft.trim();
    if (!clean) {
      appMessage.toast({ status: 'failed', message: 'Type a message first.' });
      return;
    }

    setSending(true);
    try {
      await supportAPI.replyToTicket({ ticketId: ticket.id, message: clean, attachment });
      setDraft('');
      setInputHeight(52);
      setAttachment(null);
      await loadDetails();
      scrollToBottom();
    } catch (e: any) {
      appMessage.toast({ status: 'failed', message: e?.message || 'Failed to send message.' });
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: SupportTicketMessage }) => {
    const fromMe = myUserId != null && item.user_id != null && Number(item.user_id) === myUserId;
    const role = (item.user_role || '').toLowerCase();
    const fromSupport = !fromMe && (role === 'admin' || /support/i.test(item.user_name || ''));
    const bubbleBg = fromMe ? colors.accent : colors.surface;
    const bubbleBorder = fromMe ? 'transparent' : colors.border;
    const textColor = fromMe ? colors.onAccent : colors.text;
    const subColor = fromMe ? (isDark ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.88)') : colors.textMuted;
    const label = (item.user_name || (fromSupport ? 'Support' : 'Support')).trim() || 'Support';
    const rawCreated = (item.created_at || '').trim();
    const createdAt = rawCreated ? new Date(rawCreated.replace(' ', 'T')) : null;
    const createdLabel =
      createdAt && !Number.isNaN(createdAt.getTime()) ? formatMessageTimestamp(createdAt) : '';
    const relative = createdAt && !Number.isNaN(createdAt.getTime())
      ? (() => {
          const diffMs = Date.now() - createdAt.getTime();
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
        })()
      : '';
    const messageId = String(item.id);
    const showTime = !!expandedTimes[messageId];

    return (
      <View style={[styles.msgRow, { justifyContent: fromMe ? 'flex-end' : 'flex-start' }]}>
        <View style={{ maxWidth: '86%' }}>
          <TouchableOpacity
            onPress={() =>
              setExpandedTimes((prev) => ({
                ...prev,
                [messageId]: !prev[messageId],
              }))
            }
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel="Toggle message timestamp"
          >
            <View style={[styles.bubble, { backgroundColor: bubbleBg, borderColor: bubbleBorder, maxWidth: '100%' }]}>
              {!fromMe ? (
                <View style={styles.supportHeader}>
                  <Text style={[styles.supportName, { color: colors.text }]} numberOfLines={1}>
                    {label}
                  </Text>
                  {relative ? (
                    <Text style={[styles.supportMeta, { color: colors.textMuted }]} numberOfLines={1}>
                      {' • '}{relative}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <Text style={[styles.msgText, { color: textColor }]}>{item.message}</Text>

              {item.attachment ? (
                <TouchableOpacity
                  onPress={() => openAttachment(item.attachment)}
                  style={[
                    styles.attachmentRow,
                    {
                      borderColor: fromMe ? 'rgba(255,255,255,0.45)' : colors.border,
                      backgroundColor: fromMe
                        ? isDark
                          ? 'rgba(0,0,0,0.12)'
                          : 'rgba(255,255,255,0.12)'
                        : colors.surfaceAlt,
                    },
                  ]}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Open attachment"
                >
                  <AppIcon name="attach-outline" size={14} color={fromMe ? colors.onAccent : colors.textMuted} />
                  <Text
                    style={[styles.attachmentLabel, { color: fromMe ? colors.onAccent : colors.textMuted }]}
                    numberOfLines={1}
                  >
                    Attachment
                  </Text>
                  <AppIcon name="open-outline" size={14} color={fromMe ? colors.onAccent : colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </TouchableOpacity>

          {showTime && createdLabel ? (
            <Text
              style={[
                styles.timeBelow,
                { color: colors.textMuted, textAlign: fromMe ? 'right' : 'left' },
              ]}
              numberOfLines={1}
            >
              {createdLabel}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  if (loading) return <Loading message="Loading conversation..." />;

  const isTyping = draft.trim().length > 0;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
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
            {title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <View style={[styles.statusPill, { backgroundColor: statusStyle.bg, borderColor: colors.border }]}>
              <Text style={[styles.statusText, { color: statusStyle.fg }]} numberOfLines={1}>
                {statusStyle.label}
              </Text>
            </View>
            <Text style={[styles.codeText, { color: colors.textMuted }]} numberOfLines={1}>
              #{ticket?.code || ticketCode}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            setRefreshing(true);
            loadDetails();
          }}
          style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Refresh"
        >
          <AppIcon name="refresh-outline" size={20} color={colors.secondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={(r) => {
            listRef.current = r;
          }}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessage}
          contentContainerStyle={[styles.listContent, { paddingBottom: 12 }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          keyboardShouldPersistTaps="handled"
        />

        <View style={[styles.composer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
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

          <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Message..."
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, height: inputHeight }]}
              multiline
              editable={!sending}
              textAlignVertical="top"
              onContentSizeChange={(e) => {
                const next = Math.max(52, Math.min(140, Math.ceil(e.nativeEvent.contentSize.height)));
                setInputHeight(next);
              }}
            />

            {isTyping ? (
              <TouchableOpacity
                onPress={sendMessage}
                style={[
                  styles.sendInline,
                  {
                    backgroundColor: sending ? colors.surfaceAlt : colors.accent,
                    borderColor: colors.border,
                  },
                ]}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Send message"
                disabled={sending}
              >
                <AppIcon name="arrow-up" size={18} color={sending ? colors.textMuted : colors.onAccent} />
              </TouchableOpacity>
            ) : (
              <View style={styles.actionsInline}>
                <TouchableOpacity
                  onPress={pickFile}
                  style={[styles.plusButton, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Attach file"
                >
                  <AppIcon name="add" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={{ height: 10 + insets.bottom }} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1 },
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
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  bubble: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  supportName: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
    maxWidth: '70%',
  },
  supportMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  msgText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  timeBelow: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '500',
  },
  attachmentRow: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachmentLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  composer: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
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
    marginBottom: 10,
  },
  attachmentName: {
    maxWidth: 180,
    fontSize: 12,
    fontWeight: '700',
  },
  inputWrap: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    paddingStart: 14,
    paddingEnd: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 0,
    fontSize: 13,
    fontWeight: '600',
  },
  actionsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 6,
  },
  plusButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendInline: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
});

export default SupportChatScreen;
